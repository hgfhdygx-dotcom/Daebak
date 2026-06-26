# -*- coding: utf-8 -*-
"""
usage.py — 비용가드의 심장: 호출 수 누적 + 일/월 한도 + 비용 추정
=================================================================
geo-tracker/geo_tracker.py 의 load/save_usage·month_usage·per_call_usd·estimate 이식 +
이 파이프라인용 estimate_pipeline_cost(글 1편 예상비용)·bump_usage(호출당 +1).

규칙: **성공한 LLM/검색 호출 1건당 정확히 bump_usage(1)**. 503/타임아웃 실패는 미차감.
원자적 저장(storage). usage_log.json = { "YYYY-MM-DD": n }.
"""

from __future__ import annotations

from datetime import datetime

import config
import storage
from llm import KST


def load_usage() -> dict:
    return storage.safe_load_json(config.USAGE_LOG, {}) or {}


def save_usage(usage: dict) -> None:
    storage.safe_save_json(config.USAGE_LOG, usage)


def bump_usage(n: int = 1) -> None:
    """오늘 날짜 호출 수 += n (성공 호출 1건당 1회). 원자적 저장."""
    usage = load_usage()
    tk = datetime.now(KST).strftime("%Y-%m-%d")
    usage[tk] = int(usage.get(tk, 0)) + int(n)
    save_usage(usage)


def month_usage(usage: dict | None = None, now=None) -> int:
    usage = load_usage() if usage is None else usage
    ym = (now or datetime.now(KST)).strftime("%Y-%m")
    return sum(int(v) for k, v in (usage or {}).items()
               if isinstance(v, (int, float)) and str(k).startswith(ym))


def today_usage(usage: dict | None = None) -> int:
    usage = load_usage() if usage is None else usage
    tk = datetime.now(KST).strftime("%Y-%m-%d")
    return int(usage.get(tk, 0))


def remaining() -> dict:
    """남은 한도 — {day, month}. 음수는 0으로."""
    usage = load_usage()
    day = max(0, int(getattr(config, "DAILY_LIMIT", 50)) - today_usage(usage))
    month = max(0, int(getattr(config, "MONTHLY_LIMIT", 1000)) - month_usage(usage))
    return {"day": day, "month": month}


def per_call_usd(engine: str) -> float:
    """리서치 검색 1회 대략 단가(엔진별). geo-tracker per_call_usd 이식."""
    if engine == "perplexity":
        return float(config.PERPLEXITY_USD_PER_CALL)
    if engine == "gemini":
        return float(getattr(config, "GEMINI_USD_PER_CALL", 0.006))
    eco = bool(getattr(config, "ECONOMY_MODE", False))
    tokens = int(config.EST_TOKENS_PER_CALL)
    cap = getattr(config, "OPENAI_MAX_OUTPUT_TOKENS", None)
    if cap:
        tokens = min(tokens, int(cap) + 400)
    price = float(getattr(config, "OPENAI_MINI_USD_PER_1M_TOKENS", 0.6)) if eco \
        else float(config.OPENAI_USD_PER_1M_TOKENS)
    return float(config.WEB_SEARCH_USD_PER_CALL) + tokens / 1_000_000 * price


def estimate_pipeline_cost(engine: str | None = None) -> dict:
    """글 1편 예상비용(LLM 호출 0 — 단가 계산만). 미리보기/dry-run에서 발행 전 표시.
    구성: 하위질문 1콜(싸게) + (1+MAX_SUBQS) 검색 + 합성 1 + SEO 1."""
    engine = engine or getattr(config, "RESEARCH_ENGINE", "openai")
    n_sub = int(getattr(config, "MAX_SUBQS", 4))
    search_calls = 1 + n_sub                      # 원질문 + 하위질문 (상한)
    subq_usd = float(getattr(config, "SEO_USD_PER_CALL", 0.002))   # 하위질문 생성(gpt-4o-mini)
    search_usd = per_call_usd(engine) * search_calls
    synth_usd = float(getattr(config, "SYNTH_USD_PER_CALL", 0.03))
    seo_usd = float(getattr(config, "SEO_USD_PER_CALL", 0.002))
    usd = subq_usd + search_usd + synth_usd + seo_usd
    total_calls = 1 + search_calls + 1 + 1        # subq + 검색들 + 합성 + seo
    return {
        "engine": engine,
        "total_calls": total_calls,
        "search_calls": search_calls,
        "usd": usd,
        "krw": usd * float(config.USD_TO_KRW),
        "breakdown": {
            "subq_usd": subq_usd, "search_usd": search_usd,
            "synth_usd": synth_usd, "seo_usd": seo_usd,
        },
    }
