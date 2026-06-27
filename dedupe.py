# -*- coding: utf-8 -*-
"""
dedupe.py — 중복 질문 감지 (§19) · 하이브리드(키워드 우선 + 경계만 싼 LLM)
==========================================================================
새 질문이 기존 페이지/기획 큐와 의미가 비슷하면 경고 → 4선택:
  (1) 기존 글 FAQ로 추가   (2) 기존 pillar 의 supporting 으로 링크
  (3) 새 supporting 페이지   (4) 별도 글로 생성
무조건 새 글을 만들면 사이트 품질이 떨어진다(얇은 중복글). 의도 단위로 묶는다.

설계: 임베딩/벡터스토어는 현 규모에 과함 → 보류.
  Tier1(무료): 정규화 토큰셋 Jaccard + 핵심 엔티티 겹침(가벼운 alias 포함).
  Tier2(싼 LLM, 선택): 경계(0.40~0.55)일 때만 gpt-4o-mini yes/no 1콜.
절대 raise 안 함.
"""

from __future__ import annotations

import json
import re

import config

try:
    import usage
except Exception:  # noqa: BLE001
    usage = None  # type: ignore

# 임계값
NEAR_DUP = 0.55          # ≥ → 강한 중복(키워드만으로 확정)
BORDERLINE_LO = 0.40     # 0.40~0.55 → 경계 → (가능하면) 싼 LLM 1콜로 판정

_STOP = {
    "the", "a", "an", "to", "from", "of", "in", "on", "at", "for", "is", "are", "am",
    "do", "does", "did", "i", "you", "my", "me", "your", "it", "this", "that", "these",
    "those", "and", "or", "with", "as", "be", "been", "by", "if", "so", "about", "into",
    "what", "how", "where", "when", "which", "who", "whom", "can", "could", "should",
    "would", "will", "shall", "may", "might", "there", "here", "out", "up", "down",
}
# 동의어/약어 정규화 — 한 토큰으로 합침(엔티티 매칭 재현율↑, 무료)
_ALIAS = {
    "icn": "incheon", "gmp": "gimpo", "airports": "airport",
    "tmoney": "tmoney", "t-money": "tmoney", "wowpass": "wowpass",
    "subways": "subway", "trains": "train", "buses": "bus", "taxis": "taxi",
    "cheap": "cheapest", "fast": "fastest", "prices": "price", "costs": "cost",
    "fares": "fare", "hotels": "hotel",
}
_WORD = re.compile(r"[a-z0-9]+")


def _stem(t: str) -> str:
    t = _ALIAS.get(t, t)
    for suf in ("ies", "es", "s"):  # 아주 가벼운 복수 처리
        if len(t) > 4 and t.endswith(suf):
            return t[: -len(suf)]
    return t


def normalize(question: str) -> set:
    """질문 → 의미 토큰 집합(소문자·불용어 제거·alias·경량 stem)."""
    toks = _WORD.findall((question or "").lower())
    out = set()
    for t in toks:
        t = _ALIAS.get(t, t)
        if t in _STOP or len(t) <= 1:
            continue
        out.add(_stem(t))
    return out


def jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _llm_same(q1: str, q2: str, client, cfg) -> bool | None:
    """경계 케이스만: 두 질문이 사실상 같은 답을 원하는지 yes/no(싼 모델). 실패→None."""
    if client is None:
        return None
    try:
        sysp = ('Two short user questions about traveling in Korea. Answer STRICT JSON '
                '{"same_intent": true|false}: true ONLY if a single page answering one would '
                'fully satisfy the other (same information need, paraphrase/abbreviation ok).')
        payload = json.dumps({"q1": q1, "q2": q2}, ensure_ascii=False)
        resp = client.chat.completions.create(
            model=getattr(cfg, "DEDUPE_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": sysp},
                      {"role": "user", "content": payload}],
            response_format={"type": "json_object"}, temperature=0.0, max_tokens=20)
        data = json.loads(resp.choices[0].message.content or "{}")
        if usage:
            usage.bump_usage(1)
        return bool(data.get("same_intent"))
    except Exception:  # noqa: BLE001
        return None


def find_near_dupes(question: str, candidates: list, *, client=None, cfg=None, limit: int = 3) -> list:
    """question vs 기존 후보들 → 중복 의심 목록(점수 내림차순, 상위 limit).
    candidates = [{"slug","question","title"?,"questionType"?}]. 반환 [{slug, question, score, why,
    llm_confirmed}]. client 주면 경계 케이스만 싼 LLM 으로 추가 확인."""
    cfg = cfg or config
    qn = normalize(question)
    if not qn:
        return []
    self_q = " ".join((question or "").strip().lower().split())
    hits = []
    for c in (candidates or []):
        cq = c.get("question") or c.get("title") or ""
        if not cq or " ".join(cq.strip().lower().split()) == self_q:
            continue  # 자기 자신 제외
        score = jaccard(qn, normalize(cq))
        if score < BORDERLINE_LO:
            continue
        llm_confirmed = None
        if BORDERLINE_LO <= score < NEAR_DUP and client is not None:
            llm_confirmed = _llm_same(question, cq, client, cfg)
            if llm_confirmed is False:
                continue  # LLM이 다르다고 하면 버림
        is_dup = score >= NEAR_DUP or llm_confirmed is True
        if not is_dup:
            # 경계인데 LLM 없음 → 약한 의심으로 표시(사용자 판단)
            why = f"표현이 다소 비슷함 ({score:.2f}) — 확인 권장"
        else:
            why = (f"의미가 거의 같음 ({score:.2f})" if llm_confirmed is None
                   else f"같은 의도로 판정됨 ({score:.2f}, AI 확인)")
        hits.append({
            "slug": c.get("slug", ""),
            "question": cq,
            "questionType": c.get("questionType", ""),
            "score": round(score, 3),
            "why": why,
            "is_dup": bool(is_dup),
            "llm_confirmed": llm_confirmed,
        })
    hits.sort(key=lambda h: h["score"], reverse=True)
    return hits[:limit]
