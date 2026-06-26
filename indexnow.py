# -*- coding: utf-8 -*-
"""
indexnow.py — 색인 가속(IndexNow): 새 글 URL을 Bing·Naver 에 즉시 알림 (기법 H)
================================================================================
검색엔진 로봇이 우연히 들를 때까지 기다리지 않고 "새 글 올렸다"를 직접 통보 → 색인 며칠→몇 분.
🚨 내가 소유한 도메인에서만 동작(루트에 <키>.txt 인증 파일 필요). Google 은 IndexNow 미사용이나
   robots 허용 + sitemap 으로 발견됨(그래서 둘 다 챙김).

ensure_key(): 키 자동 생성 → .env(INDEXNOW_KEY) + site/public/<키>.txt 동시 작성(불일치 방지).
submit(url): { host, key, keyLocation, urlList } POST. INDEXNOW_DRY_RUN 이면 핑 없이 성공 처리.
"""

from __future__ import annotations

import os
import secrets
from urllib.parse import urlparse

import config
import envtool
import llm
import storage


def ensure_key(cfg=None) -> str:
    """IndexNow 키 보장 — 없으면 생성해 .env + site/public/<키>.txt 에 동시 기록. 키 반환."""
    cfg = cfg or config
    key = llm.indexnow_key()
    if not key:
        key = secrets.token_hex(16)   # 32 hex chars
        envtool.set_env_var("INDEXNOW_KEY", key)
        os.environ["INDEXNOW_KEY"] = key
    # 사이트 public 루트에 키 파일(내용 == 키)
    site_dir = getattr(cfg, "SITE_DIR", "site")
    keyfile = os.path.join(storage.abspath(site_dir), "public", f"{key}.txt")
    storage.safe_save_text(keyfile, key)
    return key


def submit(url: str, cfg=None) -> dict:
    """새 글 URL을 IndexNow 엔드포인트들에 통보. {ok, dry_run, endpoints_ok, error}."""
    cfg = cfg or config
    url = (url or "").strip()
    site_url = (getattr(cfg, "SITE_URL", "") or "").strip().rstrip("/")
    key = llm.indexnow_key()
    res = {"ok": False, "dry_run": False, "endpoints_ok": [], "error": ""}

    if getattr(cfg, "INDEXNOW_DRY_RUN", False):
        res.update(ok=True, dry_run=True)
        return res
    if not (url and site_url and key):
        res["error"] = "IndexNow 건너뜀(사이트 주소/키 없음)."
        return res

    host = urlparse(site_url).netloc
    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"{site_url}/{key}.txt",
        "urlList": [url],
    }
    try:
        import requests
    except ImportError:
        res["error"] = "requests 미설치"
        return res

    for ep in getattr(cfg, "INDEXNOW_ENDPOINTS", []):
        try:
            r = requests.post(ep, json=payload, timeout=8,
                              headers={"Content-Type": "application/json; charset=utf-8"})
            if r.status_code in (200, 202):
                res["endpoints_ok"].append(ep)
        except Exception:  # noqa: BLE001
            continue
    res["ok"] = bool(res["endpoints_ok"])
    if not res["ok"]:
        res["error"] = "모든 엔드포인트 응답 실패(나중에 sitemap 으로도 발견됨)."
    return res
