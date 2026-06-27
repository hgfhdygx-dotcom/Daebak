# -*- coding: utf-8 -*-
"""
app.py — foreign-qa 웹앱 (클러스터 CMS)
========================================
탭 1) ✍️ 빠른 발행(1개): 질문 1줄 → 리서치 → 합성 → 영작·SEO → GEO 검사 → 미리보기 → OK 발행.
탭 2) 🗂️ 기획·분류(배치): 질문 묶음(20~30) → 자동 분류(taxonomy 닫힌 집합) + 중복감지 → plan.json.
       (실제 5개씩 batch 생성·발행은 Phase 1B 의 Generate 탭에서.)

GEO 규칙(ai가 좋아하는 글.md)은 본문에 노출하지 않고, geo_check 로 발행 전 검사/보정만 한다.
실행은 백그라운드 스레드(run_runner) — 화면이 안 멈춤.
"""

from __future__ import annotations

import time

import streamlit as st

import config
import geo_check
import llm
import outputs
import pipeline
import plan
import research
import run_runner
import storage
import taxonomy
import usage

st.set_page_config(page_title="Daebak — 질문 → AI-friendly 글 발행", page_icon="📝", layout="wide")


def _save_settings(updates: dict):
    s = storage.safe_load_json(config.SETTINGS_FILE, {}) or {}
    s.update(updates)
    ok, msg = storage.safe_save_json(config.SETTINGS_FILE, s)
    for k, v in updates.items():
        setattr(config, k, v)
    return ok, msg


def _dot(ok: bool) -> str:
    return "🟢" if ok else "🔴"


def _guess_pagetype(q: str) -> str:
    """빠른 발행(1개)용 대략 pageType 추정(GEO 검사 기준 선택). 배치는 classify 가 정확히 함."""
    s = (q or "").lower()
    if " vs " in s or "versus" in s or "or " in s and "better" in s:
        return "comparison"
    if any(w in s for w in ("how much", "cost", "price", "fee", "fare", "won", "₩")):
        return "price"
    if any(w in s for w in ("how do i get", "from ", " to ", "route", "way to")):
        return "route"
    if any(w in s for w in ("visa", "k-eta", "keta", "arrival card")):
        return "visa"
    if any(w in s for w in ("itinerary", "how many days", "plan ", "days in")):
        return "planning"
    if any(w in s for w in ("safe", "safety", "dangerous")):
        return "safety"
    return "practical"


_STATUS_ICON = {"pass": "✅", "warn": "⚠️", "fail": "❌"}


def render_geo_report(report: dict):
    """GEO 검사 리포트 렌더 — 점수/게이트 + 항목별 + 자동보정 + <90 경고."""
    gate = report.get("gate", "minor")
    score = report.get("score", 0)
    badge = geo_check.GATE_BADGE.get(gate, "🟡")
    label = geo_check.GATE_LABEL.get(gate, gate)
    c1, c2 = st.columns([1, 2])
    c1.metric("GEO 점수", f"{score} / 100")
    c2.markdown(f"### {badge} {label}")
    ready = int(getattr(config, "GEO_READY_MIN", 90))
    if score < ready:
        st.warning(f"⚠️ {ready}점 미만 — 자동 발행 전에 아래 항목을 보완하세요.")
    corrected = report.get("corrected") or {}
    if corrected:
        st.caption("🔧 자동보정: " + ", ".join(corrected.keys()))
    with st.expander(f"검사 항목 {len(report.get('perCheck', []))}개 보기", expanded=score < ready):
        for c in report.get("perCheck", []):
            if c.get("na"):
                icon, extra = "➖", " (해당 없음)"
            else:
                icon, extra = _STATUS_ICON.get(c["status"], "•"), ""
            detail = f" — {c['detail']}" if c.get("detail") else ""
            fixed = " 🔧자동보정" if c.get("autofixed") else ""
            st.markdown(f"{icon} **{c['label']}**{extra}{detail}{fixed}")


# ══════════════════════════════════════════════════════════════════════════
st.title("📝 Daebak — 질문 → AI-friendly 글 발행")

# ── 공통: 키·사이트 연결 (1회) ───────────────────────────────────────
has_openai = bool(llm.get_api_key_silent("openai"))
has_git = bool(llm.github_token())
has_site = bool(getattr(config, "SITE_URL", ""))
has_indexnow = bool(llm.indexnow_key())

with st.expander("① 키·사이트 연결  " + ("✅ 준비됨" if (has_openai and has_site) else "⚠️ 설정 필요"),
                 expanded=not (has_openai and has_site)):
    st.markdown(
        f"- {_dot(has_openai)} **OpenAI 키** — 리서치·글·분류에 필요 (없으면 `키입력.bat`)\n"
        f"- {_dot(has_site)} **내 사이트 주소(SITE_URL)** — 발행/미리보기 링크\n"
        f"- {_dot(has_git)} **GitHub 토큰** — 자동 발행(git push) (없으면 '파일만 저장')\n"
        f"- {_dot(has_indexnow)} **IndexNow 키** — 색인 가속 (없어도 발행됨)"
    )
    site_url = st.text_input("내 사이트 주소 (예: https://daebak-pi.vercel.app)",
                             value=getattr(config, "SITE_URL", ""), key="site_url_in")
    if st.button("💾 사이트 설정 저장", key="save_site"):
        ok, msg = _save_settings({"SITE_URL": site_url.strip().rstrip("/")})
        st.success("저장했어요. ✅") if ok else st.error("저장 실패: " + msg)
        st.rerun()

tab_quick, tab_plan, tab_gen, tab_lib, tab_meas = st.tabs(
    ["✍️ 빠른 발행 (1개)", "🗂️ 기획·분류 (배치)", "⚙️ 생성·발행 (5개)", "📚 라이브러리", "📈 측정"])

# ══════════════════════════════════════════════════════════════════════════
#  탭 1 — 빠른 발행 (기존 단일 흐름 + GEO 검사)
# ══════════════════════════════════════════════════════════════════════════
with tab_quick:
    st.caption("질문 **한 줄** → 리서치 → 본문 → 영작·SEO → **GEO 검사** → 미리보기 → OK 발행. "
               "확인 필요한 곳은 `[VERIFY]`.")

    question = st.text_input("② 외국인이 묻는 영어 질문 한 줄", key="question",
                             placeholder="e.g.  How do I get from Incheon Airport to Seoul?")
    engine = st.selectbox("리서치 엔진", ["openai", "perplexity", "gemini"],
                          index=["openai", "perplexity", "gemini"].index(
                              getattr(config, "RESEARCH_ENGINE", "openai")),
                          help="기본 OpenAI(web_search). 최신성이 중요하면 perplexity.")

    st.subheader("③ 예상 비용 확인 (무료)")
    guard = pipeline.dry_run(question or "(질문 예시)", config)
    rem, est = guard["remaining"], guard["estimate"]
    c1, c2 = st.columns(2)
    c1.metric("이 글 예상 비용", f"약 {est['krw']:,.0f}원",
              help=f"검색 {est['search_calls']}회 등 총 {est['total_calls']}회 호출")
    c2.metric("남은 한도", f"오늘 {rem['day']}회 · 이번 달 {rem['month']}회")
    if guard["blocked"]:
        for r in guard["reasons"]:
            st.error("⛔ " + r)

    st.subheader("④ 글 만들기")
    running = run_runner.is_running()
    can_run = bool(question.strip()) and not guard["blocked"] and not running
    if st.button("▶ 글 만들기 시작", type="primary", disabled=not can_run, key="run_btn"):
        if not has_openai:
            st.warning("OpenAI 키가 없어요. 무료 초안(검토 필요)으로만 만들어져요.")
        run_runner.start(question.strip(), engine, config)
        st.rerun()

    if running:
        cur = run_runner.current()
        st.progress(float(cur["progress"]), text=cur["message"] or "작업 중…")
        time.sleep(0.6)
        st.rerun()

    cur = run_runner.current()
    if (not running) and cur.get("result") and not st.session_state.get("draft"):
        st.session_state["draft"] = cur["result"]
        run_runner.clear()

    draft = st.session_state.get("draft")

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

            # ── GEO 검사 ──
            pt = _guess_pagetype(draft.get("question", ""))
            report = geo_check.run_checks(synth, seo.get("frontmatter", {}), pt, cfg=config)
            st.markdown("#### 🤖 GEO 검사")
            render_geo_report(report)
            st.divider()

            st.markdown(f"# {seo.get('title') or draft.get('question')}")
            with st.container(border=True):
                st.markdown("**📌 Quick answer / At a glance**")
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
                st.warning("⚠️ **확인 필요 " + str(len(flags)) + "곳**:\n"
                           + "\n".join(f"- {x}" for x in flags))

            st.subheader("⑥ 발행")
            if report.get("gate") == "rewrite":
                st.error("GEO 점수가 낮아요(재작성 권장). 그래도 발행하려면 아래 버튼을 누르세요.")
            if st.button("✅ OK 발행", type="primary", key="publish_btn"):
                import publish
                with st.spinner("발행 중…"):
                    res = publish.publish_article(draft, config)
                if res.get("ok") and res.get("mode") == "git_pushed":
                    st.success(f"발행 완료! 🔗 {res.get('live_url')}")
                    if res.get("indexnow_ok"):
                        st.caption("🔎 IndexNow(빙·네이버)에 새 글을 알렸어요.")
                elif res.get("mode") == "file_only":
                    st.info("📄 파일로 저장했어요(사이트 연결 전).\n\n"
                            f"저장 위치: `{res.get('saved_path','')}`")
                else:
                    st.error("발행 실패: " + res.get("message", "알 수 없는 오류"))

        if st.button("🆕 새 질문", key="reset_btn"):
            st.session_state.pop("draft", None)
            st.rerun()

# ══════════════════════════════════════════════════════════════════════════
#  탭 2 — 기획·분류 (배치): 질문 묶음 → 분류 + 중복감지 → plan.json
# ══════════════════════════════════════════════════════════════════════════
with tab_plan:
    st.caption("질문 묶음(최대 30개)을 한 번에 **기획/분류만** 합니다. 실제 글 생성은 5개씩 batch(다음 단계). "
               "분류는 `taxonomy.json`(수동 편집 영구 파일)의 카테고리/클러스터 안으로만 들어갑니다.")

    taxo = taxonomy.load()
    cl_titles = [c.get("title", "") for c in taxonomy.clusters(taxo)]
    bc_titles = [c.get("title", "") for c in taxonomy.big_categories(taxo)]

    default_qs = ""
    if not plan.load_plan():
        aa = taxonomy.supporting_of("airport-arrival", taxo)
        if aa:
            default_qs = "\n".join([q["question"] for q in aa if q.get("question")])

    txt = st.text_area("질문 (한 줄에 하나씩)", value=default_qs, height=220, key="batch_qs",
                       placeholder="What is the cheapest way from Incheon Airport to Seoul?\n...")
    col1, col2 = st.columns([1, 3])
    if col1.button("🧭 분류하기 (기획)", type="primary", key="classify_btn"):
        qs = [l.strip() for l in txt.splitlines() if l.strip()][:30]
        if not qs:
            st.warning("질문을 입력하세요.")
        else:
            if not has_openai:
                st.warning("OpenAI 키가 없어 휴리스틱 분류(미배정)로만 됩니다. 키를 넣으면 정확해져요.")
            with st.spinner(f"{len(qs)}개 분류·중복감지 중…"):
                rows = pipeline.plan_batch(qs, config)
            st.success(f"{len(rows)}개 분류·저장했어요. 아래 표에서 수정 후 저장하세요.")
            st.rerun()

    all_rows = plan.list_plan()
    if not all_rows:
        st.info("아직 기획된 질문이 없어요. 위에 질문을 넣고 ‘분류하기’를 누르세요.")
    else:
        # 중복 경고
        dup_rows = [r for r in all_rows if any((d or {}).get("is_dup") for d in (r.get("duplicateRisk") or []))]
        if dup_rows:
            with st.expander(f"🔁 중복 의심 {len(dup_rows)}건 — 표의 dedupeAction 으로 처리", expanded=True):
                for r in dup_rows:
                    best = next((d for d in r["duplicateRisk"] if d.get("is_dup")), None)
                    if best:
                        st.markdown(f"- **{r.get('question','')}** ↔ `{best.get('slug','')}` "
                                    f"({best.get('why','')})")

        # 편집 테이블(평면 subset)
        table = [{
            "plan_id": r.get("plan_id", ""),
            "question": r.get("question", ""),
            "title": r.get("title", ""),
            "bigCategory": r.get("bigCategory", ""),
            "cluster": r.get("cluster", ""),
            "questionType": r.get("questionType", "supporting"),
            "pageType": r.get("pageType", "practical"),
            "priority": int(r.get("priority") or 3),
            "needsFreshSource": bool(r.get("needsFreshSource")),
            "publishMode": r.get("publishMode", "auto"),
            "dedupeAction": r.get("dedupeAction", ""),
            "status": r.get("status", "planned"),
        } for r in all_rows]

        edited = st.data_editor(
            table, hide_index=True, key="plan_editor",
            column_config={
                "plan_id": st.column_config.TextColumn("ID", disabled=True, width="small"),
                "question": st.column_config.TextColumn("질문", disabled=True, width="large"),
                "title": st.column_config.TextColumn("제목"),
                "bigCategory": st.column_config.SelectboxColumn("카테고리", options=[""] + bc_titles),
                "cluster": st.column_config.SelectboxColumn("클러스터", options=[""] + cl_titles),
                "questionType": st.column_config.SelectboxColumn(
                    "유형", options=list(plan.QUESTION_TYPES)),
                "pageType": st.column_config.SelectboxColumn("템플릿", options=list(plan.PAGE_TYPES)),
                "priority": st.column_config.NumberColumn("우선", min_value=1, max_value=5, step=1),
                "needsFreshSource": st.column_config.CheckboxColumn("최신출처?"),
                "publishMode": st.column_config.SelectboxColumn(
                    "발행모드", options=["auto", "review"]),
                "dedupeAction": st.column_config.SelectboxColumn(
                    "중복처리", options=list(plan.DEDUPE_ACTIONS)),
                "status": st.column_config.TextColumn("상태", disabled=True, width="small"),
            },
        )

        if st.button("💾 기획 저장", type="primary", key="save_plan"):
            n = 0
            for row in edited:
                pid = row.get("plan_id")
                if not pid:
                    continue
                fields = {k: row.get(k) for k in (
                    "title", "bigCategory", "cluster", "questionType", "pageType",
                    "priority", "needsFreshSource", "publishMode", "dedupeAction")}
                # cluster 바꿨으면 slug/bigCategory/pillar/publishMode 재계산 + 제목→슬러그
                base = plan.get_by_id(pid) or {}
                merged = {**base, **fields}
                merged = pipeline.reconcile_row(merged, config)
                import seo as _seo
                if merged.get("title"):
                    merged["slug"] = _seo.slugify_no_year(merged["title"])
                plan.update_fields(pid, {k: merged.get(k) for k in (
                    "title", "slug", "bigCategory", "bigCategorySlug", "cluster", "clusterSlug",
                    "pillarQuestion", "pillarSlug", "questionType", "pageType", "priority",
                    "needsFreshSource", "publishMode", "dedupeAction")})
                n += 1
            st.success(f"{n}개 저장했어요. ✅")
            st.rerun()

        # 클러스터별 개수
        with st.expander("📊 클러스터별 기획 현황"):
            for cs, counts in plan.counts_by_cluster().items():
                line = " · ".join(f"{plan.STATUS_BADGE.get(k,'')}{plan.STATUS_LABEL[k]} {v}"
                                  for k, v in counts.items() if v)
                st.markdown(f"- **{cs}** — {line or '없음'}")

# ══════════════════════════════════════════════════════════════════════════
#  탭 3 — 생성·발행 (배치 5개): Research Pack 재사용 → pageType 생성 → GEO → 발행
# ══════════════════════════════════════════════════════════════════════════
with tab_gen:
    st.caption("클러스터별 Research Pack 을 한 번 만들고 재사용해 **5개씩** 생성합니다. 각 글은 GEO 검사 후 "
               "auto 는 일괄 발행, review(민감)·낮은 점수는 개별 검수 발행. 20개는 기획 전용(생성 불가).")

    cl_slugs = sorted({r.get("clusterSlug") for r in plan.load_plan() if r.get("clusterSlug")})
    if not cl_slugs:
        st.info("먼저 ‘🗂️ 기획·분류’ 탭에서 질문을 분류·저장하세요.")
    else:
        def _cl_label(cs):
            rec = taxonomy.cluster(cs)
            return rec.get("title", cs) if rec else cs
        cs = st.selectbox("클러스터", cl_slugs, format_func=_cl_label, key="gen_cluster")

        pack = research.load_cluster_pack(cs)
        if pack:
            stale = research.is_pack_stale(pack)
            st.caption(f"📦 Research Pack: 마지막 확인 {pack.get('lastChecked','?')} · "
                       + ("🔴 오래됨(재리서치 권장)" if stale else "🟢 신선") + f" · 출처 {len(pack.get('officialSources') or [])}개")
        else:
            st.caption("📦 Research Pack 없음 — 첫 생성 때 pillar 질문으로 자동 빌드돼요.")
        if st.button("🔄 Research Pack 새로 만들기(강제)", key="rebuild_pack", disabled=not has_openai):
            with st.spinner("클러스터 리서치 중…"):
                pipeline.ensure_cluster_pack(cs, force=True, cfg=config)
            st.success("Research Pack 갱신 완료.")
            st.rerun()

        bs = st.selectbox("Batch size", config.BATCH_SIZES,
                          index=config.BATCH_SIZES.index(getattr(config, "BATCH_DEFAULT", 5)),
                          help="기본 5. 20은 기획 전용(완성 글 생성 차단).")
        planning_only = bs >= getattr(config, "BATCH_PLANNING_ONLY", 20)
        if planning_only:
            st.warning("⛔ 20개는 ‘기획/분류 전용’ — 완성 글 생성은 막혀 있어요. 5개씩 나눠 생성하세요.")

        rows = [r for r in plan.list_plan(cluster_slug=cs)
                if r.get("status") in ("planned", "researched", "generated", "ready")]
        opts = {r["plan_id"]: f'{plan.STATUS_BADGE.get(r["status"],"")} {r["question"][:55]} · [{r["pageType"]}]'
                for r in rows}
        # 기본 선택 = 클러스터 publishQueue 앞 bs개(없으면 우선순위 상위)
        rec = taxonomy.cluster(cs) or {}
        slug2id = {r.get("slug"): r["plan_id"] for r in rows if r.get("slug")}
        queue_ids = [slug2id[s] for s in (rec.get("publishQueue") or []) if s in slug2id]
        default_ids = (queue_ids or list(opts))[: min(bs, len(opts))]
        sel = st.multiselect("생성할 질문 선택", list(opts), default=default_ids,
                             format_func=lambda i: opts.get(i, i), key="gen_sel")

        if sel:
            dr = pipeline.dry_run_batch(sel[:bs], config)
            st.caption(f"예상 비용 ~{dr['krw']:,.0f}원 · 호출 ~{dr['est_calls']}회 · "
                       f"팩 빌드 필요: {', '.join(dr['packs_to_build']) or '없음'}")

        can_gen = bool(sel) and not planning_only and has_openai
        if st.button(f"⚙️ {len(sel[:bs])}개 생성", type="primary", disabled=not can_gen, key="gen_btn"):
            ids = sel[:bs]
            with st.status("글 생성 중…", expanded=True) as status:
                def _cb(frac, msg):
                    status.update(label=f"{int(frac*100)}% · {msg}")
                res = pipeline.run_batch(ids, config, _cb)
                status.update(label="생성 완료", state="complete")
            st.session_state["gen_drafts"] = res.get("drafts", [])
            if res.get("stopped"):
                st.warning(res["stopped"])
            if not res.get("ok"):
                st.error(res.get("error", "생성 실패"))
            st.rerun()

        gdrafts = [d for d in (st.session_state.get("gen_drafts") or []) if d.get("ok")]
        if gdrafts:
            st.divider()
            st.subheader(f"생성 결과 {len(gdrafts)}개")
            for d in gdrafts:
                seo = d.get("seo", {})
                rep = d.get("geo", {})
                gate = rep.get("gate", "minor")
                badge = geo_check.GATE_BADGE.get(gate, "🟡")
                mode = d.get("publishMode", "auto")
                with st.expander(f"{badge} [{rep.get('score','?')}] {seo.get('title') or d.get('question')} "
                                 f"· {mode}", expanded=False):
                    render_geo_report(rep)
                    cp = (d.get("synth", {}) or {}).get("citation_pack", {}) or {}
                    if cp.get("answer"):
                        st.markdown(f"**Answer:** {cp['answer']}")
                    st.markdown((d.get("synth", {}) or {}).get("markdown", "")[:1500] + " …")
                    if d.get("verify_flags"):
                        st.warning("확인 필요: " + " · ".join(d["verify_flags"]))

            auto_ready = [d for d in gdrafts
                          if d.get("publishMode") == "auto" and d.get("geo", {}).get("gate") != "rewrite"]
            gated = [d for d in gdrafts if d not in auto_ready]

            def _publish(drafts_to_pub):
                import publish
                with st.spinner("발행 중…"):
                    res = publish.publish_batch(drafts_to_pub, config)
                for r in res.get("results", []):
                    if r.get("ok"):
                        d = next((x for x in drafts_to_pub if (x.get("seo") or {}).get("slug") == r["slug"]), None)
                        if d and d.get("plan_id"):
                            plan.set_status(d["plan_id"], "published")
                return res

            c1, c2 = st.columns(2)
            if c1.button(f"🚀 auto·검수통과 {len(auto_ready)}개 일괄 발행", type="primary",
                         disabled=not auto_ready, key="pub_auto"):
                res = _publish(auto_ready)
                (st.success if res.get("ok") else st.error)(res.get("message", ""))
            c2.caption(f"검수 필요(민감/낮은 점수): {len(gated)}개 — 아래에서 개별 발행")

            for d in gated:
                slug = (d.get("seo") or {}).get("slug", "")
                reason = "민감(review)" if d.get("publishMode") == "review" else "GEO 재작성 권장"
                cc1, cc2 = st.columns([3, 1])
                cc1.markdown(f"- {slug} · _{reason}_")
                if cc2.button("발행", key=f"pub_{slug}"):
                    res = _publish([d])
                    (st.success if res.get("ok") else st.error)(res.get("message", ""))

# ══════════════════════════════════════════════════════════════════════════
#  탭 4 — 라이브러리: 상태 필터 · needsFreshSource · 클러스터별 수
# ══════════════════════════════════════════════════════════════════════════
with tab_lib:
    st.caption("기획·생성·발행 현황. 상태 필터, 최신출처 필요 글, 클러스터별 개수.")
    fstat = st.selectbox("상태 필터", ["all", "planned", "researched", "generated", "ready",
                                     "published", "folded", "failed"], key="lib_filter")
    rows = plan.list_plan(status=None if fstat == "all" else fstat)
    if rows:
        st.dataframe(
            [{"질문": r["question"], "클러스터": r.get("cluster", ""), "유형": r.get("questionType", ""),
              "템플릿": r.get("pageType", ""), "상태": plan.STATUS_LABEL.get(r["status"], r["status"]),
              "GEO": r.get("geoScore"), "발행모드": r.get("publishMode", "")} for r in rows],
            hide_index=True)
    else:
        st.info("해당 상태의 글이 없어요.")

    nfs = [r for r in plan.load_plan() if r.get("needsFreshSource")
           and r.get("status") in ("ready", "published", "generated")]
    if nfs:
        with st.expander(f"⏱️ 최신 출처 확인 필요 {len(nfs)}개"):
            for r in nfs:
                st.markdown(f"- {r['question']} · `{r.get('clusterSlug','')}`")

    with st.expander("📊 클러스터별 개수(기획 큐)"):
        for cs2, counts in plan.counts_by_cluster().items():
            line = " · ".join(f"{plan.STATUS_BADGE.get(k,'')}{plan.STATUS_LABEL[k]} {v}"
                              for k, v in counts.items() if v)
            st.markdown(f"- **{cs2}** — {line or '없음'}")

# ══════════════════════════════════════════════════════════════════════════
#  탭 5 — 측정: AI 인용 측정 기록(수동) · Phase 3 = geo-tracker 자동 연동
# ══════════════════════════════════════════════════════════════════════════
with tab_meas:
    st.caption("발행 글의 AI 인용 측정 결과를 기록합니다. (Phase 3: `D:\\geo-tracker` 자동 연동 예정 — "
               "지금은 수동 기록.)")
    pubs = [o for o in outputs.list_outputs() if o.get("status") == "published"]
    if not pubs:
        st.info("아직 발행된 글이 없어요.")
    else:
        sl = st.selectbox("글", [o["slug"] for o in pubs], key="meas_slug")
        rec = outputs.get_by_slug(sl) or {}
        existing = rec.get("measurementTargets") or []
        if existing:
            st.dataframe(existing, hide_index=True)
        with st.form("meas_form"):
            eng = st.selectbox("엔진", ["ChatGPT", "Perplexity", "Gemini", "Google AI Overview"])
            d1, d2 = st.columns(2)
            appeared = d1.checkbox("검색결과에 등장(appeared)")
            cited = d2.checkbox("인용됨(cited)")
            pos = st.number_input("인용 순위(citationPosition)", min_value=0, max_value=50, value=0)
            cited_url = st.text_input("citedUrl")
            comp = st.text_input("competitorUrls (쉼표로 구분)")
            notes = st.text_input("notes")
            if st.form_submit_button("기록 추가", type="primary"):
                entry = {"targetQuestion": rec.get("question", ""), "engine": eng,
                         "testDate": storage.today_kst_str(), "appeared": bool(appeared),
                         "cited": bool(cited), "citationPosition": int(pos), "citedUrl": cited_url.strip(),
                         "competitorUrls": [c.strip() for c in comp.split(",") if c.strip()],
                         "notes": notes.strip()}
                outputs.set_status(rec.get("output_id"), "",
                                   fields={"measurementTargets": existing + [entry]})
                st.success("기록 추가됨.")
                st.rerun()

# ── 푸터: 발행/기획 현황 ──────────────────────────────────────────────
st.divider()
st.caption("발행 기록 — " + " · ".join(
    f"{outputs.STATUS_BADGE.get(k,'')}{outputs.STATUS_LABEL[k]} {v}"
    for k, v in outputs.status_counts().items()))
st.caption("기획 큐 — " + " · ".join(
    f"{plan.STATUS_BADGE.get(k,'')}{plan.STATUS_LABEL[k]} {v}"
    for k, v in plan.status_counts().items()))
