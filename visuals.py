# -*- coding: utf-8 -*-
"""
visuals.py — 카테고리/클러스터 대표 이미지 자동 수급 (Pexels)
============================================================
큰 카테고리(bigCategory) + 중간 카테고리(cluster)의 visualKey 만 대상으로,
Pexels(무료·상업적·출처표기 불필요)에서 관련 사진 1장씩 받아 site/public/<레지스트리 src> 에 저장.
작은 Q&A(article) 카드는 대상이 아님(아이콘 폴백). 받은 건 로컬 파일 → 런타임 외부 URL 0(상업적 안전).

인물 금지: 검색어를 장소/사물 위주로 두고, 가로형(landscape)만 받는다.
이미지가 들어갈 "위치/파일명"은 site/lib/images.ts(imageRegistry) + taxonomy.json(visualKey)이 단일 소스 —
여기서는 그 둘을 읽어 어떤 visualKey 를 어떤 파일로 받을지 자동 결정(파일/키 하드코딩 X).
"""
from __future__ import annotations

import json
import os
import random
import re
import time
import urllib.parse
import urllib.request

import config
import storage

PEXELS_SEARCH = "https://api.pexels.com/v1/search"

# 키별 검색어(장소/사물 위주 — 인물 회피). 없으면 레지스트리 tags/alt 로 폴백.
_QUERY = {
    "seoul-skyline": "Seoul city skyline Namsan tower",
    "incheon-airport": "airport terminal interior architecture",
    "arex-train": "airport express train railway",
    "airport-taxi": "city taxi cab street",
    "airport-bus": "intercity coach bus highway",
    "seoul-subway": "Seoul subway station platform empty",
    "tmoney-card": "subway turnstile gate transit",
    "myeongdong-street": "Seoul shopping street city",
    "korean-food": "Korean food dishes table",
    "k-beauty-skincare": "skincare cosmetics products flatlay",
    "k-fashion-store": "clothing fashion store rack",
    "shopping-bags": "shopping bags retail store",
}


def _site_file(*parts) -> str:
    return storage.abspath(os.path.join(config.SITE_DIR, *parts))


def parse_registry() -> dict:
    """site/lib/images.ts 의 imageRegistry → {key: {src, alt, tags}}. (엔트리에 중첩 중괄호 없음 가정)"""
    path = _site_file("lib", "images.ts")
    try:
        txt = open(path, encoding="utf-8").read()
    except Exception:  # noqa: BLE001
        return {}
    out = {}
    for m in re.finditer(r'"([\w-]+)"\s*:\s*\{([^{}]+)\}', txt):
        key, body = m.group(1), m.group(2)
        src = re.search(r'src:\s*"([^"]+)"', body)
        if not src:
            continue  # imageRegistry 엔트리(=src 보유)만
        alt = re.search(r'alt:\s*"([^"]+)"', body)
        tags = re.search(r"tags:\s*\[([^\]]*)\]", body)
        taglist = re.findall(r'"([^"]+)"', tags.group(1)) if tags else []
        out[key] = {"src": src.group(1), "alt": alt.group(1) if alt else key, "tags": taglist}
    return out


def _load_taxonomy() -> dict:
    path = _site_file(config.SITE_TAXONOMY_REL)
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {"bigCategories": [], "clusters": []}


def list_targets() -> list:
    """big/cluster 의 visualKey 대상 목록(중복 키는 1개로 합침).
    [{key, level, name, src, exists, used_by[]}]"""
    tx = _load_taxonomy()
    reg = parse_registry()
    seen: dict = {}

    def add(level, name, vkey):
        if not vkey:
            return
        if vkey in seen:
            seen[vkey]["used_by"].append(f"{name}")
            return
        r = reg.get(vkey) or {}
        src = r.get("src")
        seen[vkey] = {
            "key": vkey, "level": level, "name": name, "src": src,
            "used_by": [name],
            "exists": bool(src and os.path.exists(_site_file("public", src))),
        }

    for c in tx.get("bigCategories", []):
        add("bigCategory", c.get("title") or c.get("slug"), c.get("visualKey"))
    for cl in tx.get("clusters", []):
        add("cluster", cl.get("title") or cl.get("slug"), cl.get("visualKey"))
    return list(seen.values())


def _query_for(key: str, reg: dict) -> str:
    if key in _QUERY:
        return _QUERY[key]
    r = reg.get(key) or {}
    if r.get("tags"):
        return " ".join(r["tags"][:3])
    return (r.get("alt") or key.replace("-", " ")).strip()


def _pexels(query: str, api_key: str, per_page: int = 10) -> list:
    url = PEXELS_SEARCH + "?" + urllib.parse.urlencode(
        {"query": query, "orientation": "landscape", "per_page": per_page, "size": "large"})
    req = urllib.request.Request(url, headers={"Authorization": api_key})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data.get("photos", []) or []


def _download(img_url: str, dest_abs: str) -> int:
    os.makedirs(os.path.dirname(dest_abs), exist_ok=True)
    req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    with open(dest_abs, "wb") as f:
        f.write(data)
    return len(data)


def fetch_one(target: dict, api_key: str, reg: dict, overwrite: bool = False) -> dict:
    key = target["key"]
    src = target.get("src")
    res = {"key": key, "name": target.get("name", ""), "src": src, "ok": False,
           "msg": "", "dest_abs": None, "credit": "", "query": ""}
    if not src:
        res["msg"] = "레지스트리에 없음 (site/lib/images.ts 에 키 추가 필요)"
        return res
    dest = _site_file("public", src)
    if os.path.exists(dest) and not overwrite:
        res.update(ok=True, dest_abs=dest, msg="이미 있음 (건너뜀)")
        return res
    query = _query_for(key, reg)
    res["query"] = query
    if not api_key:
        res["msg"] = "Pexels 키 없음"
        return res
    try:
        photos = _pexels(query, api_key)
    except Exception as e:  # noqa: BLE001
        res["msg"] = f"검색 실패: {e}"
        return res
    if not photos:
        res["msg"] = f"검색 결과 없음 (query: {query})"
        return res
    # 기본은 가장 관련도 높은 사진(0번). '교체(overwrite)' 재실행이면 상위권에서 다른 걸로 re-roll.
    photo = random.choice(photos[:8]) if overwrite else photos[0]
    img_url = (photo.get("src") or {}).get("large") or (photo.get("src") or {}).get("medium")
    if not img_url:
        res["msg"] = "이미지 URL 없음"
        return res
    try:
        n = _download(img_url, dest)
    except Exception as e:  # noqa: BLE001
        res["msg"] = f"다운로드 실패: {e}"
        return res
    res.update(ok=True, dest_abs=dest, credit=photo.get("photographer", ""),
              msg=f"저장 {n // 1024} KB · Pexels / {photo.get('photographer', '')}")
    return res


def fetch_all(overwrite: bool = False, api_key: str = "") -> list:
    """big/cluster 의 모든 visualKey 에 대해 이미지 수급. 결과 리스트 반환."""
    api_key = api_key or getattr(config, "PEXELS_API_KEY", "")
    reg = parse_registry()
    out = []
    for t in list_targets():
        out.append(fetch_one(t, api_key, reg, overwrite=overwrite))
        time.sleep(0.3)  # Pexels rate-limit(시간당 200) 여유
    return out


def saved_paths(results: list) -> list:
    return [r["dest_abs"] for r in results if r.get("ok") and r.get("dest_abs")]


def push_images(results: list, message: str = "publish: category images (Pexels)") -> dict:
    """받은 이미지를 git add/commit/push — publish.py 의 검증된 헬퍼 재사용(별도 푸시 로직 안 만듦)."""
    paths = saved_paths(results)
    if not paths:
        return {"ok": False, "reason": "no_files"}
    try:
        import publish
        return publish._git_publish_paths(paths, message, config)
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "reason": "error", "log": str(e)}
