# -*- coding: utf-8 -*-
"""
geo_check.py — GEO rules engine (검사/보정) · LLM 없음 · 결정적
================================================================
`ai가 좋아하는 글.md` 는 **본문에 넣는 문서가 아니라**, 생성된 글을 검사/보정하는 규칙 엔진이다.
이 모듈은 (synth, frontmatter, pageType) 를 정적 분석해 §16 의 검사 항목을 점수화한다.

점수 게이트(§16): ≥GEO_READY_MIN → ready / ≥GEO_MINOR_MIN → needs minor edits / 미만 → rewrite.
<READY 면 자동 발행을 막아야 한다(호출부 가드).

자동보정(autofix): 슬러그 연도 제거(F-4) · 본문 기법용어(no_geo_jargon) 제거 · (placeholder URL 은
synthesis.sanitize_urls 가 이미 처리). 나머지는 경고만(사람이 보고 고침).

사용자 본문에는 GEO 기술 용어가 절대 노출되면 안 된다 → no_geo_jargon 으로 강제.
"""

from __future__ import annotations

import re

import config
import dedupe
import seo as seo_mod
from synthesis import AI_TELLS, _RISKY

# ── 본문 금지(기법 용어) blocklist — 정확한 명칭 위주(일반 단어 제외 → false positive 방지) ──
_JARGON = [
    "direct answer matching", "answer-block prefabrication", "answer block prefabrication",
    "chunk boundary engineering", "chunk boundary", "citation pack", "citation safety",
    "macro heading hierarchy", "retrieval anchor", "query fan-out", "query fanout",
    "semantic vacuum", "consensus mesh", "evidence ladder", "citation friction",
    "freshness signals", "authority signals", "attribute table",
    "generative engine optimization", "geo optimization", "geo rules engine",
    "e-e-a-t", "answer block prefab",
]
_JARGON_RE = re.compile("|".join(re.escape(j) for j in _JARGON), re.I)

_HYPE = ["best ever", "world-class", "world class", "must-visit", "must visit", "the best",
         "unbeatable", "perfect", "ultimate", "amazing", "incredible", "stunning",
         "breathtaking", "top-notch", "hidden gem", "bucket list"]
_HEDGE_RE = re.compile(r"\b(about|approx|approximately|around|roughly|usually|typically|"
                       r"depending|varies|up to|from)\b|~", re.I)
_THROAT = re.compile(r"^\s*(in this (article|guide|post)|let'?s|welcome|"
                     r"when it comes to|this (article|guide|post)|are you )", re.I)
_PRONOUN_START = re.compile(r"^\s*(this|it|they|these|those|there)\b", re.I)
_QWORD = re.compile(r"^\s*(how|what|where|which|why|when|who|is|are|can|should|do|does|will)\b", re.I)
# 장식용(필러) 헤딩 — 질문도 아니고 주제 섹션도 아닌 것(이런 것만 감점)
_DECOR_H2 = {"introduction", "intro", "overview", "conclusion", "summary", "in summary",
             "background", "about", "getting started", "final thoughts", "wrap up", "wrap-up"}
_TABLE_SEP = re.compile(r"^\s*\|?[\s:|-]*-{3,}[\s:|-]*\|", re.M)
_YEAR_STAMP = re.compile(r"\bas of\s+(?:\w+\s+)?(?:19|20)\d{2}\b", re.I)


# ── markdown 파서(가벼움) ─────────────────────────────────────────────
def _h2s(md: str) -> list:
    return [l[3:].strip() for l in (md or "").splitlines() if l.startswith("## ")]


def _paragraphs(md: str) -> list:
    """본문 블록 중 '문단'(표/리스트/헤딩/인용 아님)만."""
    blocks, cur = [], []
    for line in (md or "").splitlines():
        if not line.strip():
            if cur:
                blocks.append("\n".join(cur))
                cur = []
            continue
        cur.append(line)
    if cur:
        blocks.append("\n".join(cur))
    paras = []
    for b in blocks:
        first = b.lstrip()[:1]
        if first and first not in "#|->*+0123456789":
            paras.append(b.strip())
    return paras


def _has_table(md: str) -> bool:
    return bool(_TABLE_SEP.search(md or ""))


def _sentences(text: str) -> list:
    return [s for s in re.split(r"(?<=[.!?])\s+", (text or "").strip()) if s.strip()]


def _section_first_paras(md: str) -> list:
    """각 H2 바로 아래 첫 콘텐츠 줄이 '문단'(즉답)인지 목록."""
    lines = (md or "").splitlines()
    res = []
    i = 0
    while i < len(lines):
        if lines[i].startswith("## "):
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                first = lines[j].lstrip()[:1]
                res.append(bool(first and first not in "#|->*+0123456789"))
            else:
                res.append(False)
        i += 1
    return res


# ── 검사 1건 결과 ─────────────────────────────────────────────────────
def _r(cid, label, status, weight, detail="", autofixed=False, na=False):
    return {"id": cid, "label": label, "status": status, "weight": weight,
            "detail": detail, "autofixed": autofixed, "na": na}


def run_checks(synth: dict, frontmatter: dict | None = None, page_type: str = "practical",
               duplicate_risk: list | None = None, cfg=None) -> dict:
    """정적 GEO 검사 → {score, gate, perCheck[], corrected{}}.
    corrected = 자동보정으로 바뀐 필드(slug/markdown 등) — 호출부가 발행 전 적용."""
    cfg = cfg or config
    synth = synth or {}
    fm = frontmatter or {}
    pt = (page_type or "practical").strip().lower()

    md = synth.get("markdown") or ""
    cp = synth.get("citation_pack") or {}
    title = (synth.get("title") or fm.get("title") or "").strip()
    question = (fm.get("question") or "").strip()
    answer = (cp.get("answer") or "").strip()
    key_facts = cp.get("key_facts") or fm.get("citationPack", {}).get("keyFacts") or []
    at_glance = synth.get("at_a_glance") or fm.get("atAGlance") or []
    faq = synth.get("faq") or fm.get("faq") or []
    sources = synth.get("sources") or fm.get("sources") or []
    related = fm.get("relatedGuides") or synth.get("relatedGuides") or []
    h2s = _h2s(md)
    paras = _paragraphs(md)
    body_blob = " ".join([md, answer, cp.get("quotable", ""), " ".join(str(x) for x in key_facts)])

    checks = []
    corrected = {}

    # 1. H1 = 질문 일치
    if question and title:
        sc = dedupe.jaccard(dedupe.normalize(title), dedupe.normalize(question))
        st = "pass" if sc >= 0.4 else ("warn" if sc >= 0.2 else "fail")
        checks.append(_r("h1_matches_question", "H1이 질문과 일치", st, 6, f"유사도 {sc:.2f}"))
    else:
        checks.append(_r("h1_matches_question", "H1이 질문과 일치", "warn", 6, "질문/제목 없음"))

    # 2. 첫 문단 즉답(throat-clearing 없음)
    first_blob = answer or (paras[0] if paras else "")
    if not first_blob:
        checks.append(_r("answer_first", "첫 문단이 바로 답함", "fail", 8, "답변 첫 문단 없음"))
    elif _THROAT.search(first_blob):
        checks.append(_r("answer_first", "첫 문단이 바로 답함", "fail", 8, "서론('In this article' 등)으로 시작"))
    else:
        checks.append(_r("answer_first", "첫 문단이 바로 답함", "pass", 8))

    # 3. At a glance
    checks.append(_r("at_a_glance_present", "At a glance 있음",
                     "pass" if at_glance else "warn", 6, "" if at_glance else "at_a_glance 없음"))

    # 4. 가격/시간/핵심 숫자
    has_num = bool(re.search(r"(₩|\$|\d+\s?%|\b\d{1,3}(,\d{3})+\b|\b\d+\s?(min|minute|hour|hr|km|won|krw)\b|\b\d{4,}\b)", body_blob, re.I))
    if pt in ("route", "price", "comparison"):
        checks.append(_r("key_numbers_present", "핵심 숫자(가격/시간)", "pass" if has_num else "fail", 6,
                         "" if has_num else "숫자형 핵심값 없음"))
    else:
        checks.append(_r("key_numbers_present", "핵심 숫자(가격/시간)", "pass" if has_num else "warn", 6))

    # 5. Key facts
    has_keyfacts = bool(key_facts) or ("key facts" in md.lower()) or bool(at_glance)
    checks.append(_r("key_facts_present", "Key facts 있음", "pass" if has_keyfacts else "warn", 5))

    # 6. 비교표(해당 pageType)
    if pt in ("route", "comparison"):
        checks.append(_r("comparison_table_present", "비교표 있음", "pass" if _has_table(md) else "fail", 6,
                         "" if _has_table(md) else "옵션 비교표 없음"))
    else:
        checks.append(_r("comparison_table_present", "비교표(해당 시)", "pass", 6, "해당 없음", na=True))

    # 7. H2가 질문형/주제형(장식 헤딩만 감점 — §14 노운 섹션[Key facts 등]은 DD 가 허용)
    if h2s:
        qlike = sum(1 for h in h2s if h.endswith("?") or _QWORD.match(h))
        good = sum(1 for h in h2s if h.strip().lower().rstrip(":") not in _DECOR_H2)
        frac = good / len(h2s)
        st = "pass" if frac >= 0.6 else ("warn" if frac >= 0.3 else "fail")
        checks.append(_r("h2_are_questions", "H2가 질문형/주제형(장식 아님)", st, 6,
                         f"{qlike}/{len(h2s)} 질문형 · {good}/{len(h2s)} 유효"))
    else:
        checks.append(_r("h2_are_questions", "H2가 질문형/주제형", "warn", 6, "H2 없음"))

    # 8. H2 첫 문단 즉답
    sfp = _section_first_paras(md)
    if sfp:
        frac = sum(1 for x in sfp if x) / len(sfp)
        st = "pass" if frac >= 0.6 else ("warn" if frac >= 0.3 else "fail")
        checks.append(_r("h2_first_para_answers", "H2 아래 첫 문단 즉답", st, 6,
                         f"{sum(1 for x in sfp if x)}/{len(sfp)} 섹션"))
    else:
        checks.append(_r("h2_first_para_answers", "H2 아래 첫 문단 즉답", "warn", 6, "섹션 없음"))

    # 9. 자기완결 청크(벽글 아님)
    walls = [p for p in paras if len(p) > 700]
    checks.append(_r("self_contained_chunk", "문단 자기완결(벽글 아님)",
                     "pass" if not walls else "warn", 5,
                     "" if not walls else f"긴 문단 {len(walls)}개"))

    # 10. 대명사 시작 금지
    pron = [p for p in paras if _PRONOUN_START.match(p)]
    st = "pass" if not pron else ("warn" if len(pron) <= 2 else "fail")
    checks.append(_r("no_pronoun_start", "대명사로 시작하는 문단 없음", st, 6,
                     "" if not pron else f"This/It/They 시작 {len(pron)}개"))

    # 11. 과장 표현 없음
    hype = [h for h in (AI_TELLS + _HYPE) if h.lower() in body_blob.lower()]
    checks.append(_r("no_hype", "과장/AI 상투어 없음", "pass" if not hype else "warn", 5,
                     "" if not hype else "발견: " + ", ".join(hype[:4])))

    # 12. 인용 안전(가격/날짜에 헤지)
    risky = bool(_RISKY.search(body_blob))
    if risky and not _HEDGE_RE.search(body_blob):
        checks.append(_r("citation_safe_wording", "인용 안전(about/usually 헤지)", "warn", 6,
                         "단정적 가격/날짜에 안전 표현 없음"))
    else:
        checks.append(_r("citation_safe_wording", "인용 안전(about/usually 헤지)", "pass", 6))

    # 13. 출처 보임
    checks.append(_r("sources_visible_in_body", "출처가 보임", "pass" if sources else "warn", 5,
                     "" if sources else "sources 없음"))

    # 14. Last updated
    has_updated = bool(fm.get("dateModified") or fm.get("lastUpdatedLabel") or synth.get("last_updated"))
    checks.append(_r("last_updated_visible", "Last updated 있음", "pass" if has_updated else "warn", 4))

    # 15. 관련글 4~8
    nrel = len([r for r in related if str(r).strip()])
    st = "pass" if 4 <= nrel <= 8 else ("warn" if 1 <= nrel < 4 else "fail")
    checks.append(_r("related_guides_count", "관련글 4~8개", st, 6, f"{nrel}개"))

    # 16. schema = 화면 FAQ 일치(같은 출처 → 구조 보장). FAQ 존재/형식 점검
    faq_ok = bool(faq) and all(isinstance(f, dict) and f.get("q") and f.get("a") for f in faq)
    checks.append(_r("schema_faq_parity", "schema와 화면 FAQ 일치", "pass" if faq_ok else "warn", 5,
                     "" if faq_ok else "FAQ 없음/불완전"))

    # 17. 중복 가능성 표시
    dr = duplicate_risk if duplicate_risk is not None else (fm.get("duplicateRisk") or synth.get("duplicateRisk") or [])
    real_dups = [d for d in dr if (d or {}).get("is_dup")]
    checks.append(_r("duplicate_flag", "중복 가능성 표시", "warn" if real_dups else "pass", 3,
                     ("중복 의심 " + str(len(real_dups)) + "건") if real_dups else ""))

    # 18. 본문에 GEO 기법 용어 없음(FIX1) — 발견 시 fail + 자동 제거
    jargon_hits = sorted(set(m.group(0) for m in _JARGON_RE.finditer(body_blob)))
    if jargon_hits:
        new_md = _JARGON_RE.sub("", md)
        new_md = re.sub(r"[ \t]{2,}", " ", new_md)
        corrected["markdown"] = new_md.strip()
        checks.append(_r("no_geo_jargon", "본문에 GEO 기법 용어 없음", "fail", 5,
                         "제거됨: " + ", ".join(jargon_hits[:5]), autofixed=True))
    else:
        checks.append(_r("no_geo_jargon", "본문에 GEO 기법 용어 없음", "pass", 5))

    # 19. 택소노미 연결(FIX2) — bigCategory+cluster+questionType 있어야
    linked = bool((fm.get("bigCategory") or "").strip() and (fm.get("cluster") or "").strip()
                  and (fm.get("questionType") or "").strip())
    checks.append(_r("taxonomy_linked", "카테고리/클러스터 연결됨", "pass" if linked else "fail", 5,
                     "" if linked else "bigCategory/cluster/questionType 비어있음(발행 차단)"))

    # 자동보정: 슬러그 연도 제거(F-4)
    slug = fm.get("slug") or ""
    if slug:
        fixed = seo_mod.slugify_no_year(slug)
        if fixed and fixed != slug:
            corrected["slug"] = fixed
    if _YEAR_STAMP.search(md):
        # 본문 날짜 스탬프는 경고만(파괴적 수정 회피) — freshness 점검에 반영
        for c in checks:
            if c["id"] == "last_updated_visible":
                c["detail"] = (c["detail"] + " · 본문 'as of 연도' 스탬프 발견(제거 권장)").strip(" ·")

    # 점수/게이트
    total = sum(c["weight"] for c in checks if not c["na"])
    got = sum(c["weight"] * (1.0 if c["status"] == "pass" else 0.5 if c["status"] == "warn" else 0.0)
              for c in checks if not c["na"])
    score = round(got / total * 100) if total else 100
    ready = int(getattr(cfg, "GEO_READY_MIN", 90))
    minor = int(getattr(cfg, "GEO_MINOR_MIN", 75))
    gate = "ready" if score >= ready else ("minor" if score >= minor else "rewrite")

    return {"score": score, "gate": gate, "perCheck": checks, "corrected": corrected}


GATE_LABEL = {"ready": "발행 가능", "minor": "약간 수정 필요", "rewrite": "재작성 필요"}
GATE_BADGE = {"ready": "🟢", "minor": "🟡", "rewrite": "🔴"}
