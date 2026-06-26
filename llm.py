# -*- coding: utf-8 -*-
"""
llm.py — API 키 + 클라이언트 (OpenAI / Perplexity / Gemini)
===========================================================
geo-tracker/geo_tracker.py 의 get_api_key / make_client 패턴 이식.
키는 .env(python-dotenv). 형식 검증 + 따옴표·공백 제거. Gemini는 지연 import.
"""

from __future__ import annotations

import os
from datetime import timedelta, timezone

from dotenv import load_dotenv

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

import config

load_dotenv()                       # .env → 환경변수 (있으면)
load_dotenv(".env.local")           # 로컬 오버라이드(있으면)

KST = timezone(timedelta(hours=9))


def _clean(v: str) -> str:
    return (v or "").strip().strip('"').strip("'")


def get_api_key_silent(engine: str = "openai") -> str:
    """키가 있으면 반환, 없거나 형식 이상이면 '' (sys.exit 안 함). 웹앱/선택적 사용처용."""
    if engine == "gemini":
        key = _clean(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "")
        return key if (key.startswith("AQ.") or key.startswith("AIza")) else ""
    name, prefix = ("PERPLEXITY_API_KEY", "pplx-") if engine == "perplexity" else ("OPENAI_API_KEY", "sk-")
    key = _clean(os.getenv(name) or "")
    return key if key.startswith(prefix) else ""


def get_api_key(engine: str = "openai") -> str:
    """키 반환 또는 RuntimeError(웹앱에서 잡아 안내). CLI가 아니라 예외로(앱이 죽지 않게)."""
    key = get_api_key_silent(engine)
    if key:
        return key
    hint = {
        "gemini": "GEMINI_API_KEY (AQ. 또는 AIza 로 시작)",
        "perplexity": "PERPLEXITY_API_KEY (pplx- 로 시작)",
    }.get(engine, "OPENAI_API_KEY (sk- 로 시작)")
    raise RuntimeError(f"{hint} 가 .env 에 없습니다. 키입력.bat 으로 넣어주세요.")


def github_token() -> str:
    """발행(git push)용 GitHub 토큰(.env GITHUB_TOKEN). 없으면 ''."""
    return _clean(os.getenv("GITHUB_TOKEN") or "")


def indexnow_key() -> str:
    """IndexNow 색인 키(.env INDEXNOW_KEY). 없으면 ''."""
    return _clean(os.getenv("INDEXNOW_KEY") or "")


def make_client(engine: str, key: str):
    """엔진별 클라이언트(타임아웃 포함). geo-tracker make_client 이식."""
    to = float(getattr(config, "API_TIMEOUT", 60) or 60)
    if engine == "perplexity":
        return OpenAI(api_key=key, base_url="https://api.perplexity.ai", timeout=to, max_retries=2)
    if engine == "gemini":
        try:
            from google import genai
            from google.genai import types
        except ImportError as e:  # pragma: no cover
            raise RuntimeError("google-genai 패키지가 없습니다. 설치.bat 을 다시 실행하세요.") from e
        try:
            return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=int(to * 1000)))
        except Exception:  # noqa: BLE001 — 구버전 genai는 http_options 미지원
            return genai.Client(api_key=key)
    return OpenAI(api_key=key, timeout=to, max_retries=2)


def effective_openai_model() -> str:
    """절약 모드면 싼 모델, 아니면 설정 모델 (리서치 web_search용)."""
    if bool(getattr(config, "ECONOMY_MODE", False)):
        return getattr(config, "ECONOMY_OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini"
    return config.OPENAI_MODEL
