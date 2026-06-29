# -*- coding: utf-8 -*-
"""
seo.py — 영작 결과의 SEO 마감: 제목·메타·슬러그(연도 제거)·frontmatter
=======================================================================
합성 결과(synth) → 발행용 메타데이터. 기법 F-4(URL에 연도 박지 않기 = 갱신해도 같은 주소로
누적 권위 유지). JSON-LD는 인용 효과가 약하다고 검증돼(기법 F) 사이트에서 FAQ만 최소로.

gpt-4o-mini 1콜로 제목(≤60)·메타(≤155) 다듬기, 키없음/실패 시 순수 파이썬 폴백.
"""

from __future__ import annotations

import json
import re

import config
import research
import storage
import usage
from llm import KST
from datetime import datetime

_YEAR = re.compile(r"\b(19|20)\d{2}\b")


def slugify_no_year(text: str) -> str:
    """slug + 4자리 연도 토큰 제거(F-4). 예: 'best-sim-2026-guide' → 'best-sim-guide'."""
    base = storage.slugify(_YEAR.sub(" ", text or ""))
    base = re.sub(r"-+", "-", base).strip("-")
    return base or "answer"


def _clean_meta(s: str, cap: int = 155) -> str:
    s = re.sub(r"\s+", " ", (s or "")).strip()
    return s[:cap].rstrip()


def _fallback(question: str, synth: dict) -> dict:
    title = (synth.get("title") or question or "Answer").strip()[:60]
    cp = synth.get("citation_pack") or {}
    meta = _clean_meta(cp.get("answer") or synth.get("markdown") or question)
    return {"title": title, "meta_description": meta, "used_llm": False}


def _llm_meta(question: str, synth: dict, client, cfg) -> dict:
    sysp = (
        "You write SEO metadata for an English Q&A article. Return STRICT JSON: "
        '{"title": "<<=60 chars, answer-style, NO year>", "meta_description": "<<=155 chars, plain, '
        'answer-first, no clickbait>"}. The title should read like a direct answer to the question.'
    )
    payload = json.dumps({
        "question": question,
        "draft_title": synth.get("title") or "",
        "one_line_answer": (synth.get("citation_pack") or {}).get("answer") or "",
    }, ensure_ascii=False)
    resp = client.chat.completions.create(
        model=getattr(cfg, "SEO_MODEL", "gpt-4o-mini"),
        messages=[{"role": "system", "content": sysp},
                  {"role": "user", "content": payload}],
        response_format={"type": "json_object"}, temperature=0.4, max_tokens=200)
    data = json.loads(resp.choices[0].message.content or "{}")
    title = (str(data.get("title") or "").strip() or synth.get("title") or question)[:60]
    meta = _clean_meta(str(data.get("meta_description") or "") or (synth.get("citation_pack") or {}).get("answer") or "")
    usage.bump_usage(1)
    return {"title": title, "meta_description": meta, "used_llm": True}


_FM_EXTRA_KEYS = ("bigCategory", "bigCategorySlug", "cluster", "clusterSlug", "pillarSlug",
                  "pillarQuestion", "questionType", "pageType", "intent", "needsFreshSource",
                  "relatedGuides", "geoScore", "answerSummary", "priority", "featured", "tags",
                  # 피벗: 수익화/Entity 구조 필드(operator 가 extra 로 전달 — 있을 때만 frontmatter 에)
                  "monetization", "priceRange", "quickFacts", "foreignerNotes", "commonMistakes")


def build_seo(question: str, synth: dict, client, cfg=None, extra: dict | None = None) -> dict:
    """synth → {title, meta_description, slug, frontmatter, used_llm}.
    client=None(키없음) → 순수 파이썬 폴백. LLM 실패도 폴백.
    extra: 택소노미/관련글/pageType 등 클러스터 CMS frontmatter 추가 필드(사이트가 허브/관련글에 사용)."""
    cfg = cfg or config
    q = (question or "").strip()
    if client is None:
        meta = _fallback(q, synth)
    else:
        try:
            meta = _llm_meta(q, synth, client, cfg)
        except Exception:  # noqa: BLE001
            meta = _fallback(q, synth)

    title = meta["title"]
    slug = slugify_no_year(title)
    today = datetime.now(KST).strftime("%Y-%m-%d")
    cp = synth.get("citation_pack") or {}
    frontmatter = {
        "title": title,
        "slug": slug,
        "question": q,
        "summary": meta["meta_description"],
        "datePublished": today,
        "dateModified": today,
        "lastUpdatedLabel": (synth.get("last_updated") or today[:7]),
        "sources": [{"url": s.get("url", ""), "domain": s.get("domain", ""),
                     "note": research.describe_source(s.get("domain", ""))}
                    for s in (synth.get("sources") or []) if s.get("url")][:20],
        "faq": [{"q": f.get("q", ""), "a": f.get("a", "")} for f in (synth.get("faq") or []) if f.get("q")],
        "citationPack": {
            "answer": cp.get("answer", ""),
            "keyFacts": cp.get("key_facts", []) or [],
            "quotable": cp.get("quotable", ""),
        },
        "atAGlance": [{"label": str(g.get("label", "")).strip()[:24],
                       "value": str(g.get("value", "")).strip()[:80]}
                      for g in (synth.get("at_a_glance") or [])
                      if g.get("label") and g.get("value")][:4],
        "highlights": [str(h).strip()[:40] for h in (synth.get("highlights") or []) if str(h).strip()][:4],
        "verifyFlags": synth.get("verify_flags") or [],
    }
    # 클러스터 CMS 추가 필드(택소노미/관련글/pageType) — 있을 때만 frontmatter 에 실음
    for k in _FM_EXTRA_KEYS:
        if extra and k in extra and extra[k] not in (None, ""):
            frontmatter[k] = extra[k]
    # 의도별 상세 구조 필드(synth 가 생성했을 때만 — worth_it + 가격/단계/추천/구매)
    for k in ("verdict", "goodFor", "notFor", "alternatives",
              "priceFactors", "steps", "topPick", "criteria", "buyLocations", "productGroups",
              "quickFacts", "priceRange", "foreignerNotes", "commonMistakes"):
        if synth.get(k):
            frontmatter[k] = synth[k]
    return {
        "title": title,
        "meta_description": meta["meta_description"],
        "slug": slug,
        "frontmatter": frontmatter,
        "used_llm": meta["used_llm"],
    }
