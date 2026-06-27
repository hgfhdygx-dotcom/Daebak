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


# ── 배치 발행 (Phase 1B): 여러 글 → 1회 commit/push → IndexNow 일괄 ──────
def _taxonomy_ok(draft: dict) -> bool:
    """발행 가드 — bigCategory/cluster/questionType 가 있어야(글이 카테고리 없이 안 뜨게)."""
    fm = (draft.get("seo", {}) or {}).get("frontmatter", {}) or {}
    return bool((fm.get("bigCategory") or "").strip() and (fm.get("cluster") or "").strip()
                and (fm.get("questionType") or "").strip())


def _git_publish_paths(mdx_paths: list, message: str, cfg) -> dict:
    """여러 MDX 를 한 번에 add → 1 commit → 1 push(자동배포). 배치 발행 시 푸시 N회 방지."""
    ready, root, origin = _git_ready(cfg)
    if not ready:
        return {"ok": False, "reason": "not_ready"}
    rels = [os.path.relpath(p, root) for p in mdx_paths]
    code, out = _run_git(["add", *rels], root)
    if code != 0:
        return {"ok": False, "reason": "add", "log": out}
    code, out = _run_git(["commit", "-m", message], root)
    if code != 0 and "nothing to commit" not in out.lower():
        return {"ok": False, "reason": "commit", "log": out}
    code, branch = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    branch = (branch.strip() or "main") if code == 0 else "main"
    auth = _auth_remote(origin, llm.github_token())
    code, out = _run_git(["push", auth, f"HEAD:{branch}"], root, timeout=180)
    if code != 0:
        return {"ok": False, "reason": "push", "log": out[:300]}
    return {"ok": True, "branch": branch}


def publish_batch(drafts: list, cfg=None) -> dict:
    """여러 draft 발행: 전부 MDX 저장 → 1회 commit/push → IndexNow 일괄.
    {ok, mode, results:[{slug,ok,live_url,reason}], published, indexnow_ok, message}."""
    cfg = cfg or config
    drafts = [d for d in (drafts or []) if d]
    if not drafts:
        return {"ok": False, "mode": "error", "message": "발행할 글이 없어요.", "results": []}

    site_url = (getattr(cfg, "SITE_URL", "") or "").strip().rstrip("/")
    results, written, slugs = [], [], []
    for d in drafts:
        seo = d.get("seo", {}) or {}
        slug = seo.get("slug") or ""
        if not slug:
            results.append({"slug": "", "ok": False, "reason": "no_slug"})
            continue
        if not _taxonomy_ok(d):
            results.append({"slug": slug, "ok": False, "reason": "no_taxonomy"})
            continue  # 가드: 카테고리/클러스터 없는 글은 발행 안 함
        rec = outputs.get_by_slug(slug) or outputs.upsert_generation(
            slug=slug, question=d.get("question", ""), title=seo.get("title", ""),
            engine=d.get("engine", ""), verify_count=len(d.get("verify_flags") or []))
        outputs.set_status(rec.get("output_id"), "approved")
        mdx_path = _mdx_path(slug, cfg)
        ok, msg = storage.safe_save_text(mdx_path, render_mdx(d))
        if not ok:
            outputs.set_status(rec.get("output_id"), "failed", fields={"error": msg})
            results.append({"slug": slug, "ok": False, "reason": "save", "log": msg})
            continue
        live_url = f"{site_url}/answers/{slug}" if site_url else ""
        written.append({"slug": slug, "path": mdx_path, "live_url": live_url,
                        "rid": rec.get("output_id")})
        slugs.append(slug)

    if not written:
        return {"ok": False, "mode": "error", "results": results,
                "message": "저장된 글이 없어요(카테고리 미연결 또는 저장 실패)."}

    # 1회 commit/push
    msg = getattr(cfg, "GIT_COMMIT_PREFIX", "publish: ") + f"{len(written)} answers ({', '.join(slugs[:3])}…)"
    gp = _git_publish_paths([w["path"] for w in written], msg, cfg)

    indexnow_ok = False
    if gp.get("ok"):
        for w in written:
            if w["live_url"]:
                idx = indexnow.submit(w["live_url"], cfg)
                indexnow_ok = indexnow_ok or bool(idx.get("ok"))
            outputs.record_publish(w["rid"], w["live_url"] or "(배포 대기)", mode="git_pushed")
            results.append({"slug": w["slug"], "ok": True, "live_url": w["live_url"]})
        mode = "git_pushed"
        message = f"{len(written)}개 발행 완료(1회 push → 자동배포)."
    else:
        for w in written:
            outputs.set_status(w["rid"], "approved",
                               fields={"mode": "file_only", "error": gp.get("log", gp.get("reason", ""))})
            results.append({"slug": w["slug"], "ok": True, "live_url": w["live_url"], "reason": "file_only"})
        mode = "file_only"
        message = f"{len(written)}개 파일 저장(사이트 연결 전 또는 토큰 없음)."

    return {"ok": True, "mode": mode, "results": results, "published": len(written),
            "indexnow_ok": indexnow_ok, "message": message}
