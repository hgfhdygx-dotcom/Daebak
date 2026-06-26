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


def build_seo(question: str, synth: dict, client, cfg=None) -> dict:
    """synth → {title, meta_description, slug, frontmatter, used_llm}.
    client=None(키없음) → 순수 파이썬 폴백. LLM 실패도 폴백."""
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
        "author": getattr(cfg, "AUTHOR_NAME", "Editorial Team"),
        "lastUpdatedLabel": (synth.get("last_updated") or today[:7]),
        "sources": [{"url": s.get("url", ""), "domain": s.get("domain", "")}
                    for s in (synth.get("sources") or []) if s.get("url")][:20],
        "faq": [{"q": f.get("q", ""), "a": f.get("a", "")} for f in (synth.get("faq") or []) if f.get("q")],
        "citationPack": {
            "answer": cp.get("answer", ""),
            "keyFacts": cp.get("key_facts", []) or [],
            "quotable": cp.get("quotable", ""),
        },
        "verifyFlags": synth.get("verify_flags") or [],
    }
    return {
        "title": title,
        "meta_description": meta["meta_description"],
        "slug": slug,
        "frontmatter": frontmatter,
        "used_llm": meta["used_llm"],
    }
