# -*- coding: utf-8 -*-
"""
publish.py — 발행 어댑터: MDX 작성 → (git push → 자동배포) → IndexNow  (사장님 'OK' 뒤에만)
==========================================================================================
안전 설계(시니어):
  1) MDX 파일은 **항상** 먼저 저장(site/content/answers/<slug>.mdx) — 실패해도 글은 안 잃음.
  2) git(.git+origin) + GITHUB_TOKEN 준비됐으면 add/commit/push(비대화식, 토큰을 푸시 URL에만)
     → Vercel 자동배포. 아니면 'file_only'(파일만 저장) — 미리보기/승인은 항상 동작.
  3) IndexNow(Bing·Naver) 핑(best-effort).
  4) outputs 원장에 approved→published(또는 file_only) 기록.

frontmatter 는 JSON 블록으로 적음(JSON ⊂ YAML → 사이트 gray-matter가 그대로 파싱, 따옴표 지옥 회피).
"""

from __future__ import annotations

import json
import os
import subprocess
from urllib.parse import urlparse

import config
import indexnow
import llm
import outputs
import storage


# ── MDX 렌더 ─────────────────────────────────────────────────────────
def render_mdx(draft: dict) -> str:
    seo = draft.get("seo", {}) or {}
    synth = draft.get("synth", {}) or {}
    fm = dict(seo.get("frontmatter") or {})
    body = (synth.get("markdown") or "").strip()
    block = json.dumps(fm, ensure_ascii=False, indent=2)
    return f"---\n{block}\n---\n\n{body}\n"


def _mdx_path(slug: str, cfg) -> str:
    site_dir = getattr(cfg, "SITE_DIR", "site")
    content_dir = getattr(cfg, "SITE_CONTENT_DIR", "content/answers")
    return storage.abspath(os.path.join(site_dir, content_dir, f"{slug}.mdx"))


# ── git ──────────────────────────────────────────────────────────────
def _run_git(args, cwd, timeout=60):
    try:
        r = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout or "") + (r.stderr or "")
    except Exception as e:  # noqa: BLE001
        return 1, str(e)


def _git_root() -> str:
    """.git 이 있는 디렉터리(repo 루트). 없으면 ''."""
    base = storage.BASE
    if os.path.isdir(os.path.join(base, ".git")):
        return base
    # site/ 가 별도 repo인 경우도 허용
    site = storage.abspath(getattr(config, "SITE_DIR", "site"))
    if os.path.isdir(os.path.join(site, ".git")):
        return site
    return ""


def _origin_url(root: str) -> str:
    code, out = _run_git(["remote", "get-url", "origin"], root)
    return out.strip() if code == 0 else ""


def _auth_remote(url: str, token: str) -> str:
    """https://github.com/owner/repo(.git) → https://<token>@github.com/owner/repo (비대화식 푸시)."""
    if not url.startswith("https://"):
        return url
    rest = url[len("https://"):]
    if "@" in rest.split("/", 1)[0]:   # 이미 자격증명 있음
        rest = rest.split("@", 1)[1]
    return f"https://{token}@{rest}"


def _git_ready(cfg) -> tuple[bool, str, str]:
    """(ready, root, origin). 발행 자동화 가능 여부."""
    root = _git_root()
    if not root:
        return False, "", ""
    if not llm.github_token():
        return False, root, ""
    origin = _origin_url(root)
    if not origin:
        return False, root, ""
    return True, root, origin


def _git_publish(mdx_path: str, slug: str, cfg) -> dict:
    ready, root, origin = _git_ready(cfg)
    if not ready:
        return {"ok": False, "reason": "not_ready"}
    rel = os.path.relpath(mdx_path, root)
    code, out = _run_git(["add", rel], root)
    if code != 0:
        return {"ok": False, "reason": "add", "log": out}
    msg = getattr(cfg, "GIT_COMMIT_PREFIX", "publish: ") + slug
    code, out = _run_git(["commit", "-m", msg], root)
    if code != 0 and "nothing to commit" not in out.lower():
        return {"ok": False, "reason": "commit", "log": out}
    code, branch = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    branch = (branch.strip() or "main") if code == 0 else "main"
    auth = _auth_remote(origin, llm.github_token())
    code, out = _run_git(["push", auth, f"HEAD:{branch}"], root, timeout=120)
    if code != 0:
        return {"ok": False, "reason": "push", "log": out[:300]}
    return {"ok": True, "branch": branch}


# ── 공개 진입점 ──────────────────────────────────────────────────────
def publish_article(draft: dict, cfg=None) -> dict:
    """미리보기 draft → 발행. {ok, mode, live_url, indexnow_ok, saved_path, message}."""
    cfg = cfg or config
    seo = draft.get("seo", {}) or {}
    slug = seo.get("slug") or ""
    if not slug:
        return {"ok": False, "mode": "error", "message": "슬러그가 없어요(미리보기를 다시 만들어주세요)."}

    # 원장: 승인 처리(생성→승인)
    rec = outputs.get_by_slug(slug) or outputs.upsert_generation(
        slug=slug, question=draft.get("question", ""), title=seo.get("title", ""),
        engine=draft.get("engine", ""), verify_count=len(draft.get("verify_flags") or []))
    rid = rec.get("output_id")
    outputs.set_status(rid, "approved")

    # 1) MDX 항상 저장
    mdx_path = _mdx_path(slug, cfg)
    ok, msg = storage.safe_save_text(mdx_path, render_mdx(draft))
    if not ok:
        outputs.set_status(rid, "failed", fields={"error": msg})
        return {"ok": False, "mode": "error", "message": f"파일 저장 실패: {msg}"}

    site_url = (getattr(cfg, "SITE_URL", "") or "").strip().rstrip("/")
    live_url = f"{site_url}/answers/{slug}" if site_url else ""

    # 2) git push (가능하면)
    gp = _git_publish(mdx_path, slug, cfg)
    if not gp.get("ok"):
        outputs.set_status(rid, "approved", fields={"mode": "file_only",
                          "error": gp.get("log", "") or gp.get("reason", "")})
        return {"ok": True, "mode": "file_only", "live_url": live_url,
                "indexnow_ok": False, "saved_path": mdx_path,
                "message": "파일만 저장(사이트 연결 전 또는 토큰 없음)."}

    # 3) IndexNow (best-effort)
    idx = indexnow.submit(live_url, cfg) if live_url else {"ok": False}

    # 4) 원장: 발행 기록
    outputs.record_publish(rid, live_url or "(배포 대기)", mode="git_pushed")
    return {"ok": True, "mode": "git_pushed", "live_url": live_url,
            "indexnow_ok": bool(idx.get("ok")), "saved_path": mdx_path,
            "message": "발행 완료(자동배포 진행)."}
