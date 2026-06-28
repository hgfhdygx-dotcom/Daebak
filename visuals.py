# -*- coding: utf-8 -*-
"""
visuals.py — Unsplash 이미지 provider (bigCategory / cluster 대표 비주얼)
========================================================================
Unsplash API Guidelines 준수:
 · HOTLINK: 사진을 로컬에 다운로드하지 않고 Unsplash가 준 photo.urls(regular/small) URL을 그대로 site 에서 사용.
 · TRIGGER DOWNLOAD: 사용자가 Image Manager 에서 Apply 할 때만 photo.links.download_location 을 호출.
 · ATTRIBUTION: photographer + Unsplash + UTM 을 assignment 에 저장 → site 가 사진 근처에 표시.
대상은 bigCategory / cluster (+ hero). 작은 Q&A 카드에는 사용 안 함.
승인된 assignment 는 site/content/visuals.json 에 저장(= site 가 읽는 단일 소스). ACCESS_KEY 는 서버(admin) 전용.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import config
import storage

# 카테고리/클러스터별 editorial 검색어(taxonomy.visualQuery 가 있으면 그게 우선). 새 카테고리는 title 기반 자동.
_QUERY_BY_SLUG = {
    "travel": "Seoul Korea travel skyline Han River editorial",
    "food": "Korean food editorial table",
    "k-beauty": "Korean skincare products editorial",
    "k-fashion": "Korean fashion clothing racks editorial",
    "shopping": "Korea shopping store products editorial",
    "korean-rules": "Korea travel essentials payment subway card",
    "local-places": "Seoul neighborhood travel street editorial",
    "products": "Korean snacks convenience store",
    "airport-arrival": "airport terminal departure travel",
    "seoul-transport": "Seoul subway transport station Korea",
    "tmoney-wowpass-payments": "Korea subway card payment transit",
    "sim-esim-wifi-apps": "sim card smartphone travel",
    "seoul-stay-neighborhoods": "Seoul neighborhood street travel",
    "korea-itinerary-trip-length": "Seoul travel itinerary map Korea",
    "seasons-weather-packing": "Korea travel packing suitcase season",
    "safety-solo-travel": "Seoul safe street travel Korea",
    "language-culture-basics": "Korean signs menu language travel",
    "busan-jeju-day-trips": "Busan South Korea coast city",
    "food-basics": "Korean food banchan table editorial",
    "shopping-product-discovery": "Korea shopping store products editorial",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _site_file(*parts) -> str:
    return storage.abspath(os.path.join(config.SITE_DIR, *parts))


def _visuals_path() -> str:
    return _site_file("content", "visuals.json")


def load_visuals() -> dict:
    try:
        with open(_visuals_path(), encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def _save_visuals(store: dict) -> None:
    os.makedirs(os.path.dirname(_visuals_path()), exist_ok=True)
    with open(_visuals_path(), "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def _key() -> str:
    return getattr(config, "UNSPLASH_ACCESS_KEY", "") or ""


def has_key() -> bool:
    return bool(_key())


# ── Unsplash API (서버 전용) ──────────────────────────────────────────────
def _get(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Client-ID {_key()}",
            "Accept-Version": "v1",
            "User-Agent": getattr(config, "UNSPLASH_APP_NAME", "daebak"),
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def _candidate(p: dict, query: str) -> dict:
    u = p.get("user") or {}
    links = p.get("links") or {}
    ulinks = u.get("links") or {}
    urls = p.get("urls") or {}
    return {
        "provider": "unsplash",
        "unsplashId": p.get("id"),
        "url": urls.get("regular"),       # hotlink(site 표시용)
        "urlSmall": urls.get("small"),
        "thumb": urls.get("thumb"),
        "alt": p.get("alt_description") or p.get("description") or query,
        "photographerName": u.get("name") or "Unsplash",
        "photographerUrl": ulinks.get("html") or "https://unsplash.com",
        "sourceUrl": links.get("html") or "https://unsplash.com",
        "downloadLocation": links.get("download_location"),
        "queryUsed": query,
        "width": p.get("width"),
        "height": p.get("height"),
    }


# 가벼운 점수(다운로드 없이 가능한 휴리스틱) — landscape/aspect + alt 키워드 감점. 이미지 분석은 추후.
def score_candidate(c: dict) -> float:
    s = 60.0
    w, h = c.get("width") or 0, c.get("height") or 0
    if w and h:
        ar = w / h
        if ar >= 1.3:
            s += 15            # orientation/landscape 우선
        if ar > 2.3:
            s -= 12            # 너무 파노라마면 crop 불리
    alt = (c.get("alt") or "").lower()
    for bad in ("portrait", "selfie", "model", "headshot", "close-up", "closeup", "face"):
        if bad in alt:
            s -= 25            # faceFocusPenalty
    for bad in ("logo", "watermark"):
        if bad in alt:
            s -= 12            # logo/watermark penalty
    if "people" in alt or "crowd" in alt:
        s -= 6                 # 사람 허용하되 군중 우선순위 ↓
    return round(s, 1)


def build_visual_query(target: dict) -> str:
    if target.get("visualQuery"):
        return target["visualQuery"]
    slug = target.get("slug") or target.get("key")
    if slug in _QUERY_BY_SLUG:
        return _QUERY_BY_SLUG[slug]
    parts = [target.get("title", ""), (target.get("visualIntent") or ""), "Korea travel editorial"]
    return " ".join(p for p in parts if p).strip() or "Korea travel editorial"


def _search(query: str, orientation: str | None, content_filter: str, per_page: int) -> list:
    qs = {"query": query, "per_page": per_page, "content_filter": content_filter}
    if orientation:
        qs["orientation"] = orientation
    url = config.UNSPLASH_API_BASE + "/search/photos?" + urllib.parse.urlencode(qs)
    try:
        return _get(url).get("results", []) or []
    except Exception:  # noqa: BLE001 (rate limit/network → 다음 시도)
        return []


def get_candidates(target: dict, per_page: int = 12) -> list:
    """target = {type, key, title, slug, visualQuery?}. Unsplash 후보 리스트(점수순). download 호출 안 함.
    좁은 다단어 쿼리가 0건이면 점점 넓혀 재시도(필터완화 → 단어축소). 새 카테고리도 빈손 방지."""
    if not has_key():
        return []
    query = build_visual_query(target)
    words = query.split()
    short = " ".join(words[:3]) if len(words) > 3 else query
    short2 = (" ".join(words[:2]) + " Korea") if len(words) > 2 else query
    attempts = [
        (query, "landscape", "high"),
        (query, "landscape", "low"),
        (short, "landscape", "low"),
        (short2, "landscape", "low"),
        (short, None, "low"),
    ]
    results, used = [], query
    for q, orient, cf in attempts:
        results = _search(q, orient, cf, per_page)
        if results:
            used = q
            break
    cands = [_candidate(p, used) for p in results if (p.get("urls") or {}).get("regular")]
    # 다른 target 에 이미 배정된 사진은 후보에서 제외(같은 이미지가 여러 카드에 뜨는 중복 방지)
    store = load_visuals()
    mine = f"{target.get('type')}:{target.get('key') or target.get('slug')}"
    used_ids = {v.get("unsplashId") for k, v in store.items() if k != mine and v.get("unsplashId")}
    cands = [c for c in cands if c.get("unsplashId") not in used_ids]
    cands.sort(key=score_candidate, reverse=True)
    return cands


def apply_visual(candidate: dict, target_type: str, target_key: str) -> dict:
    """Apply(=사용 확정) 시: ① download_location 호출(필수) ② visuals.json 에 approved 저장."""
    status, triggered_at = "skipped", None
    dl = candidate.get("downloadLocation")
    if dl and has_key():
        try:
            _get(dl)  # Unsplash 'trigger download' (Client-ID 헤더로 인증)
            status = "success"
        except Exception:  # noqa: BLE001
            status = "failed"
        triggered_at = _now_iso()
    rec = dict(candidate)
    rec.pop("thumb", None)
    rec.update({
        "targetType": target_type,
        "targetKey": target_key,
        "downloadTriggeredAt": triggered_at,
        "downloadTriggerStatus": status,
        "appliedAt": _now_iso(),
        "status": "approved",
        "locked": True,
    })
    store = load_visuals()
    store[f"{target_type}:{target_key}"] = rec
    _save_visuals(store)
    return rec


def clear_visual(target_type: str, target_key: str) -> bool:
    store = load_visuals()
    k = f"{target_type}:{target_key}"
    if k in store:
        store.pop(k)
        _save_visuals(store)
        return True
    return False


def current_visual(target_type: str, target_key: str) -> dict | None:
    return load_visuals().get(f"{target_type}:{target_key}")


def push_visuals() -> dict:
    """visuals.json 을 GitHub 에 커밋·푸시(자동배포). publish 의 배치 푸시 재사용."""
    import publish
    return publish._git_publish_paths(
        [_visuals_path()], "visuals: update Unsplash image assignments", config)


# ── 대상 목록(taxonomy 기반) ──────────────────────────────────────────────
def _load_taxonomy() -> dict:
    try:
        with open(_site_file(config.SITE_TAXONOMY_REL), encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {"bigCategories": [], "clusters": []}


def list_targets() -> list:
    """Image Manager 용 대상 목록: 모든 bigCategory + cluster. 현재 적용 이미지 포함."""
    tx = _load_taxonomy()
    out = []
    for c in tx.get("bigCategories", []):
        out.append({
            "type": "bigCategory", "key": c.get("slug"), "slug": c.get("slug"),
            "title": c.get("title"), "visualQuery": c.get("visualQuery"),
            "current": current_visual("bigCategory", c.get("slug")),
        })
    for cl in tx.get("clusters", []):
        out.append({
            "type": "cluster", "key": cl.get("slug"), "slug": cl.get("slug"),
            "title": cl.get("title"), "visualQuery": cl.get("visualQuery"),
            "current": current_visual("cluster", cl.get("slug")),
        })
    return out
