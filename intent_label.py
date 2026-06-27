# -*- coding: utf-8 -*-
"""
intent_label.py — 의도 → 대문자 표시 라벨 (운영 콘솔/표 공용, Python 측)
========================================================================
site/lib/cardIntent.ts 의 키워드 규칙을 Python 으로 이식. 특정 질문/장소 하드코딩 없음 —
intent(분류기 자유텍스트) + question + pageType + questionType 만 보고 라벨을 만든다.
반환 예: MAIN GUIDE / CHEAPEST / FASTEST / WORTH IT / COST / ROUTE / COMPARISON / HOW TO /
BEST PICK / WHERE TO BUY / WHAT TO BUY / <CAT> GUIDE / GENERAL GUIDE.
순수(LLM·네트워크 0).
"""

from __future__ import annotations

import re

# 순서 = 우선순위(첫 매치). 거래의도 → 비교/방법 → 비용. EN+KR 방어 매칭.
_RULES = [
    ("WORTH IT", re.compile(r"\bworth (it|the|a)\b|is it worth|값어치|가치(가| )?있|탈\s*만", re.I)),
    ("CHEAPEST", re.compile(r"\b(cheapest|cheaper|cheap|budget|low[-\s]?cost|save money)\b|저렴|가성비|최저", re.I)),
    ("FASTEST", re.compile(r"\b(fastest|quickest)\b|가장\s*빠른|최단", re.I)),
    ("WHERE TO BUY", re.compile(r"\bwhere (to|can i|do i) (buy|get|find|purchase|shop)\b|어디서\s*(사|파|구입|구매)", re.I)),
    ("WHAT TO BUY", re.compile(r"\bwhat (to|should i) (buy|get|bring back)\b|\bwhat to buy\b|뭐(를)?\s*(사|살)|무엇을\s*사", re.I)),
    ("BEST PICK", re.compile(r"\b(best|top|recommended|recommend|must[-\s]?(try|buy|visit|eat))\b|추천|베스트|최고", re.I)),
    ("COMPARISON", re.compile(r"\s\bvs\b\s|versus|\bcompare\b|어느\s*것|비교", re.I)),
    ("HOW TO", re.compile(r"\bhow (do|to|can)\b|방법|어떻게", re.I)),
    ("COST", re.compile(r"\b(how much|price|prices|cost|costs|fare|fares|fee|fees)\b|요금|비용|가격|얼마", re.I)),
]
_PAGETYPE = {"route": "ROUTE", "comparison": "COMPARISON", "price": "COST",
             "planning": "PLAN", "list": "TOP PICKS", "safety": "WATCH OUT", "visa": "VISA"}


def label(intent: str = "", question: str = "", page_type: str = "",
          question_type: str = "", big_category: str = "") -> str:
    """데이터만 보고 대문자 의도 라벨. pillar=MAIN GUIDE, faq=FAQ, 그 외 키워드→pageType→카테고리 폴백."""
    qt = (question_type or "").strip().lower()
    if qt == "faq":
        return "FAQ"
    if qt == "pillar":
        return "MAIN GUIDE"
    hay = f"{question or ''} {intent or ''}".strip()
    for lab, rx in _RULES:
        if rx.search(hay):
            return lab
    pt = (page_type or "").strip().lower()
    if pt in _PAGETYPE:
        return _PAGETYPE[pt]
    big = (big_category or "").strip()
    return f"{big.upper()} GUIDE" if big else "GENERAL GUIDE"
