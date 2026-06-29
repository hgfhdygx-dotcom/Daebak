# -*- coding: utf-8 -*-
"""
plan.py — 기획 큐 레저 (분류했지만 아직 글로 생성 안 한 질문들)
================================================================
질문 묶음을 한 번에 기획/분류 → plan.json 에 보관 → 5개씩 batch 로 생성.
outputs.json(발행 감사추적)과 분리: plan 은 '생성 전 작업 큐', outputs 는 '생성/발행 기록'.
한 plan row 는 생성되면 outputs row 로 graduate 한다.

상태: planned → researched → generated → ready → published  (+ folded: 기존 pillar FAQ로 흡수해
페이지 안 만듦 · failed). 레코드 형태는 사용자 §10 글 데이터 구조에 정렬 + 기획용 필드(intent,
duplicateRisk, dedupeOf, dedupeAction).

순수 I/O(LLM·네트워크 0) · 절대 예외 안 던짐(storage 가 보장).
"""

from __future__ import annotations

import config
import storage

STATUS_LABEL = {
    "planned": "기획됨", "researched": "리서치됨", "generated": "생성됨",
    "ready": "발행 준비", "published": "발행됨", "folded": "흡수(FAQ)", "failed": "실패",
}
STATUS_BADGE = {
    "planned": "📝", "researched": "🔎", "generated": "🟡",
    "ready": "🟢", "published": "✅", "folded": "🔁", "failed": "🔴",
}
# 관대한 전이(워크플로 유연). 역행/재시도 허용.
ALLOWED = {
    "planned": {"researched", "generated", "ready", "folded", "failed"},
    "researched": {"generated", "ready", "planned", "folded", "failed"},
    "generated": {"ready", "published", "generated", "planned", "failed"},
    "ready": {"published", "generated", "planned", "failed"},
    "published": {"ready", "failed"},
    "folded": {"planned"},
    "failed": {"planned", "researched", "generated", "ready"},
}

QUESTION_TYPES = ("pillar", "supporting", "faq")
PAGE_TYPES = ("route", "comparison", "price", "planning", "practical", "list", "safety", "visa",
              "entity", "buying-guide")
DEDUPE_ACTIONS = ("", "faq", "supporting_link", "supporting_page", "separate")

_EDITABLE = {
    "title", "slug", "answerSummary", "bigCategory", "bigCategorySlug", "cluster", "clusterSlug",
    "pillarQuestion", "pillarSlug", "questionType", "pageType", "intent", "priority",
    "needsFreshSource", "publishMode", "relatedGuides", "supportingQuestions", "sourceRequirements",
    "duplicateRisk", "dedupeOf", "dedupeAction", "geoScore", "question", "tags", "featured",
}


def _path() -> str:
    return getattr(config, "PLAN_FILE", "plan.json")


def load_plan() -> list:
    items, _ = storage.safe_load_list(_path())
    return items


def _save(items):
    return storage.safe_save_json(_path(), items)


def delete(plan_id: str) -> bool:
    items = load_plan()
    rest = [x for x in items if x.get("plan_id") != plan_id]
    if len(rest) == len(items):
        return False
    _save(rest)
    return True


def delete_many(plan_ids) -> int:
    ids = set(plan_ids or [])
    items = load_plan()
    rest = [x for x in items if x.get("plan_id") not in ids]
    n = len(items) - len(rest)
    if n:
        _save(rest)
    return n


def _norm_q(s: str) -> str:
    return " ".join((s or "").strip().lower().split())


def get_by_id(plan_id: str) -> dict | None:
    return next((x for x in load_plan() if x.get("plan_id") == plan_id), None)


def get_by_slug(slug: str) -> dict | None:
    if not slug:
        return None
    return next((x for x in load_plan() if x.get("slug") == slug), None)


def get_by_question(question: str) -> dict | None:
    q = _norm_q(question)
    if not q:
        return None
    return next((x for x in load_plan() if _norm_q(x.get("question")) == q), None)


def _new_record(fields: dict, items: list) -> dict:
    now = storage.now_kst().isoformat(timespec="seconds")
    rec = {
        "plan_id": storage.next_seq_id(items, "PLN", "plan_id", 4),
        "question": "", "title": "", "slug": "", "answerSummary": "",
        "bigCategory": "", "bigCategorySlug": "", "cluster": "", "clusterSlug": "",
        "pillarQuestion": "", "pillarSlug": "",
        "questionType": "supporting", "pageType": "practical",
        "intent": "", "priority": 3, "needsFreshSource": True, "publishMode": "auto",
        "relatedGuides": [], "supportingQuestions": [], "sourceRequirements": [],
        "duplicateRisk": [], "dedupeOf": "", "dedupeAction": "", "geoScore": None,
        "status": "planned", "created_at": now, "updated_at": now,
        "history": [{"ts": now, "from": "", "to": "planned"}],
    }
    for k, v in (fields or {}).items():
        if k in _EDITABLE:
            rec[k] = v
    return rec


def _unique_slug(slug: str, items: list, exclude_id: str = "") -> str:
    """plan 내 slug 충돌 방지(서로 다른 질문이 같은 slug 가 되어도 별도 행 유지). slug, slug-2, slug-3…"""
    slug = (slug or "").strip() or "answer"
    used = {x.get("slug") for x in items if x.get("plan_id") != exclude_id and x.get("slug")}
    if slug not in used:
        return slug
    i = 2
    while f"{slug}-{i}" in used:
        i += 1
    return f"{slug}-{i}"


def upsert(fields: dict) -> dict:
    """질문(verbatim)으로 upsert — plan 행의 정체성은 '질문'이다(slug 아님). 같은 질문이면 갱신,
    다른 질문이면 새 행(서로 다른 질문이 같은 slug 로 분류돼도 별도 행 유지 + slug 자동 구분).
    상태는 보존(이미 진행됐으면 안 내림)."""
    items = load_plan()
    question = (fields or {}).get("question") or ""
    rec = next((x for x in items if _norm_q(x.get("question")) == _norm_q(question)), None) if question else None
    now = storage.now_kst().isoformat(timespec="seconds")
    if rec:
        for k, v in (fields or {}).items():
            if k in _EDITABLE:
                rec[k] = v
        if "slug" in (fields or {}):
            rec["slug"] = _unique_slug(fields.get("slug") or rec.get("slug"), items, rec.get("plan_id", ""))
        rec["updated_at"] = now
        _save(items)
        return rec
    fields = dict(fields or {})
    fields["slug"] = _unique_slug(fields.get("slug") or "", items)
    rec = _new_record(fields, items)
    items.append(rec)
    _save(items)
    return rec


def add_batch(rows: list) -> list:
    """분류 배치 결과를 한 번에 적재(질문별 upsert). 반환=적재된 레코드 목록."""
    out = []
    for r in (rows or []):
        out.append(upsert(r))
    return out


def set_status(plan_id: str, new_status: str, fields: dict | None = None):
    """상태 전이(검증 + history) + 필드 갱신. (ok, msg, rec)."""
    items = load_plan()
    t = next((x for x in items if x.get("plan_id") == plan_id), None)
    if not t:
        return False, "기획 항목을 찾을 수 없습니다.", None
    cur = t.get("status", "planned")
    now = storage.now_kst().isoformat(timespec="seconds")
    if new_status and new_status != cur:
        if new_status not in ALLOWED.get(cur, set()):
            return False, (f"'{STATUS_LABEL.get(cur, cur)}'에서 "
                           f"'{STATUS_LABEL.get(new_status, new_status)}'(으)로는 바꿀 수 없어요."), None
        t.setdefault("history", []).append({"ts": now, "from": cur, "to": new_status})
        t["status"] = new_status
    for k, v in (fields or {}).items():
        if k in _EDITABLE:
            t[k] = v
    t["updated_at"] = now
    ok, msg = _save(items)
    return ok, msg, t


def update_fields(plan_id: str, fields: dict):
    """상태 변경 없이 분류 필드만 수정(관리 화면 data_editor)."""
    return set_status(plan_id, "", fields)


def list_plan(*, status=None, cluster_slug=None) -> list:
    out = []
    for x in load_plan():
        if status and x.get("status") != status:
            continue
        if cluster_slug and x.get("clusterSlug") != cluster_slug:
            continue
        out.append(x)
    out.sort(key=lambda x: (x.get("clusterSlug", ""), -int(x.get("priority") or 0),
                            x.get("plan_id", "")))
    return out


def status_counts() -> dict:
    c = {k: 0 for k in STATUS_LABEL}
    for x in load_plan():
        if x.get("status") in c:
            c[x["status"]] += 1
    return c


def counts_by_cluster() -> dict:
    """clusterSlug → {status: n} (실시간 집계). 클러스터별 글 개수 보기용."""
    out: dict = {}
    for x in load_plan():
        cs = x.get("clusterSlug") or "(unassigned)"
        d = out.setdefault(cs, {k: 0 for k in STATUS_LABEL})
        if x.get("status") in d:
            d[x["status"]] += 1
    return out
