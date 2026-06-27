# -*- coding: utf-8 -*-
"""
classify.py — 질문 자동 분류 (§11) · 싼 LLM 1콜로 20~30개 한 번에
==================================================================
질문(또는 묶음) → bigCategory / cluster / pillar / questionType / pageType / intent / priority /
needsFreshSource / publishMode / relatedGuides 분류. `Daebak Q&A Expansion Map`(taxonomy.json)의
**고정 트리 안으로만 분류**한다(closed-list → LLM 이 클러스터를 새로 못 만듦 = 슬러그 드리프트/고아 방지).

안전 규칙:
  · cluster 는 taxonomy.flat_clusters() 의 허용 목록에서만. 미매칭 → clusterSlug="" (수동 처리 플래그).
  · publishMode 는 **파이썬이 결정**(LLM 신뢰 X): 민감 주제(비자/의료/법률/안전/공식요금) → review.
  · pageType / questionType 는 enum 검증. slug 는 seo.slugify_no_year (연도 없음).
키 없음/실패 → 안전한 휴리스틱 폴백(분류 행은 항상 생성 → 사용자가 표에서 수정).
"""

from __future__ import annotations

import json

import config
import seo as seo_mod
import taxonomy
from plan import PAGE_TYPES, QUESTION_TYPES

try:
    import usage
except Exception:  # noqa: BLE001
    usage = None  # type: ignore

_FRESH_PAGETYPES = {"price", "visa", "safety"}   # 기본 needsFreshSource=True 인 유형

_TAG_STOP = {"what", "is", "the", "a", "an", "to", "from", "of", "in", "on", "at", "for", "how",
             "do", "does", "you", "your", "my", "can", "should", "much", "are", "and", "or",
             "with", "which", "best", "way", "get", "there", "this", "that", "i"}


def _gen_tags(question: str, page_type: str) -> list:
    """질문/유형에서 태그 자동 생성(데이터 기반, 하드코딩 X)."""
    import re as _re
    tags: list = []
    for w in _re.findall(r"[a-z0-9]+", (question or "").lower()):
        if len(w) >= 4 and w not in _TAG_STOP and w not in tags:
            tags.append(w)
    tags = tags[:5]
    if page_type and page_type not in tags:
        tags.append(page_type)
    return tags[:6]


def guess_pagetype(question: str) -> str:
    """질문 텍스트로 pageType 추정 — LLM 이 pageType 을 안 주거나 실패해도 practical 로만 쏠리지 않게."""
    s = (question or "").lower()
    if " vs " in s or "versus" in s or "worth it" in s or ("better" in s and "or" in s):
        return "comparison"
    if any(w in s for w in ("how much", "cost", "price", "fare", "how expensive", "won", "₩")):
        return "price"
    if any(w in s for w in ("visa", "k-eta", "keta", "arrival card", "e-arrival")):
        return "visa"
    if any(w in s for w in ("how do i get", "best route", "best way", " to ", "from incheon", "to seoul")):
        return "route"
    if any(w in s for w in ("itinerary", "how many days", "days in", "plan a", "trip length")):
        return "planning"
    if any(w in s for w in ("safe", "safety", "dangerous", "scam")):
        return "safety"
    return "practical"


def _allowed_list_str(flat: list) -> str:
    """프롬프트에 줄 허용 클러스터 목록(닫힌 집합)."""
    lines = []
    for f in flat:
        pill = f.get("pillarQuestion") or ""
        lines.append(f'- bigCategory="{f["bigCategory"]}" | cluster="{f["cluster"]}"'
                     + (f' | pillar="{pill}"' if pill else ""))
    return "\n".join(lines)


def _system_prompt(flat: list) -> str:
    allowed = _allowed_list_str(flat)
    pts = " / ".join(PAGE_TYPES)
    return (
        "You classify short questions that foreigners ask about traveling in/visiting Korea, for a Q&A "
        "site. Assign each question to EXACTLY ONE existing category+cluster from the ALLOWED LIST below. "
        "You may NOT invent new categories or clusters. If nothing fits, use bigCategory=\"\" and "
        "cluster=\"\" (do not guess).\n\n"
        "ALLOWED LIST (choose bigCategory and cluster verbatim from here):\n"
        f"{allowed}\n\n"
        "For EACH input question return an object with:\n"
        '  "question": echo the input question verbatim,\n'
        '  "title": a concise answer-style page title (no year),\n'
        '  "bigCategory": exact title from the allowed list (or ""),\n'
        '  "cluster": exact cluster title from the allowed list (or ""),\n'
        '  "questionType": one of pillar | supporting | faq — pillar = the big central question of a '
        "cluster; supporting = a specific situation/area/cost/comparison/method with its own search "
        "intent; faq = answerable in 1-2 sentences (too thin for its own page),\n'"
        f'  "pageType": one of {pts} — route=getting from A to B; comparison=X vs Y; price=cost; '
        "planning=itinerary/how-many-days; practical=how-to/use; list=list of options; safety=safety; "
        "visa=visa/entry,\n"
        '  "intent": 2-5 word search intent,\n'
        '  "priority": integer 1-5 (5 = most important/high traffic),\n'
        '  "needsFreshSource": true if the answer depends on current prices/schedules/rules that change,\n'
        '  "supportingQuestions": up to 4 closely-related sub-questions a reader asks next,\n'
        '  "sourceRequirements": up to 3 kinds of official sources needed,\n'
        '  "relatedGuides": up to 5 related question strings.\n\n'
        'Return STRICT JSON: {"items": [ ... ]} with EXACTLY one object per input question, in the same '
        "order. No preamble."
    )


def _validate_pagetype(pt: str) -> str:
    pt = (pt or "").strip().lower()
    return pt if pt in PAGE_TYPES else "practical"


def _validate_qtype(qt: str) -> str:
    qt = (qt or "").strip().lower()
    return qt if qt in QUESTION_TYPES else "supporting"


def _reconcile(item: dict, taxo: dict) -> dict:
    """LLM 1건 → 정식 plan 필드(택소노미 재조정 + 파이썬 결정 항목)."""
    question = (item.get("question") or "").strip()
    title = (item.get("title") or question).strip()
    # 1) 알려진 질문이면 택소노미에서 직접 확정(LLM 분류와 무관 — 슬러그/클러스터/유형 정확)
    fq = taxonomy.find_question(question, taxo)
    if fq:
        rec, curated_slug, curated_type = fq
    else:
        rec = taxonomy.resolve(item.get("bigCategory", ""), item.get("cluster", ""), taxo)
        curated_slug, curated_type = "", ""

    if rec:
        big = taxonomy.category(rec.get("bigCategory", ""), taxo) or {}
        pillar = taxonomy.pillar_of(rec.get("id", ""), taxo) or {"question": "", "slug": ""}
        big_title, big_slug = big.get("title", ""), big.get("slug", "")
        cl_title, cl_slug = rec.get("title", ""), rec.get("slug", "")
        pillar_q, pillar_slug = pillar.get("question", ""), pillar.get("slug", "")
        publish_mode = taxonomy.default_publish_mode(question, rec, taxo)
        if not curated_slug:    # LLM-resolved 경로: 클러스터 내 질문 일치 시 큐레이트 슬러그 채택
            qn = " ".join(question.lower().split())
            if pillar.get("question") and " ".join(pillar["question"].lower().split()) == qn:
                curated_slug, curated_type = pillar.get("slug", ""), "pillar"
            else:
                for s in taxonomy.supporting_of(rec.get("id", ""), taxo):
                    if s.get("question") and " ".join(s["question"].lower().split()) == qn:
                        curated_slug, curated_type = s.get("slug", ""), "supporting"
                        break
    else:
        big_title = big_slug = cl_title = cl_slug = pillar_q = pillar_slug = ""
        publish_mode = taxonomy.default_publish_mode(question, None, taxo)

    pt_raw = item.get("pageType")
    page_type = _validate_pagetype(pt_raw) if pt_raw else guess_pagetype(question)
    q_type = curated_type or _validate_qtype(item.get("questionType"))
    needs_fresh = item.get("needsFreshSource")
    if needs_fresh is None:
        needs_fresh = page_type in _FRESH_PAGETYPES
    try:
        priority = max(1, min(5, int(item.get("priority") or 3)))
    except Exception:  # noqa: BLE001
        priority = 3

    def _slist(v, cap):
        return [str(x).strip() for x in (v or []) if str(x).strip()][:cap]

    return {
        "question": question,
        "title": title,
        "slug": curated_slug or seo_mod.slugify_no_year(title or question),
        "answerSummary": "",
        "bigCategory": big_title, "bigCategorySlug": big_slug,
        "cluster": cl_title, "clusterSlug": cl_slug,
        "pillarQuestion": pillar_q, "pillarSlug": pillar_slug,
        "questionType": q_type, "pageType": page_type,
        "intent": (item.get("intent") or "").strip()[:60],
        "priority": priority,
        "needsFreshSource": bool(needs_fresh),
        "publishMode": publish_mode,
        "relatedGuides": _slist(item.get("relatedGuides"), 6),
        "supportingQuestions": _slist(item.get("supportingQuestions"), 6),
        "sourceRequirements": _slist(item.get("sourceRequirements"), 4),
        "tags": _slist(item.get("tags"), 6) or _gen_tags(question, page_type),
        "unmatched": rec is None,    # 수동 처리 플래그(클러스터 미매칭)
    }


def _fallback(questions: list, taxo: dict) -> list:
    """LLM 없음/실패 → 안전 휴리스틱(미배정). 분류 행은 항상 생성 → 사용자가 표에서 채움."""
    out = []
    for q in questions:
        q = (q or "").strip()
        if not q:
            continue
        out.append(_reconcile({"question": q, "title": q, "pageType": "practical",
                               "questionType": "supporting", "needsFreshSource": True}, taxo))
    return out


def classify_batch(questions: list, taxo: dict | None = None, client=None, cfg=None) -> list:
    """질문 묶음 → plan 필드 dict 목록(taxonomy 닫힌 집합으로 분류). gpt-4o-mini 1콜.
    client=None(키없음) 또는 실패 → 휴리스틱 폴백. 성공 시 bump_usage(1)."""
    cfg = cfg or config
    taxo = taxo or taxonomy.load()
    qs = [str(q).strip() for q in (questions or []) if str(q).strip()]
    if not qs:
        return []
    if client is None:
        return _fallback(qs, taxo)
    flat = taxonomy.flat_clusters(taxo)
    try:
        payload = json.dumps({"questions": qs}, ensure_ascii=False)
        resp = client.chat.completions.create(
            model=getattr(cfg, "CLASSIFY_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": _system_prompt(flat)},
                      {"role": "user", "content": payload}],
            response_format={"type": "json_object"}, temperature=0.2,
            max_tokens=min(4000, 300 + 150 * len(qs)))
        data = json.loads(resp.choices[0].message.content or "{}")
        items = data.get("items") or []
        if usage:
            usage.bump_usage(1)
        # 길이/순서 보정: 질문 수와 맞춤(부족하면 폴백 채움)
        out = []
        for i, q in enumerate(qs):
            item = items[i] if i < len(items) and isinstance(items[i], dict) else {}
            if not (item.get("question") or "").strip():
                item["question"] = q
            out.append(_reconcile(item, taxo))
        return out
    except Exception:  # noqa: BLE001
        return _fallback(qs, taxo)


def classify_one(question: str, taxo: dict | None = None, client=None, cfg=None) -> dict:
    out = classify_batch([question], taxo, client, cfg)
    return out[0] if out else {}
