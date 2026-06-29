# -*- coding: utf-8 -*-
"""
questions.py — 익명 질문 인박스(Supabase) admin 클라이언트 + 이메일 알림(Resend) + 질문→draft 변환.
================================================================================
사이트(/api/ask)가 외국인 질문을 Supabase 에 저장 → admin 이 여기서 읽고 상태/답변/발행을 관리한다.
service_role 키는 admin(서버) 전용. 키 없으면 is_configured()=False 로 안전 폴백(앱 안 깨짐).
질문은 plan.upsert 로 콘텐츠 파이프라인(plan→generate→publish)에 연결된다.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request

import config


# ── Supabase REST ──────────────────────────────────────────────────────────
def is_configured() -> bool:
    return bool(getattr(config, "SUPABASE_URL", "") and getattr(config, "SUPABASE_SERVICE_KEY", ""))


def _base() -> str:
    u = (getattr(config, "SUPABASE_URL", "") or "").strip().rstrip("/")
    if u and not u.startswith(("http://", "https://")):
        u = "https://" + u
    return u


def _headers(extra: dict | None = None) -> dict:
    key = getattr(config, "SUPABASE_SERVICE_KEY", "")
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if extra:
        h.update(extra)
    return h


def _request(method: str, path: str, params: dict | None = None, body=None, extra_headers: dict | None = None):
    url = _base() + "/rest/v1/" + path
    if params:
        url += "?" + urllib.parse.urlencode(params, safe="*.")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=_headers(extra_headers))
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8")
        return (json.loads(raw) if raw else []), r.headers.get("content-range")


def list_questions(status: str | None = None, category: str | None = None,
                   search: str | None = None, limit: int = 300) -> list:
    if not is_configured():
        return []
    params = {"select": "*", "order": "created_at.desc", "limit": str(limit)}
    if status and status != "all":
        params["status"] = f"eq.{status}"
    if category and category != "all":
        params["category_guess"] = f"eq.{category}"
    if search:
        # 질문 본문 OR displayId 로 검색(예: "Question 000001", "000001", 키워드)
        params["or"] = f"(question.ilike.*{search}*,display_id.ilike.*{search}*)"
    try:
        rows, _ = _request("GET", "questions", params)
        return rows
    except Exception:  # noqa: BLE001
        return []


def new_count() -> int:
    """status=new 개수만 싸게(행 전송 없이 count) — 내비 배지용."""
    if not is_configured():
        return 0
    try:
        _, cr = _request("GET", "questions", {"status": "eq.new", "select": "id", "limit": "1"},
                         None, {"Prefer": "count=exact", "Range": "0-0"})
        return int(cr.split("/")[1]) if cr and "/" in cr else 0
    except Exception:  # noqa: BLE001
        return 0


def counts_by_status() -> dict:
    rows = list_questions(limit=1000)
    out: dict = {}
    for r in rows:
        s = r.get("status", "new")
        out[s] = out.get(s, 0) + 1
    out["_total"] = len(rows)
    out["_new"] = out.get("new", 0)
    return out


def update_question(qid: str, fields: dict) -> dict | None:
    if not is_configured():
        return None
    try:
        rows, _ = _request("PATCH", "questions", {"id": f"eq.{qid}"}, dict(fields),
                           {"Prefer": "return=representation"})
        return rows[0] if rows else None
    except Exception:  # noqa: BLE001
        return None


def status_url(token: str) -> str:
    base = (getattr(config, "SITE_URL", "") or "").rstrip("/")
    return f"{base}/questions/status/{token}" if base else f"/questions/status/{token}"


# ── 질문 → draft(plan) 변환: 콘텐츠 파이프라인 연결 ──────────────────────────
_CAT_SLUG = {
    "K-Beauty": "k-beauty", "Shopping Apps & Stores": "shopping",
    "Korean Brands & Products": "products", "Travel Essentials": "travel",
    "Local Shopping Places": "local-places", "Korean Snacks & Food": "food",
}


def suggest_conversion(q: dict) -> dict:
    """질문 → {title, pageType, category, categorySlug} 추정(휴리스틱). 실제 title 은 생성 시 seo 가 다듬음."""
    text = (q.get("question") or "").strip()
    low = text.lower()
    if " vs " in low or "compare" in low or "or " in low and "?" in low:
        page_type = "comparison"
    elif low.startswith("best ") or "what to buy" in low or "what should i buy" in low or "things to buy" in low:
        page_type = "buying-guide"
    elif low.startswith("what is") or low.startswith("can foreigners") or low.startswith("is ") or "how do i use" in low:
        page_type = "entity"
    else:
        page_type = "practical"
    cat = q.get("category_guess") or ""
    return {"title": text.rstrip("?").strip() or text, "pageType": page_type,
            "category": cat, "categorySlug": _CAT_SLUG.get(cat, "")}


def question_to_plan(q: dict) -> str | None:
    """질문을 plan 행으로 upsert(질문 verbatim 가 정체성). plan_id 반환 → question.answer_draft_id 에 저장."""
    import plan  # lazy
    s = suggest_conversion(q)
    fields = {
        "question": q.get("question", ""),
        "title": s["title"],
        "slug": "",  # plan 이 자동 부여
        "pageType": s["pageType"],
        "questionType": "supporting",
    }
    if s["category"]:
        fields["bigCategory"] = s["category"]
    if s["categorySlug"]:
        fields["bigCategorySlug"] = s["categorySlug"]
    rec = plan.upsert(fields)
    return rec.get("plan_id") if rec else None


# ── 이메일 알림(Resend, 선택) ───────────────────────────────────────────────
def email_configured() -> bool:
    return bool(getattr(config, "RESEND_API_KEY", "") and getattr(config, "QUESTION_FROM_EMAIL", ""))


def send_answer_email(q: dict) -> str:
    """답변 발행 후 호출. published_url + email 필요. 반환: sent|failed|skipped|not_configured."""
    if not email_configured():
        return "not_configured"
    to = (q.get("email") or "").strip()
    url = (q.get("published_url") or "").strip()
    if not to or not url:
        return "skipped"
    did = q.get("display_id") or ""
    body = {
        "from": config.QUESTION_FROM_EMAIL,
        "to": [to],
        "subject": "Daebak answered your Korea question" + (f" ({did})" if did else ""),
        "text": (
            "Hi, thanks for asking Daebak.\n\n"
            + (f"Your question ID: {did}\n\n" if did else "")
            + "We published an answer to your question:\n"
            f"{q.get('question', '')}\n\n"
            f"Read the answer here: {url}\n\n"
            f"You can also check your question status here: {status_url(q.get('public_token', ''))}\n"
        ),
    }
    try:
        req = urllib.request.Request(
            "https://api.resend.com/emails", data=json.dumps(body).encode("utf-8"), method="POST",
            headers={"Authorization": f"Bearer {config.RESEND_API_KEY}", "Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
        return "sent"
    except Exception:  # noqa: BLE001
        return "failed"
