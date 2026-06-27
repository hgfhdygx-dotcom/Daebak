# -*- coding: utf-8 -*-
"""
outputs.py — 생성한 글 영구 레지스트리 + 상태머신 (발행 감사추적)
=================================================================
글 하나(=slug)를 outputs.json 에 상태와 함께 영구 저장. 새로고침해도 안 사라짐.
상태: generated(생성) → approved(승인) → published(발행) → archived(보관) + failed(실패).
geo-tracker/outputs.py 패턴 이식(단, campaigns 의존 제거 — slug 키).
순수 I/O(LLM·네트워크 0) · 절대 예외 안 던짐(storage 가 보장).
"""

from __future__ import annotations

import config
import storage

KINDS = ("answer",)
STATUS_LABEL = {"generated": "생성됨", "approved": "승인됨", "published": "발행됨",
                "failed": "발행 실패", "archived": "보관", "needs_update": "갱신 필요"}
STATUS_BADGE = {"generated": "🟡", "approved": "🟢", "published": "✅", "failed": "🔴",
                "archived": "⚪", "needs_update": "🟠"}
ALLOWED = {
    "generated": {"approved", "archived", "failed"},
    "approved": {"published", "generated", "archived", "failed"},
    "published": {"archived", "failed", "needs_update"},
    "failed": {"generated", "approved", "archived"},
    "archived": {"generated", "approved"},
    "needs_update": {"generated", "approved", "published", "archived", "failed"},
}
# 클러스터 CMS 추가 필드(§10) — 발행 레코드에 함께 보관(필터/측정/허브 카운트용)
_META_KEYS = ("bigCategory", "bigCategorySlug", "cluster", "clusterSlug", "pillarSlug",
              "pillarQuestion", "questionType", "pageType", "publishMode", "needsFreshSource",
              "geoScore", "answerSummary", "measurementTargets", "plan_id")
_EDITABLE = {"title", "question", "published_url", "live_url", "error", "mode", "memo",
             "verify_count", "engine"} | set(_META_KEYS)


def _path() -> str:
    return getattr(config, "OUTPUTS_FILE", "outputs.json")


def load_outputs() -> list:
    items, _ = storage.safe_load_list(_path())
    return items


def _save(items):
    return storage.safe_save_json(_path(), items)


def get_by_id(output_id: str) -> dict | None:
    return next((x for x in load_outputs() if x.get("output_id") == output_id), None)


def get_by_slug(slug: str) -> dict | None:
    return next((x for x in load_outputs() if x.get("slug") == slug), None)


def upsert_generation(slug, question, title, engine="", verify_count=0, meta=None) -> dict:
    """생성 결과 적재(slug 로 upsert). 이미 있으면 제목/질문/메타 갱신·상태 안 내림(승인/발행 보존).
    meta: 택소노미/pageType/publishMode/geoScore/measurementTargets 등 §10 추가 필드."""
    items = load_outputs()
    now = storage.now_kst().isoformat(timespec="seconds")
    rec = next((x for x in items if x.get("slug") == slug), None)
    if rec:
        rec["title"] = title or rec.get("title", "")
        rec["question"] = question or rec.get("question", "")
        rec["engine"] = engine or rec.get("engine", "")
        rec["verify_count"] = int(verify_count)
        for k in _META_KEYS:
            if meta and k in meta and meta[k] is not None:
                rec[k] = meta[k]
        rec["updated_at"] = now
        _save(items)
        return rec
    rec = {
        "output_id": storage.next_seq_id(items, "OUT", "output_id", 4),
        "slug": slug, "kind": "answer", "question": question, "title": title or "",
        "engine": engine, "verify_count": int(verify_count),
        "status": "generated", "created_at": now, "updated_at": now,
        "approved_at": "", "published_at": "", "published_url": "", "live_url": "",
        "mode": "", "memo": "", "error": "",
        "bigCategory": "", "bigCategorySlug": "", "cluster": "", "clusterSlug": "",
        "pillarSlug": "", "pillarQuestion": "", "questionType": "", "pageType": "",
        "publishMode": "auto", "needsFreshSource": True, "geoScore": None,
        "answerSummary": "", "measurementTargets": [], "plan_id": "",
        "history": [{"ts": now, "from": "", "to": "generated"}],
    }
    for k in _META_KEYS:
        if meta and k in meta and meta[k] is not None:
            rec[k] = meta[k]
    items.append(rec)
    _save(items)
    return rec


def set_status(output_id, new_status, fields=None):
    """상태 전이(검증 + history) + 필드 갱신. (ok, msg, rec)."""
    items = load_outputs()
    t = next((x for x in items if x.get("output_id") == output_id), None)
    if not t:
        return False, "출력물을 찾을 수 없습니다.", None
    cur = t.get("status", "generated")
    now = storage.now_kst().isoformat(timespec="seconds")
    if new_status and new_status != cur:
        if new_status not in ALLOWED.get(cur, set()):
            return False, (f"'{STATUS_LABEL.get(cur, cur)}'에서 "
                           f"'{STATUS_LABEL.get(new_status, new_status)}'(으)로는 바꿀 수 없어요."), None
        t.setdefault("history", []).append({"ts": now, "from": cur, "to": new_status})
        t["status"] = new_status
        if new_status == "approved":
            t["approved_at"] = now
        if new_status == "published":
            t["published_at"] = now
    t["updated_at"] = now
    for k, v in (fields or {}).items():
        if k in _EDITABLE:
            t[k] = storage.clip(v, 500) if k in ("published_url", "live_url") else v
    ok, msg = _save(items)
    return ok, msg, t


def record_publish(output_id, live_url, mode="git_pushed"):
    """발행됨 + 라이브 URL + 모드 저장."""
    return set_status(output_id, "published", fields={"published_url": live_url, "live_url": live_url, "mode": mode})


def list_outputs(*, status=None, exclude_archived=False) -> list:
    out = []
    for x in load_outputs():
        if status and x.get("status") != status:
            continue
        if exclude_archived and x.get("status") == "archived":
            continue
        out.append(x)
    out.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return out


def status_counts() -> dict:
    c = {k: 0 for k in STATUS_LABEL}
    for x in load_outputs():
        if x.get("status") in c:
            c[x["status"]] += 1
    return c
