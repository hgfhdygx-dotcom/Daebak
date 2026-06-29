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
MAX_SUBQS = 6                              # 하위질문 상한(질문 그림자) — 깊이 위해 상향(비용 약간↑)

# ⏱️ API 호출 타임아웃(초). 없으면 SDK 기본(최대 10분)이 멈춘 듯 잡아둠.
API_TIMEOUT = 60

# 💸 절약 모드: 켜면 OpenAI 리서치를 싼 모델(gpt-4o-mini)로.
ECONOMY_MODE = False
ECONOMY_OPENAI_MODEL = "gpt-4o-mini"
OPENAI_MAX_OUTPUT_TOKENS = None           # 답변 길이 상한(토큰). None=제한없음.


# ══════════════════════════════════════════════════════════════════════════
#  💰 비용 폭주 방지 (보수적 기본값)
# ══════════════════════════════════════════════════════════════════════════
ENFORCE_CALL_LIMITS = False               # 나만 씀 → 호출 한도 차단·'남은 한도' 끔. True 면 아래 한도 적용.
DAILY_LIMIT = 50                          # (ENFORCE_CALL_LIMITS=True 일 때만) 하루 최대 호출 수.
MONTHLY_LIMIT = 1000                      # (ENFORCE_CALL_LIMITS=True 일 때만) 한 달 최대 호출 수.
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
#  🗂️ 클러스터 CMS — 택소노미 · 기획 큐 · 리서치팩 · 배치 · GEO 검사
#  (질문→분류→Research Pack→5개 batch→GEO 검사→발행. ai가 좋아하는 글.md = 검사 규칙)
# ══════════════════════════════════════════════════════════════════════════
SITE_TAXONOMY_REL = "content/taxonomy.json"   # SITE_DIR 기준. 사이트 빌드도 같은 파일을 읽음(수동 편집 영구 파일).
PLAN_FILE = "plan.json"                        # 분류했지만 아직 생성 안 한 질문 기획 큐(plan.py)
RESEARCH_PACK_DIR = "research_packs"           # 클러스터 단위 Research Pack 폴더(research_packs/<clusterSlug>.json)
CLASSIFY_MODEL = "gpt-4o-mini"                 # 질문 자동 분류(싸게 — 20~30개 1콜)
DEDUPE_MODEL = "gpt-4o-mini"                   # 중복 경계(0.40~0.55) 케이스만 yes/no 판정(싸게)

# 배치 규칙(§8): 키=batch size. 20 = 기획/분류 전용 → 완성 글 생성 하드 차단.
BATCH_SIZES = [1, 3, 5, 10, 20]
BATCH_DEFAULT = 5
BATCH_PLANNING_ONLY = 20                       # 이 크기로는 완성 글 생성 불가(planning only)

# GEO 검사 점수 게이트(§16): ≥READY ready / ≥MINOR minor edits / 미만 rewrite. <READY면 자동발행 차단.
GEO_READY_MIN = 90
GEO_MINOR_MIN = 75

# 리서치팩 신선도(일) — 지나면 UI가 재리서치 물음(자동 갱신 안 함)
PACK_TTL_DAYS_DEFAULT = 30
PACK_TTL_DAYS_SENSITIVE = 7


# ══════════════════════════════════════════════════════════════════════════
#  🌐 발행 사이트 (site/ = Next.js 콘텐츠 사이트)
# ══════════════════════════════════════════════════════════════════════════
SITE_DIR = "site"                         # Next.js 사이트 폴더(이 repo 안)
SITE_CONTENT_DIR = "content/answers"      # site/ 기준 MDX가 저장될 폴더
SITE_URL = ""                             # 배포된 사이트 주소(예: https://my-answers.vercel.app). 웹앱에서 저장.
AUTHOR_NAME = "Editorial Team"            # E-E-A-T(작성자) — 웹앱에서 본인 이름으로
AUTHOR_BIO = "We research practical questions for foreigners living in or visiting Korea, citing primary sources."

# 💰 수익화(피벗) — Entity/Buying-Guide 페이지의 제휴 고지 기본 문구. 페이지에 monetization 있을 때만 표시.
# 광고처럼 과하게 X, 신뢰 우선. 웹앱에서 바꿀 수 있음(settings.json).
AFFILIATE_DISCLOSURE_TEXT = "Some links are affiliate links — if you buy through them, Daebak may earn a small commission at no extra cost to you. It never changes our picks, facts, or sources."

# ❓ 질문 인박스(Supabase) — 사이트(/api/ask)가 외국인 질문을 저장, admin 이 읽고 답변/발행 관리.
# service_role 키는 admin(서버) 전용. 같은 값을 Vercel 프로젝트 env 에도 넣어야 사이트 제출이 동작.
SUPABASE_URL = ""
SUPABASE_SERVICE_KEY = ""
# 📧 답변 발행 시 이메일 알림(선택, Resend). 없어도 사이트/admin 안 깨짐(수동 상태변경 가능).
EMAIL_PROVIDER = "resend"
RESEND_API_KEY = ""
QUESTION_FROM_EMAIL = ""
QUESTION_NOTIFY_EMAIL = ""          # (선택) 새 질문 알림 받을 내 이메일
QUESTION_WEBHOOK_URL = ""           # (선택) 새 질문 웹훅(Discord/Slack 등) — 사이트 env 에도 넣으면 즉시 알림

# 🖼 이미지(Unsplash) — bigCategory/cluster 대표 비주얼. hotlink(로컬 저장 X) + photographer attribution + Apply 시 download trigger.
# ACCESS_KEY는 서버(admin) 전용. 키는 .env(.local) 또는 웹앱(Image Manager)에서 저장 → settings.json.
UNSPLASH_ACCESS_KEY = ""
UNSPLASH_SECRET_KEY = ""          # OAuth용(현재 미사용, 미래 대비 자리만 유지)
UNSPLASH_APP_NAME = "daebak"
UNSPLASH_API_BASE = "https://api.unsplash.com"

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
              "INDEXNOW_DRY_RUN", "UNSPLASH_ACCESS_KEY", "UNSPLASH_SECRET_KEY",
              "UNSPLASH_APP_NAME", "UNSPLASH_API_BASE", "AFFILIATE_DISCLOSURE_TEXT",
              "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "EMAIL_PROVIDER", "RESEND_API_KEY",
              "QUESTION_FROM_EMAIL", "QUESTION_NOTIFY_EMAIL", "QUESTION_WEBHOOK_URL"):
        if k in s and s[k] is not None:
            g[k] = s[k]


_load_user_settings()

# .env(.local) 폴백 — settings.json 에 없을 때만. (ACCESS_KEY는 admin 서버 전용 — site/client 번들에 절대 노출 안 됨)
import os as _os_env
if not UNSPLASH_ACCESS_KEY:
    UNSPLASH_ACCESS_KEY = _os_env.getenv("UNSPLASH_ACCESS_KEY", "")
if not UNSPLASH_SECRET_KEY:
    UNSPLASH_SECRET_KEY = _os_env.getenv("UNSPLASH_SECRET_KEY", "")
# 질문 인박스(Supabase)/이메일 — .env 폴백
for _qk in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "RESEND_API_KEY", "QUESTION_FROM_EMAIL",
            "QUESTION_NOTIFY_EMAIL", "QUESTION_WEBHOOK_URL"):
    if not globals().get(_qk):
        globals()[_qk] = _os_env.getenv(_qk, "")
