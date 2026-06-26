# -*- coding: utf-8 -*-
"""
config.py — foreign-qa 설정 (여기 값만 고치면 됩니다)
=====================================================
외국인이 묻는 영어 질문 1줄 → 리서치 → 본문 합성 → 영작·SEO → (미리보기·승인) → 내 사이트 발행.

★ API 키는 여기 넣지 말고 .env 에 (키입력.bat 사용). 코드를 안 고쳐도
   웹앱(app.py)에서 저장한 값(settings.json)이 자동 반영됩니다.

비용/한도/모델만 보수적으로 잡아두었습니다. 처음엔 그대로 쓰세요.
geo-tracker(측정 도구)의 검증된 비용·안전 패턴을 그대로 가져왔습니다(별 프로젝트 = 코드 이식).
"""

from __future__ import annotations

# ══════════════════════════════════════════════════════════════════════════
#  🔎 리서치(웹 검색) 엔진
# ══════════════════════════════════════════════════════════════════════════
RESEARCH_ENGINE = "openai"               # "openai"(기본·web_search) / "perplexity" / "gemini"
OPENAI_MODEL = "gpt-4o"                   # 리서치 web_search 모델
PERPLEXITY_MODEL = "sonar"
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite"]   # 503 과부하 시 한 호출 안에서 폴백
WEB_SEARCH_TOOL_TYPE = "web_search"       # OpenAI Responses 도구(폴백: web_search_preview)
USER_LOCATION = {"type": "approximate", "country": "KR", "city": "Seoul",
                 "region": "Seoul", "timezone": "Asia/Seoul"}

# ── 글 생성 모델 ──
SYNTH_MODEL = "gpt-4o"                     # 본문 합성(품질 중요)
SEO_MODEL = "gpt-4o-mini"                  # 제목·메타·슬러그(싸게)
SUBQ_MODEL = "gpt-4o-mini"                 # C-2 하위질문 fan-out(싸게)
MAX_SUBQS = 4                              # 하위질문 상한(질문 그림자) — 비용 안정

# ⏱️ API 호출 타임아웃(초). 없으면 SDK 기본(최대 10분)이 멈춘 듯 잡아둠.
API_TIMEOUT = 60

# 💸 절약 모드: 켜면 OpenAI 리서치를 싼 모델(gpt-4o-mini)로.
ECONOMY_MODE = False
ECONOMY_OPENAI_MODEL = "gpt-4o-mini"
OPENAI_MAX_OUTPUT_TOKENS = None           # 답변 길이 상한(토큰). None=제한없음.


# ══════════════════════════════════════════════════════════════════════════
#  💰 비용 폭주 방지 (보수적 기본값)
# ══════════════════════════════════════════════════════════════════════════
DAILY_LIMIT = 50                          # 하루 최대 LLM 호출 수(성공만 셈). 초과 시 실행 차단.
MONTHLY_LIMIT = 1000                      # 한 달 최대 호출 수(누적).
MAX_COST_PER_RUN_KRW = 10000             # 글 1편 예상비용 상한(원). 넘으면 차단(0=끔).
USD_TO_KRW = 1350.0
WEB_SEARCH_USD_PER_CALL = 0.01
EST_TOKENS_PER_CALL = 1500
OPENAI_USD_PER_1M_TOKENS = 5.0
OPENAI_MINI_USD_PER_1M_TOKENS = 0.6
PERPLEXITY_USD_PER_CALL = 0.005
GEMINI_USD_PER_CALL = 0.006
# 합성·SEO는 출력이 길어 토큰 비용을 별도 추정(대략치).
SYNTH_USD_PER_CALL = 0.03                 # gpt-4o 본문 1편(입력 evidence + 긴 출력) 대략
SEO_USD_PER_CALL = 0.002                  # gpt-4o-mini 제목/메타 1콜 대략

# 재시도 / 지수 백오프
MAX_RETRIES = 5
RETRY_WAIT = 2.0
RETRY_JITTER = 0.3


# ══════════════════════════════════════════════════════════════════════════
#  📂 파일 / 원장
# ══════════════════════════════════════════════════════════════════════════
USAGE_LOG = "usage_log.json"              # 날짜별 호출 수(하루/한달 한도 계산). 지우지 마세요.
OUTPUTS_FILE = "outputs.json"             # 생성한 글 영구 레지스트리 + 상태(생성→승인→발행)
SETTINGS_FILE = "settings.json"           # 웹앱에서 저장한 값(자동 반영)


# ══════════════════════════════════════════════════════════════════════════
#  🌐 발행 사이트 (site/ = Next.js 콘텐츠 사이트)
# ══════════════════════════════════════════════════════════════════════════
SITE_DIR = "site"                         # Next.js 사이트 폴더(이 repo 안)
SITE_CONTENT_DIR = "content/answers"      # site/ 기준 MDX가 저장될 폴더
SITE_URL = ""                             # 배포된 사이트 주소(예: https://my-answers.vercel.app). 웹앱에서 저장.
AUTHOR_NAME = "Editorial Team"            # E-E-A-T(작성자) — 웹앱에서 본인 이름으로
AUTHOR_BIO = "We research practical questions for foreigners living in or visiting Korea, citing primary sources."

# IndexNow(색인 가속) — 키는 .env(INDEXNOW_KEY) 또는 사이트키생성.bat 으로.
INDEXNOW_DRY_RUN = False                  # True면 실제 핑 안 하고 성공한 척(테스트)
INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",          # Bing/글로벌
    "https://searchadvisor.naver.com/indexnow",   # 네이버
]

# 발행 깃 푸시 — .git + origin + GITHUB_TOKEN(.env) 있으면 자동, 없으면 '파일만 저장' 폴백.
GIT_COMMIT_PREFIX = "publish: "


# ══════════════════════════════════════════════════════════════════════════
#  웹앱(app.py)에서 저장한 설정 자동 반영 (settings.json)
#  → .env 키와 별개로, SITE_URL·작성자·엔진 등을 코드 안 고치고 바꿀 수 있음.
# ══════════════════════════════════════════════════════════════════════════
def _load_user_settings():
    import json as _json
    import os as _os
    p = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), SETTINGS_FILE)
    if not _os.path.exists(p):
        return
    try:
        with open(p, encoding="utf-8") as f:
            s = _json.load(f)
    except Exception:  # noqa: BLE001
        return
    g = globals()
    for k in ("RESEARCH_ENGINE", "OPENAI_MODEL", "SYNTH_MODEL", "SEO_MODEL", "SUBQ_MODEL",
              "MAX_SUBQS", "ECONOMY_MODE", "DAILY_LIMIT", "MONTHLY_LIMIT", "MAX_COST_PER_RUN_KRW",
              "SITE_URL", "SITE_DIR", "SITE_CONTENT_DIR", "AUTHOR_NAME", "AUTHOR_BIO",
              "INDEXNOW_DRY_RUN"):
        if k in s and s[k] is not None:
            g[k] = s[k]


_load_user_settings()
