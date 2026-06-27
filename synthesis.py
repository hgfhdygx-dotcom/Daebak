# -*- coding: utf-8 -*-
"""
synthesis.py — 본문 합성 (★ 가장 높은 가치: GEO/SEO 플레이북을 프롬트로 인코딩)
================================================================================
리서치 증거(evidence_pack) → AI가 인용하기 좋은 영어 글. geo-tracker 의 GEO 기법 문서
(ai가 좋아하는 글.md)에서 검증된 레버를 **명시적으로 프롬트에 박았다**:

  D / F-2  답변 우선 + 질문 미러링(첫 문장이 질문에 즉답)
  P        상단 Citation Pack(1줄 답 + 핵심 사실 + 인용용 문장 + 최종갱신일)
  D-2      각 소제목 첫 단락은 문맥 없이도 읽히는 자기완결(잘려도 의미 성립)
  S        증거 사다리(주장→관찰→출처). 맨 형용사 금지
  E        인용 안전: 증거에 있는 사실만. 가격·날짜·수상·통계·이름 지어내기 금지 → [VERIFY]
  C-2      하위질문을 Q/A 직답 FAQ로

🚨 안전: 키 없음/실패 시 무료 템플릿 폴백(미리보기는 항상 렌더). gpt-4o 1콜.
   AI 티(상투어) 회피. 확인 불가는 영어 태그 [VERIFY] + verify_flags 로 표면화.
"""

from __future__ import annotations

import json
import re
from datetime import datetime

import config
import research
import usage
from llm import KST

VERIFY = "[VERIFY]"

# pageType 별 BODY 섹션 골격(§14). At a glance / Quick answer / FAQ / Sources / Related / Last updated 는
# frontmatter + 사이트가 렌더하므로 본문에 넣지 않는다 — 아래는 '본문 H2'만.
PAGE_TYPE_SKELETONS = {
    "route": ["Key facts", "Fastest option", "Cheapest option", "Best for hotels",
              "Best late at night", "Step-by-step", "Good to know"],
    "comparison": ["The options at a glance", "Best for each traveler", "Pros and cons",
                   "Which should you choose"],
    "price": ["Key facts", "Price range", "What affects the price", "Cheaper alternatives",
              "Watch out"],
    "planning": ["Recommended number of days", "Best for", "Suggested itinerary",
                 "Mistakes to avoid"],
    "practical": ["Key facts", "When you need it", "How to use it", "Cost"],
    "list": ["Top options", "How to choose"],
    "safety": ["Key facts", "Is it safe", "What to watch out for", "Practical tips"],
    "visa": ["Key facts", "Who needs it", "How to apply", "Cost and processing time",
             "Confirm on the official source"],
}
_TABLE_PAGETYPES = {"route", "comparison"}        # 옵션 비교표 필수
_KEYFACTS_PAGETYPES = {"route", "price", "practical", "list", "safety", "visa"}  # Key facts 속성표


def _skeleton_clause(page_type: str) -> str:
    pt = (page_type or "practical").strip().lower()
    sections = PAGE_TYPE_SKELETONS.get(pt, PAGE_TYPE_SKELETONS["practical"])
    parts = [
        f"STRUCTURE (pageType = {pt}): Write the BODY as H2 sections covering, in order: "
        + " → ".join(sections) + ". Adapt wording to real user questions; skip a section only if the "
        "research truly has nothing for it.",
        "MACRO HEADING TREE: Every H2 is a real user question or its noun-phrase form; the FIRST "
        "sentence under each H2 answers it directly and stands alone (no leading pronoun).",
    ]
    if pt in _TABLE_PAGETYPES:
        parts.append("COMPARISON TABLE (required): include a Markdown table with columns "
                     "Option | Time | Approx. price | Best for | Pros | Watch out. Put this table FIRST "
                     "if you also add a Key facts table.")
    if pt in _KEYFACTS_PAGETYPES:
        parts.append("KEY FACTS TABLE (attribute dictionary): include a '## Key facts' Markdown table "
                     "with two columns (Attribute | Value) listing the checkable specifics "
                     "(e.g. Fastest option, Cheapest option, Approx. time, Approx. cost, Works with T-money, "
                     "Official source). Only attributes the research supports.")
    return " \n".join(parts)


def _scope_clause(question_type: str) -> str:
    """questionType 별 범위 규칙 — 개요/직답/FAQ 에 따라 at_a_glance·highlights·lead 의 '범위'를 맞춘다.
    (규칙: 개요 질문에 특정 수단의 단일 숫자를 박지 말 것)."""
    qt = (question_type or "supporting").strip().lower()
    if qt == "pillar":
        return ("SCOPE (overview / pillar): This is the cluster's MAIN OVERVIEW. Do NOT pin the answer to "
                "ONE option's single exact number. `at_a_glance` = 2-4 CATEGORY or RANGE picks "
                "(e.g. 'Train · Bus · Taxi', '₩4,000–100,000 across options', '43–90 min'), never one option "
                "with one exact price. `highlights` = 3-4 NON-numeric scope phrases (e.g. '4 main options', "
                "'Fixed vs flexible', 'Door-to-door or station'). The body table still compares concrete options, "
                "but the lead/summary stays at overview altitude (what options exist + how to choose), not "
                "'take X for ₩Y'.")
    if qt == "faq":
        return ("SCOPE (faq): Keep it light — `at_a_glance` 0-1 item, `highlights` 0-1, body 2-4 sentences that "
                "answer directly. No long sections.")
    return ("SCOPE (supporting): Answer THIS specific question directly. `at_a_glance` + `highlights` carry the "
            "concrete number(s) for THIS question's intent ONLY — a cost question leads with the price, a time "
            "question with the duration, a single-mode question with that mode's figures. Don't pad with "
            "unrelated options.")


def _intent_clause(question: str) -> str:
    """질문 의도별 본문 규칙(제목↔본문 정합). 키워드 기반·범용. worth-it 은 구조 필드까지 요구."""
    q = (question or "").lower()
    if re.search(r"worth it|worth the|should i\b|가치|탈\s*만", q):
        return ("INTENT = WORTH-IT: Open with a clear VERDICT (Yes / No / It depends — plus one qualifying line). "
                "Then state WHO it's good for and WHO it's not for, and name the main ALTERNATIVE. Never end with a "
                "vague 'good for speed and comfort'. ALSO output JSON fields: verdict (one sentence), goodFor (2-4), "
                "notFor (1-3), alternatives (0-3).")
    if re.search(r"cheapest|cheaper|budget|저렴", q):
        return ("INTENT = CHEAPEST: lead with the price and the cheapest pick; note the trade-off vs "
                "faster/comfier options. ALSO output JSON field priceFactors (1-4 short notes on what makes "
                "the price vary).")
    if re.search(r"fastest|quickest|빠른", q):
        return "INTENT = FASTEST: lead with the travel time; name the fastest option and when it isn't worth it."
    if re.search(r"how much|cost|price|fare|요금|얼마", q):
        return ("INTENT = COST: give the price RANGE and what makes it vary (distance, time of day, "
                "surcharges). ALSO output JSON field priceFactors (1-4 short notes on what changes the price).")
    if re.search(r"\bbest\b|recommend|추천", q):
        return ("INTENT = BEST: give the recommendation CRITERIA (for whom / when), not just one pick. ALSO "
                "output JSON fields topPick (one short line naming the pick) and criteria (2-4 how-to-choose notes).")
    if re.search(r"how (do|to)\b|방법", q):
        return ("INTENT = HOW-TO: answer as clear steps or a short decision list. ALSO output JSON field "
                "steps (2-6 short imperative steps in order).")
    if re.search(r"where to buy|어디서 사", q):
        return ("INTENT = WHERE-TO-BUY: name store types, online options, and locations. ALSO output JSON "
                "field buyLocations (2-5 store types / places).")
    if re.search(r"what to buy|뭐 사|뭐 살", q):
        return ("INTENT = WHAT-TO-BUY: recommend product CATEGORIES (not one item's exact price). ALSO output "
                "JSON field productGroups (2-5 product categories).")
    return ""

# 영어 'AI 티' 상투어 — 피할 것(드래프트 AI_TELLS 영어판)
AI_TELLS = [
    "not only ... but also", "boasts", "a must-visit", "must-visit for everyone",
    "unforgettable experience", "highly recommended", "proud to offer", "look no further",
    "in today's fast-paced world", "nestled in", "when it comes to", "the world of",
    "rest assured", "dive into", "it's important to note", "in conclusion",
    "elevate your", "game-changer", "seamless", "treasure trove",
]

# 검증 권장 패턴(증거 없이 단정하면 위험 — verify_flags 로 표면화)
_RISKY = re.compile(
    r"(₩|\$|won\b|KRW|\d+\s?%|\bfee\b|\bprice\b|\bcost\b|\bvisa\b|\bdeadline\b|"
    r"\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+\d{1,2}\b)", re.I)

# 가짜/미검증 URL 차단 — LLM이 example.com 등을 지어내도 무조건 제거(출처 무결성).
_PLACEHOLDER_DOMAINS = {"example.com", "example.org", "example.net", "example.edu", "yourwebsite.com"}
_URL_RE = re.compile(r"https?://[^\s)\]>\"']+")
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")


def _url_allowed(u: str, allowed_domains: set) -> bool:
    d = research.domain_of(u)
    if not d or d in _PLACEHOLDER_DOMAINS:
        return False
    return d in allowed_domains


def sanitize_urls(result: dict, pack: dict) -> dict:
    """글에 등장하는 모든 URL을 '리서치가 실제로 가져온 출처 도메인'일 때만 남긴다.
    example.com 같은 지어낸 링크는 보이는 텍스트만 남기고 제거하고, 무언가 지웠으면 verify_flag를 단다.
    표시·스키마용 sources는 항상 실제 리서치 출처로 덮어쓴다. 절대 raise 안 함(폴백 안전)."""
    result = result or {}
    sources = [s for s in (pack.get("sources") or [])
               if isinstance(s, dict) and s.get("url")]
    allowed = {research.domain_of(s["url"]) for s in sources}
    allowed.discard("")
    n = [0]

    def scrub(text):
        if not isinstance(text, str) or not text:
            return text

        def _md(m):
            if _url_allowed(m.group(2), allowed):
                return m.group(0)
            n[0] += 1
            return m.group(1)

        def _bare(m):
            if _url_allowed(m.group(0), allowed):
                return m.group(0)
            n[0] += 1
            return ""

        text = _MD_LINK_RE.sub(_md, text)
        text = _URL_RE.sub(_bare, text)
        text = re.sub(r"\(\s*\)", "", text)          # 빈 괄호 정리
        text = re.sub(r"\s*[—–-]\s*$", "", text)      # 끝에 남은 구분선 정리
        text = re.sub(r"[ \t]{2,}", " ", text)
        return text.strip()

    if isinstance(result.get("markdown"), str):
        result["markdown"] = scrub(result["markdown"])
    cp = result.get("citation_pack") or {}
    if isinstance(cp, dict):
        cp["answer"] = scrub(cp.get("answer", ""))
        cp["quotable"] = scrub(cp.get("quotable", ""))
        cp["key_facts"] = [f for f in (scrub(str(x)) for x in (cp.get("key_facts") or [])) if f]
        result["citation_pack"] = cp
    if isinstance(result.get("faq"), list):
        for f in result["faq"]:
            if isinstance(f, dict) and isinstance(f.get("a"), str):
                f["a"] = scrub(f["a"])
    if isinstance(result.get("at_a_glance"), list):
        for g in result["at_a_glance"]:
            if isinstance(g, dict) and isinstance(g.get("value"), str):
                g["value"] = scrub(g["value"])
    if isinstance(result.get("highlights"), list):
        result["highlights"] = [scrub(str(h)) for h in result["highlights"] if str(h).strip()]
    result["sources"] = sources
    if n[0]:
        flags = list(result.get("verify_flags") or [])
        flags.append(f"출처가 확인되지 않은 링크 {n[0]}개를 제거했어요 — 해당 사실의 공식 출처를 직접 확인/추가하세요.")
        result["verify_flags"] = flags
    return result


def _now_ym() -> str:
    return datetime.now(KST).strftime("%Y-%m")


def _system_prompt(last_updated: str, page_type: str = "practical",
                   question_type: str = "supporting", question: str = "") -> str:
    tells = "; ".join(AI_TELLS)
    return (
        "You write English answer articles for foreigners (living in or visiting Korea) so that AI search "
        "engines (ChatGPT, Gemini, Perplexity) will CITE them. Use ONLY the facts in the provided research. "
        "You are precise, neutral, specific, and never invent anything.\n"
        "\n"
        "WRITE THE ARTICLE USING THESE PROVEN RULES (follow every one):\n"
        "1. ANSWER-FIRST + MIRROR: The very first sentence directly answers the user's question, mirroring "
        "the question's own wording. No throat-clearing, no 'In this article'.\n"
        "2. CITATION PACK: Provide a top box: a one-line answer; 2-4 key facts; and one short quotable "
        "sentence a person could copy verbatim.\n"
        "2b. AT A GLANCE: Also output at_a_glance — 2-4 tiny labeled picks a reader scans in 3 seconds "
        "(label = 2-4 words like Fastest / Cheapest / Best for / Late night / Watch out; value = a very short "
        "specific pick that includes the key number when relevant).\n"
        "2c. HIGHLIGHTS: Also output highlights — 3-4 ultra-short badge phrases (1-4 words each) about the "
        "single recommended pick (e.g. '~43 min', '₩13,000', 'No road traffic', 'Best for first-timers').\n"
        "3. BE SPECIFIC, NOT VAGUE (most important): Use concrete, checkable specifics whenever the research "
        "contains them — exact durations, amounts/fees, official body names, visa/category codes, step "
        "counts, eligibility, and named exceptions. Do NOT write vague hedges like 'it varies', 'depends on "
        "your nationality', or 'there are several options' UNLESS you immediately follow with the actual "
        "common values (e.g. 'most US/UK/EU/AU/CA/NZ passports get 90 days visa-free; some get 30 or 60 — "
        "check yours'). Prefer a small comparison TABLE or tight specific bullets over generic prose. Every "
        "section must teach something concrete; cut filler. Keep paragraphs SHORT (2-3 sentences max) and "
        "break details into bullet lists — never a wall of text. When comparing options, the table columns "
        "should be: Option | Time | Approx. price | Best for | Pros | Watch out (use ~/approx. for prices; "
        "write [VERIFY] for any price/time not in the research). Put 'how to decide' guidance near the TOP of "
        "the body, and do NOT repeat in prose what the table, cards, or FAQ already say — the body is brief "
        "supplementary notes only.\n"
        "4. SELF-CONTAINED CHUNKS: Every H2 section opens with a 2-4 sentence paragraph that makes full sense "
        "out of context. Start paragraphs with concrete nouns, NOT pronouns like 'It' or 'This'.\n"
        "5. CITATION SAFETY (never guess): Use ONLY facts present in the research. NEVER invent prices, fees, "
        f"dates, durations, deadlines, statistics, names, or awards. If a needed fact is not in the research, "
        f"write the tag '{VERIFY}' in its place and add a short note to verify_flags. Better to flag than guess.\n"
        "6. SOURCE URL DISCIPLINE: You are given available_sources (a list of REAL urls). A key_fact may end "
        "with ' — <url>' ONLY when that exact url is in available_sources. NEVER invent, guess, shorten, or "
        "placeholder a URL. NEVER use example.com / example.org / any fake URL. If you have no real source url "
        "for a fact, write the fact with NO url. Same inside the body: never link to a url not in available_sources. "
        "PREFER OFFICIAL SOURCES: when available_sources includes an official site (government .go.kr/.or.kr, or "
        "the operator's/authority's own site — e.g. an airport, railway, transit-card, or tourism authority), "
        "attach THAT official url in preference to a third-party blog for the same fact.\n"
        "7. FAQ: End with an FAQ that answers each sub-question with a SPECIFIC first sentence (the concrete "
        "answer with the actual numbers/names), not a broad restatement of the question.\n"
        "8. EMPHASIS: In the markdown BODY only, wrap THE single most important phrase of each H2 section (the "
        "key number, rule, or takeaway) in **markdown bold** — sparingly, ONE short phrase per section, never "
        "whole sentences. Do NOT bold inside the title, citation_pack, or faq (those render as plain text).\n"
        "9. FRESHNESS (do NOT stamp dates into the body): The page already shows its own 'last updated' date "
        "separately, so NEVER write 'as of " + last_updated + "', 'as of 2026', or any current-date stamp in "
        "the body or facts. Prefer the most recent facts in the research. For a rule that can change (visas, "
        "fees), state it plainly and tell the reader to confirm the current rule on the cited official source. "
        "Use a specific year ONLY for an actual past event (e.g. 'required since 2021'), never as a freshness stamp.\n"
        "10. HUMAN TONE: Sound like a knowledgeable human editor, NOT like AI. Avoid these AI-tell phrases: "
        f"{tells}. No marketing fluff, no 'in conclusion'.\n\n"
        + _skeleton_clause(page_type) + "\n"
        + _scope_clause(question_type) + "\n"
        + _intent_clause(question) + "\n\n"
        + "OUTPUT STRICT JSON ONLY with this shape:\n"
        "{\n"
        '  "title": "<concise, answer-style title, no year>",\n'
        '  "markdown": "<the article BODY in GitHub Markdown: ## H2 sections, short paragraphs, bullet '
        'lists, a small comparison TABLE when the question has multiple options, and where helpful ONE short '
        "'> Tip: ...' or '> Good to know: ...' blockquote callout. Put ONE key phrase per section in **bold**. "
        'Do NOT include the H1 title or the citation pack or the FAQ here — those are separate fields.>",\n'
        '  "at_a_glance": [{"label": "<2-4 words: Fastest / Cheapest / Best for / Late night / Watch out>", '
        '"value": "<very short specific pick, include the key number when relevant>"}],\n'
        '  "highlights": ["<1-4 word badge about the recommended pick, e.g. ~43 min / ₩13,000 / No traffic>"],\n'
        '  "citation_pack": {"answer": "<one specific line>", "key_facts": ["<specific fact'
        '[ — <url from available_sources>]>", "..."], "quotable": "<one copy-pasteable sentence>"},\n'
        '  "faq": [{"q": "<sub-question>", "a": "<specific direct first-sentence answer>"}],\n'
        '  "verify_flags": ["<short note of each thing the human must verify>"],\n'
        '  "verdict": "<ONLY for worth-it/should-I questions: Yes / No / It depends + one short line; omit otherwise>",\n'
        '  "goodFor": ["<who it suits>"], "notFor": ["<who should skip it>"], "alternatives": ["<the main alternative>"],\n'
        '  "priceFactors": ["<cheapest/cost only: what makes the price vary; omit otherwise>"],\n'
        '  "steps": ["<how-to only: short ordered steps; omit otherwise>"],\n'
        '  "topPick": "<best/recommend only: one short pick; omit otherwise>", "criteria": ["<best only: how to choose>"],\n'
        '  "buyLocations": ["<where-to-buy only: store types/places; omit otherwise>"],\n'
        '  "productGroups": ["<what-to-buy only: product categories; omit otherwise>"]\n'
        "}\n"
        "Every key_fact url MUST appear verbatim in available_sources; if none applies, include the fact with "
        "no url rather than inventing one."
    )


def _evidence_payload(question: str, pack: dict) -> str:
    sources = [s.get("url", "") for s in (pack.get("sources") or []) if s.get("url")][:20]
    return json.dumps({
        "question": question,
        "sub_questions": pack.get("subqs") or [],
        "research_findings": pack.get("research_text") or "",
        "available_sources": sources,
    }, ensure_ascii=False)


def template_markdown(question: str, pack: dict) -> dict:
    """무료 폴백(LLM 없이): 리서치 텍스트를 그대로 보여주고 전부 [VERIFY] 권고. 미리보기용."""
    q = (question or "").strip()
    research = (pack.get("research_text") or "").strip()
    subqs = pack.get("subqs") or []
    sources = pack.get("sources") or []
    body_lines = [
        f"## Short answer",
        f"{VERIFY}: An OpenAI key was not used, so this is a raw research draft. "
        f"Review and rewrite the facts below before publishing.",
        "",
        "## Research notes (verify before use)",
        research[:4000] or f"{VERIFY}: No research text was returned.",
    ]
    faq = [{"q": s, "a": f"{VERIFY}: answer from the research above."} for s in subqs[:5]]
    return {
        "error": "(무료 모드: OpenAI 키를 넣으면 자연스러운 영어 글로 합성해줘요.)",
        "title": q or "Untitled question",
        "markdown": "\n".join(body_lines),
        "citation_pack": {
            "answer": f"{VERIFY}: one-line answer",
            "key_facts": [f"{VERIFY}: key fact — {s.get('url','')}" for s in sources[:3]] or [f"{VERIFY}: key fact"],
            "quotable": f"{VERIFY}: quotable sentence",
        },
        "faq": faq,
        "at_a_glance": [],
        "highlights": [],
        "verify_flags": ["전체 본문 검토 필요(무료 폴백)"],
        "sources": sources,
        "used_llm": False,
    }


def enforce_verify(result: dict, pack: dict) -> dict:
    """가짜 URL 제거(sanitize) + [VERIFY] 마커 시 verify_flags 보장 + 출처 없는 위험 표현 경고(비파괴)."""
    result = sanitize_urls(result, pack)
    flags = list(result.get("verify_flags") or [])
    md = result.get("markdown") or ""
    cp = result.get("citation_pack") or {}
    blob = " ".join([md, cp.get("answer", ""), cp.get("quotable", ""),
                     " ".join(cp.get("key_facts", []) or [])])
    if VERIFY in blob and not flags:
        flags.append("[VERIFY] 표시된 부분을 사실로 확인/교체하세요.")
    # 출처가 하나도 없는데 가격·날짜·비자 등 위험 표현이 있으면 경고
    if not (pack.get("sources")) and _RISKY.search(blob):
        flags.append("출처 없이 가격/날짜/비자 등 단정이 있어요 — 사실 확인 필요.")
    result["verify_flags"] = flags
    return result


def synthesize(question: str, pack: dict, client, cfg=None, page_type: str = "practical",
               question_type: str = "supporting") -> dict:
    """증거 묶음 → 영어 글(JSON). gpt-4o 1콜. 키없음/실패 → 무료 폴백. 성공 시 bump_usage(1).
    page_type 으로 §14 섹션 골격, question_type 으로 범위(개요/직답/FAQ) 규칙을 프롬프트에 주입(출력 JSON 형태 동일)."""
    cfg = cfg or config
    q = (question or "").strip()
    if client is None:
        return enforce_verify(template_markdown(q, pack), pack)
    try:
        last_updated = _now_ym()
        resp = client.chat.completions.create(
            model=getattr(cfg, "SYNTH_MODEL", "gpt-4o"),
            messages=[{"role": "system",
                       "content": _system_prompt(last_updated, page_type, question_type, q)},
                      {"role": "user", "content": _evidence_payload(q, pack)}],
            response_format={"type": "json_object"}, temperature=0.4, max_tokens=2200)
        data = json.loads(resp.choices[0].message.content or "{}")
        usage.bump_usage(1)
        out = {
            "error": "",
            "title": str(data.get("title") or q).strip(),
            "markdown": str(data.get("markdown") or "").strip(),
            "citation_pack": data.get("citation_pack") or {},
            "at_a_glance": [g for g in (data.get("at_a_glance") or [])
                            if isinstance(g, dict) and g.get("label") and g.get("value")][:4],
            "highlights": [str(h).strip() for h in (data.get("highlights") or []) if str(h).strip()][:4],
            "faq": [f for f in (data.get("faq") or []) if isinstance(f, dict) and f.get("q")],
            "verify_flags": [str(v).strip() for v in (data.get("verify_flags") or []) if str(v).strip()],
            "verdict": str(data.get("verdict") or "").strip(),
            "goodFor": [str(x).strip() for x in (data.get("goodFor") or []) if str(x).strip()][:4],
            "notFor": [str(x).strip() for x in (data.get("notFor") or []) if str(x).strip()][:3],
            "alternatives": [str(x).strip() for x in (data.get("alternatives") or []) if str(x).strip()][:3],
            "priceFactors": [str(x).strip() for x in (data.get("priceFactors") or []) if str(x).strip()][:4],
            "steps": [str(x).strip() for x in (data.get("steps") or []) if str(x).strip()][:6],
            "topPick": str(data.get("topPick") or "").strip(),
            "criteria": [str(x).strip() for x in (data.get("criteria") or []) if str(x).strip()][:4],
            "buyLocations": [str(x).strip() for x in (data.get("buyLocations") or []) if str(x).strip()][:5],
            "productGroups": [str(x).strip() for x in (data.get("productGroups") or []) if str(x).strip()][:5],
            "sources": pack.get("sources") or [],
            "last_updated": last_updated,
            "used_llm": True,
        }
        if not out["markdown"]:
            return enforce_verify(template_markdown(q, pack), pack)
        return enforce_verify(out, pack)
    except Exception as e:  # noqa: BLE001
        out = template_markdown(q, pack)
        out["error"] = f"(합성 실패 — 무료 초안으로 대체: {str(e)[:60]})"
        return enforce_verify(out, pack)
