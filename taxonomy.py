# -*- coding: utf-8 -*-
"""
taxonomy.py — Daebak 콘텐츠 택소노미 로더/헬퍼 (LLM 없음 · 순수 I/O)
====================================================================
`Daebak Q&A Expansion Map` = 구조 데이터. 이 트리(bigCategory → cluster → pillar/supporting/FAQ)는
**수동 편집 영구 파일** `site/content/taxonomy.json` 에 있고, 파이썬 파이프라인과 Next.js 사이트가
같은 파일을 읽는다(슬러그 영구 고정 → 허브 URL `/<category>`, `/<category>/<cluster>` 안정).

핵심 역할:
  · flat_clusters()  — 분류 프롬프트에 줄 '허용 클러스터 목록'(closed-list → LLM이 클러스터를 새로 못 만듦)
  · resolve()        — LLM이 돌려준 (big, cluster) 라벨을 정식 레코드로 매칭(미매칭 → None = 수동 처리)
  · is_sensitive()   — 비자/의료/법률/안전 등 → publishMode=review 강제(LLM 신뢰 X, 파이썬이 결정)

절대 raise 안 함(storage 가 보장). 카운트(published/draft/...)는 여기 저장 안 함 — 실시간 계산.
"""

from __future__ import annotations

import os
import re

import config
import storage


def taxonomy_path() -> str:
    """site/content/taxonomy.json 의 절대경로(사이트 빌드와 동일 파일)."""
    rel = os.path.join(getattr(config, "SITE_DIR", "site"),
                       getattr(config, "SITE_TAXONOMY_REL", "content/taxonomy.json"))
    return storage.abspath(rel)


def load() -> dict:
    data = storage.safe_load_json(taxonomy_path(), {}) or {}
    if not isinstance(data, dict):
        return {}
    data.setdefault("bigCategories", [])
    data.setdefault("clusters", [])
    data.setdefault("sensitiveTopics", [])
    return data


def save(data: dict):
    return storage.safe_save_json(taxonomy_path(), data)


# ── 조회 ──────────────────────────────────────────────────────────────
def big_categories(data: dict | None = None) -> list:
    return (data or load()).get("bigCategories", []) or []


def clusters(data: dict | None = None) -> list:
    return (data or load()).get("clusters", []) or []


def _eqkey(s: str) -> str:
    return (s or "").strip().lower()


def _qkey(s: str) -> str:
    """영숫자만 남긴 정규화 키 — 구두점/대시/&-and 차이를 흡수(매칭 견고)."""
    return re.sub(r"[^a-z0-9]+", " ", (s or "").replace("&", " and ").lower()).strip()


def category(cat: str, data: dict | None = None) -> dict | None:
    """id / slug / title (대소문자 무시) 로 bigCategory 찾기."""
    k = _eqkey(cat)
    if not k:
        return None
    for c in big_categories(data):
        if k in (_eqkey(c.get("id")), _eqkey(c.get("slug")), _eqkey(c.get("title"))):
            return c
    return None


def cluster(cl: str, data: dict | None = None) -> dict | None:
    """id / slug / title (대소문자·구두점·&/and 무시) 로 cluster 찾기."""
    k = _eqkey(cl)
    if not k:
        return None
    kk = _qkey(cl)
    for c in clusters(data):
        if k in (_eqkey(c.get("id")), _eqkey(c.get("slug")), _eqkey(c.get("title"))):
            return c
        if kk and kk == _qkey(c.get("title")):
            return c
    return None


def find_question(question: str, data: dict | None = None):
    """질문 텍스트가 택소노미의 어떤 pillar/supporting 인지 직접 조회(LLM 불필요·구두점 무시).
    반환 (cluster_record, slug, questionType) 또는 None. 알려진 질문은 LLM 분류와 무관하게 정확 매칭."""
    data = data or load()
    qk = _qkey(question)
    if not qk:
        return None
    for c in clusters(data):
        for entry in (c.get("pillarQuestions") or []):
            nq = _norm_q(entry)
            if _qkey(nq.get("question")) == qk:
                return (c, nq.get("slug", ""), "pillar")
        for entry in (c.get("supportingQuestions") or []):
            nq = _norm_q(entry)
            if _qkey(nq.get("question")) == qk:
                return (c, nq.get("slug", ""), "supporting")
    return None


def clusters_of(cat: str, data: dict | None = None) -> list:
    """한 bigCategory 의 cluster 레코드 목록(택소노미 순서대로)."""
    data = data or load()
    bc = category(cat, data)
    if not bc:
        return []
    ids = [_eqkey(x) for x in (bc.get("clusters") or [])]
    out = []
    for cid in (bc.get("clusters") or []):
        rec = cluster(cid, data)
        if rec:
            out.append(rec)
    return out


# ── 분류용 평면 목록 + 정규화 ─────────────────────────────────────────
def _norm_q(entry) -> dict:
    """pillar/supporting 항목을 {question, slug} 로 정규화(문자열 슬러그도 허용)."""
    if isinstance(entry, dict):
        return {"question": (entry.get("question") or "").strip(),
                "slug": (entry.get("slug") or "").strip()}
    s = str(entry or "").strip()
    return {"question": "", "slug": s}


def pillar_of(cl: str, data: dict | None = None) -> dict | None:
    rec = cluster(cl, data)
    if not rec:
        return None
    ps = [_norm_q(x) for x in (rec.get("pillarQuestions") or [])]
    return ps[0] if ps else None


def supporting_of(cl: str, data: dict | None = None) -> list:
    rec = cluster(cl, data)
    if not rec:
        return []
    return [_norm_q(x) for x in (rec.get("supportingQuestions") or [])]


def flat_clusters(data: dict | None = None) -> list:
    """분류 프롬프트/재조정용 평면 목록. 각 항목:
    {bigCategory(title), bigCategoryId, bigCategorySlug, cluster(title), clusterId, clusterSlug,
     pillarQuestion, pillarSlug, status}."""
    data = data or load()
    out = []
    for bc in big_categories(data):
        for cl in clusters_of(bc.get("id", ""), data):
            p = pillar_of(cl.get("id", ""), data) or {"question": "", "slug": ""}
            out.append({
                "bigCategory": bc.get("title", ""),
                "bigCategoryId": bc.get("id", ""),
                "bigCategorySlug": bc.get("slug", ""),
                "cluster": cl.get("title", ""),
                "clusterId": cl.get("id", ""),
                "clusterSlug": cl.get("slug", ""),
                "pillarQuestion": p.get("question", ""),
                "pillarSlug": p.get("slug", ""),
                "status": cl.get("status", ""),
            })
    return out


def resolve(big: str, cl: str, data: dict | None = None) -> dict | None:
    """LLM 출력 (big, cluster) → 정식 cluster 레코드. cluster 매칭 우선(big 은 보조 확인).
    미매칭 → None(=수동 처리 필요 플래그). LLM 은 절대 새 클러스터를 만들 수 없다."""
    data = data or load()
    rec = cluster(cl, data)
    if not rec:
        return None
    # big 이 주어졌고 어긋나면(타 카테고리), 그래도 cluster 가 진실원이므로 레코드 반환(경고는 호출부에서).
    return rec


# ── 민감 주제(=review 강제) ───────────────────────────────────────────
def sensitive_topics(data: dict | None = None) -> list:
    return [_eqkey(t) for t in ((data or load()).get("sensitiveTopics") or []) if str(t).strip()]


def is_sensitive(question: str, cluster_record: dict | None = None, data: dict | None = None) -> bool:
    """질문/클러스터가 민감(비자·의료·법률·안전·공식요금 등)하면 True → publishMode=review."""
    data = data or load()
    if cluster_record and bool(cluster_record.get("sensitive")):
        return True
    blob = _eqkey(question)
    if cluster_record:
        blob += " " + _eqkey(cluster_record.get("title")) + " " + _eqkey(cluster_record.get("description"))
    return any(t in blob for t in sensitive_topics(data))


def default_publish_mode(question: str, cluster_record: dict | None = None, data: dict | None = None) -> str:
    """발행 모드는 파이썬이 결정(LLM 신뢰 X): 민감하면 review, 아니면 cluster 기본/auto."""
    if is_sensitive(question, cluster_record, data):
        return "review"
    if cluster_record and cluster_record.get("defaultPublishMode") in ("auto", "review"):
        return cluster_record["defaultPublishMode"]
    return "auto"


def ttl_days_for(cluster_record: dict | None, question: str = "") -> int:
    """리서치팩 신선도(일): 민감/가격 클러스터는 짧게(7), 일반 30."""
    if is_sensitive(question, cluster_record):
        return int(getattr(config, "PACK_TTL_DAYS_SENSITIVE", 7))
    return int(getattr(config, "PACK_TTL_DAYS_DEFAULT", 30))
