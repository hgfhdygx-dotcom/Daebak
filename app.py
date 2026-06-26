# -*- coding: utf-8 -*-
"""
app.py — foreign-qa 웹앱 (질문 1줄 → 리서치 → 합성 → 영작·SEO → 미리보기 → OK 발행)
====================================================================================
시니어용: 번호 단계 · 한글 · 발행 전 항상 예상비용 미리보기 · OK 눌러야만 발행.
실행은 백그라운드 스레드(run_runner) — 화면이 안 멈춤.
"""

from __future__ import annotations

import time

import streamlit as st

import config
import llm
import outputs
import pipeline
import run_runner
import storage
import usage

st.set_page_config(page_title="foreign-qa — 질문 1줄로 영어 글 발행", page_icon="📝", layout="centered")


def _save_settings(updates: dict):
    s = storage.safe_load_json(config.SETTINGS_FILE, {}) or {}
    s.update(updates)
    storage.safe_save_json(config.SETTINGS_FILE, s)


def _dot(ok: bool) -> str:
    return "🟢" if ok else "🔴"


# ══════════════════════════════════════════════════════════════════════════
st.title("📝 외국인 질문 → 영어 글 발행")
st.caption("외국인이 묻는 영어 질문 **한 줄**만 넣으면 → 리서치 → 본문 → 영작·SEO → "
           "**미리보기 → OK 누르면 내 사이트에 발행**(+ 색인). 가짜 정보는 만들지 않고, "
           "확인 필요한 곳은 `[VERIFY]` 로 표시해요.")

# ── ① 키·사이트 연결 (1회만) ─────────────────────────────────────────
has_openai = bool(llm.get_api_key_silent("openai"))
has_git = bool(llm.github_token())
has_site = bool(getattr(config, "SITE_URL", ""))
has_indexnow = bool(llm.indexnow_key())

with st.expander("① 키·사이트 연결  " + ("✅ 준비됨" if (has_openai and has_site) else "⚠️ 설정 필요"),
                 expanded=not (has_openai and has_site)):
    st.markdown(
        f"- {_dot(has_openai)} **OpenAI 키** — 리서치·글 생성에 필요 (없으면 `키입력.bat`)\n"
        f"- {_dot(has_site)} **내 사이트 주소(SITE_URL)** — 발행/미리보기 링크에 사용\n"
        f"- {_dot(has_git)} **GitHub 토큰** — 자동 발행(git push)에 필요 (없으면 '파일만 저장', `깃토큰입력.bat`)\n"
        f"- {_dot(has_indexnow)} **IndexNow 키** — 색인 가속 (없어도 발행은 됨, `사이트키생성.bat`)"
    )
    site_url = st.text_input("내 사이트 주소 (예: https://my-answers.vercel.app)",
                             value=getattr(config, "SITE_URL", ""), key="site_url_in")
    author = st.text_input("작성자 이름 (글 신뢰도 E-E-A-T에 표시)",
                           value=getattr(config, "AUTHOR_NAME", "Editorial Team"), key="author_in")
    if st.button("💾 사이트 설정 저장", key="save_site"):
        _save_settings({"SITE_URL": site_url.strip().rstrip("/"), "AUTHOR_NAME": author.strip()})
        st.success("저장했어요. (다음 실행부터 반영)")
        st.rerun()

st.divider()

# ── ② 질문 입력 ──────────────────────────────────────────────────────
st.subheader("② 외국인이 묻는 영어 질문 한 줄")
question = st.text_input(
    "질문 (영어로)", key="question",
    placeholder="e.g.  How do I open a bank account in Korea as a foreigner?")
engine = st.selectbox("리서치 엔진", ["openai", "perplexity", "gemini"],
                      index=["openai", "perplexity", "gemini"].index(
                          getattr(config, "RESEARCH_ENGINE", "openai")),
                      help="기본 OpenAI(web_search). 최신성이 중요하면 perplexity.")

# ── ③ 예상 비용 (무료) ───────────────────────────────────────────────
st.subheader("③ 예상 비용 확인 (무료)")
guard = pipeline.dry_run(question or "(질문 예시)", config)
rem = guard["remaining"]
est = guard["estimate"]
c1, c2 = st.columns(2)
c1.metric("이 글 예상 비용", f"약 {est['krw']:,.0f}원", help=f"검색 {est['search_calls']}회 등 총 {est['total_calls']}회 호출")
c2.metric("남은 한도", f"오늘 {rem['day']}회 · 이번 달 {rem['month']}회")
if guard["blocked"]:
    for r in guard["reasons"]:
        st.error("⛔ " + r)

# ── ④ 실행 ───────────────────────────────────────────────────────────
st.subheader("④ 글 만들기")
running = run_runner.is_running()
can_run = bool(question.strip()) and not guard["blocked"] and not running
if st.button("▶ 글 만들기 시작", type="primary", disabled=not can_run, key="run_btn"):
    if not has_openai:
        st.warning("OpenAI 키가 없어요. 무료 초안(검토 필요)으로만 만들어져요. `키입력.bat` 으로 키를 넣으면 자연스러운 글이 됩니다.")
    run_runner.start(question.strip(), engine, config)
    st.rerun()

if running:
    cur = run_runner.current()
    st.progress(float(cur["progress"]), text=cur["message"] or "작업 중…")
    time.sleep(0.6)
    st.rerun()

# 완료된 결과를 세션에 보관
cur = run_runner.current()
if (not running) and cur.get("result") and not st.session_state.get("draft"):
    st.session_state["draft"] = cur["result"]
    run_runner.clear()

draft = st.session_state.get("draft")

# ── ⑤ 미리보기 ───────────────────────────────────────────────────────
if draft:
    st.divider()
    st.subheader("⑤ 미리보기")
    if draft.get("error"):
        st.warning(draft["error"])
    if not draft.get("ok"):
        st.error("실패: " + (draft.get("error") or "알 수 없는 오류"))
    else:
        synth = draft.get("synth", {})
        seo = draft.get("seo", {})
        cp = synth.get("citation_pack", {}) or {}
        flags = draft.get("verify_flags") or []

        st.markdown(f"# {seo.get('title') or draft.get('question')}")

        with st.container(border=True):
            st.markdown("**📌 Citation Pack** (AI가 통째로 가져가기 좋은 요약)")
            if cp.get("answer"):
                st.markdown(f"**Answer:** {cp['answer']}")
            for f in (cp.get("key_facts") or []):
                st.markdown(f"- {f}")
            if cp.get("quotable"):
                st.markdown(f"> {cp['quotable']}")

        st.markdown(synth.get("markdown") or "")

        if synth.get("faq"):
            st.markdown("### FAQ")
            for f in synth["faq"]:
                st.markdown(f"**Q. {f.get('q','')}**")
                st.markdown(f.get("a", ""))

        if synth.get("sources"):
            st.markdown("### Sources")
            for s in synth["sources"]:
                u = s.get("url", "")
                if u:
                    st.markdown(f"- [{s.get('domain') or u}]({u})")

        cc1, cc2 = st.columns(2)
        cc1.metric("이 글에 쓴 비용", f"약 {draft.get('cost_spent_krw', 0):,.0f}원")
        cc2.metric("남은 한도", f"오늘 {usage.remaining()['day']}회")

        with st.expander("🔧 SEO 메타 / frontmatter"):
            st.write({"title": seo.get("title"), "slug": seo.get("slug"),
                      "meta_description": seo.get("meta_description")})
            st.json(seo.get("frontmatter", {}))

        if flags:
            st.warning("⚠️ **확인 필요 " + str(len(flags)) + "곳** — 아래 항목을 사실로 채운 뒤 발행하세요:\n"
                       + "\n".join(f"- {x}" for x in flags))

        # ── ⑥ 발행 ───────────────────────────────────────────────────
        st.subheader("⑥ 발행")
        st.caption("OK를 누르면 글을 MDX로 저장하고, 사이트가 연결돼 있으면 자동 배포 + 색인합니다. "
                   "연결 전이면 '파일만 저장'으로 안전하게 보관해요.")
        if st.button("✅ OK 발행", type="primary", key="publish_btn"):
            import publish
            with st.spinner("발행 중…"):
                res = publish.publish_article(draft, config)
            if res.get("ok") and res.get("mode") == "git_pushed":
                st.success(f"발행 완료! 🔗 {res.get('live_url')}")
                if res.get("indexnow_ok"):
                    st.caption("🔎 IndexNow(빙·네이버)에 새 글을 알렸어요.")
            elif res.get("mode") == "file_only":
                st.info("📄 파일로 저장했어요(아직 사이트 연결 전이라 자동 발행은 못 했어요).\n\n"
                        f"저장 위치: `{res.get('saved_path','')}`\n\n"
                        "README의 '사이트 연결 1회 설정'을 따라 하면 다음부터 자동으로 올라가요.")
            else:
                st.error("발행 실패: " + res.get("message", "알 수 없는 오류"))

    if st.button("🆕 새 질문", key="reset_btn"):
        st.session_state.pop("draft", None)
        st.rerun()

st.divider()
st.caption(f"발행 기록 — " + " · ".join(
    f"{outputs.STATUS_BADGE.get(k,'')}{outputs.STATUS_LABEL[k]} {v}"
    for k, v in outputs.status_counts().items()))
