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
import usage
from llm import KST

VERIFY = "[VERIFY]"

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


def _now_ym() -> str:
    return datetime.now(KST).strftime("%Y-%m")


def _system_prompt(last_updated: str) -> str:
    tells = "; ".join(AI_TELLS)
    return (
        "You write English answer articles for foreigners (living in or visiting Korea) so that AI search "
        "engines (ChatGPT, Gemini, Perplexity) will CITE them. Use ONLY the facts in the provided research. "
        "You are precise, neutral, and never invent anything.\n"
        "\n"
        "WRITE THE ARTICLE USING THESE PROVEN RULES (follow every one):\n"
        "1. ANSWER-FIRST + MIRROR (D/F-2): The very first sentence directly answers the user's question, "
        "mirroring the question's own wording. No throat-clearing, no 'In this article'.\n"
        "2. CITATION PACK (P): Provide a top box: a one-line answer, 2-4 key facts (each with its source URL "
        "from the research), and one short quotable sentence a person could copy verbatim.\n"
        "3. SELF-CONTAINED CHUNKS (D-2): Every H2 section opens with a 2-4 sentence paragraph that makes full "
        "sense out of context. Start paragraphs with concrete nouns, NOT pronouns like 'It' or 'This'.\n"
        "4. EVIDENCE LADDER (S): Back claims with specifics from the research. Prefer verifiable facts "
        "(dates, numbers, official sources) over adjectives. Do not stack bare adjectives.\n"
        "5. CITATION SAFETY (E): Use ONLY facts present in the research. NEVER invent prices, fees, dates, "
        f"deadlines, statistics, names, or awards. If a needed fact is not in the research, write the tag "
        f"'{VERIFY}' in place and add a short note to verify_flags. Better to flag than to guess.\n"
        "6. FAQ (C-2): End with an FAQ that answers each sub-question as a direct Q/A block (question as the "
        "subheading, the answer in the first sentence).\n"
        "7. HUMAN TONE: Sound like a knowledgeable human editor, NOT like AI. Avoid these AI-tell phrases: "
        f"{tells}. No marketing fluff, no 'in conclusion'.\n"
        "8. FRESHNESS: Treat the content as current as of " + last_updated + ".\n"
        "\n"
        "OUTPUT STRICT JSON ONLY with this shape:\n"
        "{\n"
        '  "title": "<concise, answer-style title, no year>",\n'
        '  "markdown": "<the article BODY in GitHub Markdown: ## H2 sections, short paragraphs, bullet '
        'lists or a small table where useful. Do NOT include the H1 title or the citation pack or the FAQ '
        'here — those are separate fields.>",\n'
        '  "citation_pack": {"answer": "<one line>", "key_facts": ["<fact> — <source url>", "..."], '
        '"quotable": "<one copy-pasteable sentence>"},\n'
        '  "faq": [{"q": "<sub-question>", "a": "<direct first-sentence answer>"}],\n'
        '  "verify_flags": ["<short note of each thing the human must verify>"]\n'
        "}\n"
        "Every key_fact should map to a source URL that appears in the research sources. If you have no "
        "source for a fact, do not include it as a key_fact."
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
        "verify_flags": ["전체 본문 검토 필요(무료 폴백)"],
        "sources": sources,
        "used_llm": False,
    }


def enforce_verify(result: dict, pack: dict) -> dict:
    """[VERIFY] 마커가 본문에 있으면 verify_flags 보장 + 출처 없는 위험 표현 경고(비파괴)."""
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


def synthesize(question: str, pack: dict, client, cfg=None) -> dict:
    """증거 묶음 → 영어 글(JSON). gpt-4o 1콜. 키없음/실패 → 무료 폴백. 성공 시 bump_usage(1)."""
    cfg = cfg or config
    q = (question or "").strip()
    if client is None:
        return enforce_verify(template_markdown(q, pack), pack)
    try:
        last_updated = _now_ym()
        resp = client.chat.completions.create(
            model=getattr(cfg, "SYNTH_MODEL", "gpt-4o"),
            messages=[{"role": "system", "content": _system_prompt(last_updated)},
                      {"role": "user", "content": _evidence_payload(q, pack)}],
            response_format={"type": "json_object"}, temperature=0.4, max_tokens=2200)
        data = json.loads(resp.choices[0].message.content or "{}")
        usage.bump_usage(1)
        out = {
            "error": "",
            "title": str(data.get("title") or q).strip(),
            "markdown": str(data.get("markdown") or "").strip(),
            "citation_pack": data.get("citation_pack") or {},
            "faq": [f for f in (data.get("faq") or []) if isinstance(f, dict) and f.get("q")],
            "verify_flags": [str(v).strip() for v in (data.get("verify_flags") or []) if str(v).strip()],
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
