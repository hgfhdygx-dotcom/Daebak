# -*- coding: utf-8 -*-
"""
app.py — Daebak 운영 콘솔 (내부 운영자 전용)
============================================
외부용 페이지가 아니라 운영자(나)가 매일 쓰는 작업 콘솔. 고정 흐름:
질문 입력 → AI 분류 → 기획 저장 → 생성·발행 → 라이브러리 → 측정 → 갱신 관리.
상단 작업 진행바 + 화면별 '다음 액션' + 상태 배지로 "다음에 뭘 할지"를 항상 보여준다.
질문 생성 도구가 아니라 '질문 묶음 운영 자동화 도구'. GEO 규칙은 본문 노출 X(geo_check 로 검사만).
"""

from __future__ import annotations

import time

import streamlit as st

import config
import geo_check
import guards
import intent_label
import library
import llm
import outputs
import pipeline
import plan
import research
import run_runner
import storage
import taxonomy
import usage
import visuals
import questions

st.set_page_config(page_title="Daebak 운영 콘솔", page_icon="🛠️", layout="wide")
ss = st.session_state
ss.setdefault("view", "기획·분류")

VIEWS = ["기획·분류", "생성·발행", "라이브러리", "측정", "갱신 관리", "빠른 발행"]
STEP_TO_VIEW = {"질문 입력": "기획·분류", "AI 분류": "기획·분류", "기획 저장": "기획·분류",
                "생성·발행": "생성·발행", "측정": "측정", "갱신 관리": "갱신 관리"}

# ── 배지 헬퍼(색상+한국어) ───────────────────────────────────────────────
_SC = {
    "발행됨": ("#e6f4ea", "#137333"), "측정 필요": ("#f3e8fd", "#8430ce"),
    "측정 완료": ("#e0f7fa", "#00796b"), "갱신 필요": ("#feefe3", "#e8710a"),
    "발행 대기": ("#e8f0fe", "#1a73e8"), "기획됨": ("#eef1f4", "#5f6368"),
    "생성 중": ("#f3e8fd", "#8430ce"), "중복 의심": ("#fef7e0", "#9a6700"),
    "실패": ("#fce8e6", "#c5221f"), "보류": ("#eef1f4", "#5f6368"),
}


def sbadge(s: str) -> str:
    bg, fg = _SC.get(s, ("#eee", "#333"))
    return (f'<span style="background:{bg};color:{fg};padding:1px 8px;border-radius:999px;'
            f'font-size:0.72rem;font-weight:700;white-space:nowrap">{s}</span>')


def ibadge(lab: str) -> str:
    return (f'<span style="background:#fff;border:1px solid #ead9d1;color:#b03a1a;padding:1px 7px;'
            f'border-radius:999px;font-size:0.68rem;font-weight:700;white-space:nowrap">{lab}</span>')


def rbadge(role: str) -> str:
    bg, fg = ("#1a1a1a", "#fff") if role == "Pillar" else ("#eef1f4", "#444")
    return (f'<span style="background:{bg};color:{fg};padding:1px 7px;border-radius:999px;'
            f'font-size:0.66rem;font-weight:700">{role}</span>')


def warn_chips(msgs: list):
    if not msgs:
        return
    html = " ".join(
        f'<span style="background:#fff7e0;color:#9a6700;border:1px solid #f0d999;padding:2px 9px;'
        f'border-radius:999px;font-size:0.74rem;margin:2px;display:inline-block">⚠️ {m}</span>'
        for m in msgs)
    st.markdown(html, unsafe_allow_html=True)


def next_box(text: str):
    st.markdown(
        f'<div style="background:#eef4ff;border:1px solid #cfe0ff;border-radius:10px;padding:9px 14px;'
        f'margin:4px 0 12px;font-weight:600;color:#16407a">👉 {text}</div>', unsafe_allow_html=True)


_STATUS_ICON = {"pass": "✅", "warn": "⚠️", "fail": "❌"}


def _guess_pagetype(q: str) -> str:
    s = (q or "").lower()
    if " vs " in s or "versus" in s or ("or " in s and "better" in s):
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


def render_geo_report(report: dict):
    gate = report.get("gate", "minor")
    score = report.get("score", 0)
    badge = geo_check.GATE_BADGE.get(gate, "🟡")
    label = geo_check.GATE_LABEL.get(gate, gate)
    c1, c2 = st.columns([1, 2])
    c1.metric("GEO 점수", f"{score} / 100")
    c2.markdown(f"### {badge} {label}")
    ready = int(getattr(config, "GEO_READY_MIN", 90))
    if score < ready:
        st.warning(f"⚠️ {ready}점 미만 — 발행 전에 아래 항목을 보완하세요.")
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


# ── 상단: 키·사이트 연결 ─────────────────────────────────────────────────
def render_key_panel():
    has_openai = bool(llm.get_api_key_silent("openai"))
    has_git = bool(llm.github_token())
    has_site = bool(getattr(config, "SITE_URL", ""))
    has_indexnow = bool(llm.indexnow_key())
    ok = has_openai and has_site
    with st.expander("⚙️ 키·사이트 연결  " + ("✅ 준비됨" if ok else "⚠️ 설정 필요"), expanded=not ok):
        dot = lambda b: "🟢" if b else "🔴"  # noqa: E731
        st.markdown(
            f"- {dot(has_openai)} **OpenAI 키** — 리서치·글·분류 (없으면 `키입력.bat`)\n"
            f"- {dot(has_site)} **사이트 주소(SITE_URL)** — 발행/미리보기 링크\n"
            f"- {dot(has_git)} **GitHub 토큰** — 자동 발행(git push)\n"
            f"- {dot(has_indexnow)} **IndexNow 키** — 색인 가속(없어도 발행됨)")
        site_url = st.text_input("사이트 주소 (예: https://daebak-pi.vercel.app)",
                                 value=getattr(config, "SITE_URL", ""), key="site_url_in")
        if st.button("💾 사이트 설정 저장", key="save_site"):
            s = storage.safe_load_json(config.SETTINGS_FILE, {}) or {}
            s["SITE_URL"] = site_url.strip().rstrip("/")
            storage.safe_save_json(config.SETTINGS_FILE, s)
            config.SITE_URL = s["SITE_URL"]
            st.success("저장했어요. ✅")
            st.rerun()


# ── 상단: 작업 진행바 ───────────────────────────────────────────────────
def render_progress():
    ws = library.workflow_state()
    steps, current = ws["steps"], ws["current"]
    icon = {"done": "✅", "active": "🔵", "problem": "🟥", "wait": "⬜"}
    cols = st.columns(len(steps))
    for col, (name, sv) in zip(cols, steps.items()):
        is_cur = (name == current)
        if col.button(f"{icon.get(sv, '⬜')} {name}", key=f"step_{name}",
                      type="primary" if is_cur else "secondary", use_container_width=True):
            ss["view"] = STEP_TO_VIEW[name]
            st.rerun()
    st.caption(f"현재 단계: **{current}** · 다음 작업: {ws['next']}")


@st.cache_data(ttl=30, show_spinner=False)
def _q_new_count() -> int:
    return questions.new_count()


def render_secondary_nav():
    c1, c2, c3, c4, _ = st.columns([1, 1, 1, 1, 4])
    if c1.button("📚 라이브러리", key="nav_lib", use_container_width=True):
        ss["view"] = "라이브러리"
        st.rerun()
    if c2.button("⚡ 빠른 발행", key="nav_quick", use_container_width=True):
        ss["view"] = "빠른 발행"
        st.rerun()
    if c3.button("🖼 이미지", key="nav_images", use_container_width=True):
        ss["view"] = "이미지"
        st.rerun()
    _qn = _q_new_count() if questions.is_configured() else 0
    if c4.button(f"❓ 질문 ({_qn})" if _qn else "❓ 질문", key="nav_questions", use_container_width=True):
        ss["view"] = "질문"
        st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  ① 기획·분류
# ══════════════════════════════════════════════════════════════════════════
def render_plan():
    st.subheader("① 기획·분류 — 질문 입력 → AI 분류 → 저장")
    if ss.get("q_draft_flash"):
        st.success(f"질문 인박스에서 만든 초안: **{ss.pop('q_draft_flash')}** — 아래 표에서 "
                   "카테고리/세부 카테고리를 지정한 뒤 [생성·발행]으로 진행하세요.")
    ws = library.workflow_state()
    next_box(f"다음 액션: {ws['next']}")

    taxo = taxonomy.load()
    cl_titles = [c.get("title", "") for c in taxonomy.clusters(taxo)]
    bc_titles = [c.get("title", "") for c in taxonomy.big_categories(taxo)]

    default_qs = ""
    if not plan.load_plan():
        aa = taxonomy.supporting_of("airport-arrival", taxo)
        if aa:
            default_qs = ("PILLAR:\nHow do I get from Incheon Airport to Seoul?\n\nQNA:\n"
                          + "\n".join(q["question"] for q in aa if q.get("question")))
    txt = st.text_area("질문 입력 (PILLAR: / QNA: 라벨, 또는 한 줄에 하나씩)", value=default_qs,
                       height=200, key="batch_qs",
                       placeholder="PILLAR:\nHow do I get from Incheon Airport to Seoul?\n\nQNA:\n"
                                   "What is the cheapest way from Incheon Airport to Seoul?\n...")
    c1, _ = st.columns([1, 4])
    if c1.button("🧭 AI 분류하기", type="primary", key="classify_btn"):
        parsed = pipeline.parse_labeled_questions(txt)
        qs = parsed["all"][:30]
        if not qs:
            st.warning("질문을 입력하세요.")
        else:
            if not bool(llm.get_api_key_silent("openai")):
                st.warning("OpenAI 키가 없어 휴리스틱 분류로만 됩니다. 키를 넣으면 정확해져요.")
            with st.spinner(f"{len(qs)}개 분류·중복감지 중…"):
                pipeline.plan_batch(qs, config, pillar_question=parsed["pillar"])
            st.success(f"{len(qs)}개 분류·저장했어요. 아래 표에서 확인·수정하세요.")
            st.rerun()

    all_rows = plan.list_plan()
    if not all_rows:
        st.info("아직 기획된 질문이 없어요. 위에 PILLAR/QNA 를 넣고 [AI 분류하기]를 누르세요.")
        return

    warn_chips([w["msg"] for w in guards.plan_warnings(all_rows)])

    table = []
    for r in all_rows:
        lab = intent_label.label(r.get("intent"), r.get("question"), r.get("pageType"),
                                 r.get("questionType"), r.get("bigCategory"))
        dup = bool(r.get("dedupeOf")) or any((d or {}).get("is_dup") for d in (r.get("duplicateRisk") or []))
        table.append({
            "plan_id": r.get("plan_id", ""), "역할": r.get("questionType", "supporting"),
            "질문": r.get("question", ""), "추천 제목": r.get("title", ""),
            "카테고리": r.get("bigCategory", ""), "세부 카테고리": r.get("cluster", ""),
            "의도": lab, "템플릿": r.get("pageType", "practical"),
            "우선순위": int(r.get("priority") or 3),
            "상태": plan.STATUS_LABEL.get(r.get("status"), r.get("status")),
            "중복 의심": dup, "중복 처리": r.get("dedupeAction", ""),
        })
    edited = st.data_editor(
        table, hide_index=True, key="plan_editor", use_container_width=True,
        column_config={
            "plan_id": st.column_config.TextColumn("ID", disabled=True, width="small"),
            "역할": st.column_config.SelectboxColumn("역할", options=list(plan.QUESTION_TYPES), width="small"),
            "질문": st.column_config.TextColumn("질문", disabled=True, width="large"),
            "추천 제목": st.column_config.TextColumn("추천 제목"),
            "카테고리": st.column_config.SelectboxColumn("카테고리", options=[""] + bc_titles),
            "세부 카테고리": st.column_config.SelectboxColumn("세부 카테고리(클러스터)", options=[""] + cl_titles),
            "의도": st.column_config.TextColumn("의도", disabled=True, width="small"),
            "템플릿": st.column_config.SelectboxColumn("템플릿", options=list(plan.PAGE_TYPES), width="small"),
            "우선순위": st.column_config.NumberColumn("우선순위", min_value=1, max_value=5, step=1, width="small"),
            "상태": st.column_config.TextColumn("상태", disabled=True, width="small"),
            "중복 의심": st.column_config.CheckboxColumn("중복 의심", disabled=True, width="small"),
            "중복 처리": st.column_config.SelectboxColumn("중복 처리", options=list(plan.DEDUPE_ACTIONS), width="small"),
        })

    cc1, cc2, _ = st.columns([1, 1, 3])
    if cc1.button("💾 기획 저장", type="primary", key="save_plan"):
        import seo as _seo
        n = 0
        for row in edited:
            pid = row.get("plan_id")
            if not pid:
                continue
            fields = {"title": row.get("추천 제목"), "bigCategory": row.get("카테고리"),
                      "cluster": row.get("세부 카테고리"), "questionType": row.get("역할"),
                      "pageType": row.get("템플릿"), "priority": row.get("우선순위"),
                      "dedupeAction": row.get("중복 처리")}
            base = plan.get_by_id(pid) or {}
            merged = pipeline.reconcile_row({**base, **fields}, config)
            if merged.get("title"):
                merged["slug"] = _seo.slugify_no_year(merged["title"])
            plan.update_fields(pid, {k: merged.get(k) for k in (
                "title", "slug", "bigCategory", "bigCategorySlug", "cluster", "clusterSlug",
                "pillarQuestion", "pillarSlug", "questionType", "pageType", "priority",
                "needsFreshSource", "publishMode", "dedupeAction")})
            n += 1
        ss["plan_saved"] = True
        st.rerun()
    cc2.caption("표를 고친 뒤 저장하면 클러스터/슬러그가 자동 재계산됩니다.")

    with st.expander("🗑 기획 행 삭제 (테스트/불필요 행 제거 — 되돌릴 수 없음)"):
        _del_opts = {
            f"{r.get('plan_id')} · {(r.get('question') or r.get('title') or '')[:50]}": r.get("plan_id")
            for r in all_rows
        }
        _del_picks = st.multiselect("삭제할 행 선택", list(_del_opts.keys()), key="plan_del_sel")
        if st.button("🗑 선택 삭제", key="plan_del_btn", disabled=not _del_picks):
            n = plan.delete_many([_del_opts[p] for p in _del_picks])
            st.success(f"{n}개 삭제했어요.")
            st.rerun()

    if ss.get("plan_saved"):
        rows2 = plan.load_plan()
        pil = sum(1 for r in rows2 if r.get("questionType") == "pillar")
        sup = sum(1 for r in rows2 if r.get("questionType") in ("supporting", "faq"))
        dupn = sum(1 for r in rows2 if r.get("dedupeOf")
                   or any((d or {}).get("is_dup") for d in (r.get("duplicateRisk") or [])))
        readyn = sum(1 for r in rows2 if r.get("status") in ("planned", "ready", "researched", "generated")
                     and not r.get("dedupeOf"))
        st.success(f"기획 저장 완료 — 총 {len(rows2)}개 · Pillar {pil} · 보조 {sup} · 중복 의심 {dupn} · 발행 준비 {readyn}")
        b1, b2 = st.columns([1, 1])
        if b1.button("➡️ 생성·발행으로 이동", type="primary", key="go_gen"):
            ss["view"] = "생성·발행"
            ss["plan_saved"] = False
            st.rerun()
        if b2.button("📚 라이브러리에서 확인", key="go_lib"):
            ss["view"] = "라이브러리"
            ss["plan_saved"] = False
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  ④ 생성·발행 (자동 큐)
# ══════════════════════════════════════════════════════════════════════════
def _render_gen_results():
    gdrafts = [d for d in (ss.get("gen_drafts") or []) if d.get("ok")]
    if not gdrafts:
        return
    st.divider()
    st.subheader(f"생성 결과 {len(gdrafts)}개")
    for d in gdrafts:
        seo = d.get("seo", {})
        rep = d.get("geo", {})
        badge = geo_check.GATE_BADGE.get(rep.get("gate", "minor"), "🟡")
        with st.expander(f"{badge} [{rep.get('score', '?')}] {seo.get('title') or d.get('question')} · {d.get('publishMode', 'auto')}"):
            render_geo_report(rep)
            cp = (d.get("synth", {}) or {}).get("citation_pack", {}) or {}
            if cp.get("answer"):
                st.markdown(f"**Answer:** {cp['answer']}")
            st.markdown((d.get("synth", {}) or {}).get("markdown", "")[:1500] + " …")
            if d.get("verify_flags"):
                st.warning("확인 필요: " + " · ".join(d["verify_flags"]))

    auto_ready = [d for d in gdrafts if d.get("publishMode") == "auto" and d.get("geo", {}).get("gate") != "rewrite"]
    gated = [d for d in gdrafts if d not in auto_ready]

    def _publish(drafts_to_pub):
        import publish
        # 더블클릭/재클릭 방지: 이미 발행된 slug 는 건너뜀(중복 push 방지, 멱등).
        fresh = [d for d in drafts_to_pub
                 if (outputs.get_by_slug((d.get("seo") or {}).get("slug", "")) or {}).get("status") != "published"]
        if not fresh:
            return {"ok": True, "message": "이미 발행된 글이에요 — 중복 발행하지 않았어요.", "results": []}
        with st.spinner("발행 중…"):
            res = publish.publish_batch(fresh, config)
        pub_slugs = set()
        for r in res.get("results", []):
            if r.get("ok"):
                pub_slugs.add(r["slug"])
                d = next((x for x in fresh if (x.get("seo") or {}).get("slug") == r["slug"]), None)
                if d and d.get("plan_id"):
                    plan.set_status(d["plan_id"], "published")
        # 발행된 건 결과 목록에서 제거 → 발행 버튼이 사라져 재클릭 자체가 불가
        ss["gen_drafts"] = [d for d in (ss.get("gen_drafts") or [])
                            if (d.get("seo") or {}).get("slug") not in pub_slugs]
        return res

    c1, c2 = st.columns(2)
    if c1.button(f"🚀 자동·검수통과 {len(auto_ready)}개 일괄 발행", type="primary",
                 disabled=not auto_ready, key="pub_auto"):
        res = _publish(auto_ready)
        (st.success if res.get("ok") else st.error)(res.get("message", ""))
        st.rerun()
    c2.caption(f"검수 필요(민감/낮은 점수): {len(gated)}개 — 아래에서 개별 발행")
    for d in gated:
        slug = (d.get("seo") or {}).get("slug", "")
        reason = "민감(review)" if d.get("publishMode") == "review" else "GEO 재작성 권장"
        cc1, cc2 = st.columns([3, 1])
        cc1.markdown(f"- {slug} · _{reason}_")
        if cc2.button("발행", key=f"pub_{slug}"):
            res = _publish([d])
            (st.success if res.get("ok") else st.error)(res.get("message", ""))
            st.rerun()


def render_generate():
    st.subheader("④ 생성·발행 — 자동 발행 큐")
    cl_slugs = sorted({r.get("clusterSlug") for r in plan.load_plan() if r.get("clusterSlug")})
    if not cl_slugs:
        next_box("다음 액션: 먼저 ① 기획·분류에서 질문을 분류·저장하세요.")
        st.info("기획된 클러스터가 없어요.")
        return

    def _cl_label(cs):
        rec = taxonomy.cluster(cs)
        return rec.get("title", cs) if rec else cs

    focus = ss.pop("gen_cluster_focus", None)
    default_idx = cl_slugs.index(focus) if focus in cl_slugs else 0
    cs = st.selectbox("클러스터", cl_slugs, index=default_idx, format_func=_cl_label, key="gen_cluster")
    bs = st.selectbox("발행 개수", config.BATCH_SIZES,
                      index=config.BATCH_SIZES.index(getattr(config, "BATCH_DEFAULT", 5)), key="gen_bs")
    planning_only = bs >= getattr(config, "BATCH_PLANNING_ONLY", 20)

    pack = research.load_cluster_pack(cs)
    if pack:
        stale = research.is_pack_stale(pack)
        st.caption(f"📦 리서치 팩: 마지막 확인 {pack.get('lastChecked', '?')} · "
                   + ("🔴 오래됨(재리서치 권장)" if stale else "🟢 신선")
                   + f" · 출처 {len(pack.get('officialSources') or [])}개")
    else:
        st.caption("📦 리서치 팩 없음 — 첫 생성 때 pillar 질문으로 자동 빌드돼요.")
    if st.button("🔄 리서치 팩 새로 만들기(강제)", key="rebuild_pack",
                 disabled=not bool(llm.get_api_key_silent("openai"))):
        with st.spinner("클러스터 리서치 중…"):
            pipeline.ensure_cluster_pack(cs, force=True, cfg=config)
        st.success("리서치 팩 갱신 완료.")
        st.rerun()

    auto_ids = pipeline.auto_select_batch(cs, bs, config)
    id2row = {r["plan_id"]: r for r in plan.list_plan(cluster_slug=cs)}
    targets = [id2row[i] for i in auto_ids if i in id2row]

    next_box(f"다음 액션: {_cl_label(cs)} 에서 발행 대기 {len(targets)}개를 자동 선택했습니다. "
             f"[선택된 {len(targets)}개 생성·발행]만 누르세요.")
    if planning_only:
        st.warning("⛔ 20개는 기획 전용 — 5개씩 나눠 생성하세요.")
    warn_chips([w["msg"] for w in guards.publish_warnings(targets)])

    st.markdown("**자동 선택된 발행 대상**")
    if not targets:
        st.info("이 클러스터에 발행 대기 중인 질문이 없어요(모두 발행됐거나 중복/보류).")
    else:
        for i, r in enumerate(targets, 1):
            lab = intent_label.label(r.get("intent"), r.get("question"), r.get("pageType"),
                                     r.get("questionType"), r.get("bigCategory"))
            st.markdown(f"{i}. {ibadge(lab)} &nbsp;{r.get('question', '')}", unsafe_allow_html=True)
        dr = pipeline.dry_run_batch(auto_ids[:bs], config)
        st.caption(f"예상 비용 ~{dr['krw']:,.0f}원 · 호출 ~{dr['est_calls']}회 · "
                   f"팩 빌드: {', '.join(dr['packs_to_build']) or '없음'}")

    has_openai = bool(llm.get_api_key_silent("openai"))
    can_gen = bool(targets) and not planning_only and has_openai
    if st.button(f"⚙️ 선택된 {len(targets)}개 생성·발행", type="primary", disabled=not can_gen, key="gen_btn"):
        with st.status("글 생성 중…", expanded=True) as status:
            def _cb(frac, msg):
                status.update(label=f"{int(frac * 100)}% · {msg}")
            res = pipeline.run_batch(auto_ids[:bs], config, _cb)
            status.update(label="생성 완료", state="complete")
        ss["gen_drafts"] = res.get("drafts", [])
        if res.get("stopped"):
            st.warning(res["stopped"])
        st.rerun()

    _render_gen_results()

    with st.expander("🔧 고급 설정 — 발행할 질문 직접 선택"):
        rows = [r for r in plan.list_plan(cluster_slug=cs)
                if r.get("status") in ("planned", "researched", "generated", "ready")]
        opts = {r["plan_id"]: f'{plan.STATUS_BADGE.get(r["status"], "")} {r["question"][:55]} · [{r["pageType"]}]'
                for r in rows}
        man = st.multiselect("발행할 질문 선택", list(opts), format_func=lambda i: opts.get(i, i), key="gen_manual")
        if st.button("이 선택으로 생성·발행", disabled=not (man and has_openai), key="gen_manual_btn"):
            with st.spinner("생성 중…"):
                res = pipeline.run_batch(man[:bs], config)
            ss["gen_drafts"] = res.get("drafts", [])
            st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  라이브러리 (운영 대시보드)
# ══════════════════════════════════════════════════════════════════════════
def _lib_row(it: dict, cluster: dict):
    col1, col2 = st.columns([0.82, 0.18])
    geo = f' · GEO {int(it["geoScore"])}' if isinstance(it.get("geoScore"), (int, float)) else ""
    lm = f' · 측정 {it["lastMeasured"]}' if it.get("lastMeasured") else ""
    col1.markdown(
        f'{rbadge(it["role"])} {sbadge(it["status"])} {ibadge(it["intent"])}<br>'
        f'<span style="font-size:0.88rem">{it["question"]}</span>'
        f'<span style="color:#999;font-size:0.74rem">{geo}{lm}</span>', unsafe_allow_html=True)
    status = it["status"]
    key = f'act_{it.get("plan_id") or it.get("output_id") or it.get("slug")}'
    if status in ("발행 대기", "기획됨"):
        if col2.button("발행하기", key=key, use_container_width=True):
            ss["gen_cluster_focus"] = cluster["clusterSlug"]
            ss["view"] = "생성·발행"
            st.rerun()
    elif status == "측정 필요":
        if col2.button("측정하기", key=key, use_container_width=True):
            ss["measure_focus"] = it["output_id"]
            ss["view"] = "측정"
            st.rerun()
    elif status == "갱신 필요":
        if col2.button("갱신하기", key=key, use_container_width=True):
            ss["view"] = "갱신 관리"
            st.rerun()
    elif status == "중복 의심":
        if col2.button("중복 확인", key=key, use_container_width=True):
            ss["view"] = "기획·분류"
            st.rerun()
    elif it.get("live_url") and hasattr(st, "link_button"):
        col2.link_button("보기", it["live_url"], use_container_width=True)


def render_library():
    st.subheader("라이브러리 — 클러스터별 운영 현황")
    data = library.cluster_overview()
    s = data["summary"]
    pub_total = s.get("발행됨", 0) + s.get("측정 완료", 0) + s.get("측정 필요", 0) + s.get("갱신 필요", 0)
    cards = [("전체 질문", s.get("전체", 0)), ("발행됨", pub_total), ("발행 대기", s.get("발행 대기", 0)),
             ("기획됨", s.get("기획됨", 0)), ("측정 필요", s.get("측정 필요", 0)),
             ("갱신 필요", s.get("갱신 필요", 0)), ("중복 의심", s.get("중복 의심", 0)), ("실패", s.get("실패", 0))]
    cols = st.columns(len(cards))
    for col, (k, v) in zip(cols, cards):
        col.metric(k, v)
    next_box(f"다음 액션: 발행 대기 {s.get('발행 대기', 0)} · 측정 필요 {s.get('측정 필요', 0)} · "
             f"갱신 필요 {s.get('갱신 필요', 0)} · 중복 의심 {s.get('중복 의심', 0)}")

    f1, f2 = st.columns([2, 2])
    status_filter = f1.selectbox("상태 필터", ["전체", "발행 대기", "발행됨", "측정 필요", "갱신 필요",
                                            "중복 의심", "실패", "보류", "기획됨"], key="lib_status")
    cl_opts = ["전체 클러스터"] + [c["cluster"] for c in data["clusters"]]
    cl_filter = f2.selectbox("클러스터 필터", cl_opts, key="lib_cluster")

    shown = 0
    for c in data["clusters"]:
        if cl_filter != "전체 클러스터" and c["cluster"] != cl_filter:
            continue
        items = c["items"]
        if status_filter != "전체":
            items = [it for it in items if it["status"] == status_filter]
        if not items:
            continue
        shown += 1
        head = (f'{c["cluster"]} — {c["published"]}/{c["total"]} 발행 · 대기 {c["pending"]} · '
                f'측정 {c["measure"]} · 갱신 {c["update"]} · 중복 {c["dup"]}')
        with st.expander(head, expanded=(cl_filter != "전체 클러스터")):
            if c["total"]:
                st.progress(min(1.0, c["published"] / c["total"]))
            for it in items:
                _lib_row(it, c)
    if shown == 0:
        st.info("해당 조건의 항목이 없어요.")


# ══════════════════════════════════════════════════════════════════════════
#  ⑤ 측정 (자동 큐)
# ══════════════════════════════════════════════════════════════════════════
def render_measure():
    st.subheader("⑤ 측정 — AI 인용 측정 큐")
    queue = library.measurement_queue()
    next_box(f"다음 액션: 발행된 글 {len(queue)}개의 ChatGPT/Gemini/Perplexity 인용 여부를 기록하세요.")
    if not queue:
        st.info("측정이 필요한 발행 글이 없어요(모두 최근에 측정됨).")
        return
    focus = ss.get("measure_focus")
    for o in queue:
        oid = o.get("output_id")
        lm = library.last_measured(o)
        title = o.get("question") or o.get("title")
        head = f'{title}  ·  발행됨 · 측정 필요 · 마지막 측정 {lm or "없음"}'
        with st.expander(head, expanded=(oid == focus)):
            st.caption("엔진 슬롯: ChatGPT / Gemini / Perplexity")
            with st.form(f"meas_{oid}"):
                eng = st.selectbox("엔진", ["ChatGPT", "Gemini", "Perplexity", "Google AI Overview"], key=f"e_{oid}")
                d1, d2 = st.columns(2)
                appeared = d1.checkbox("검색결과 등장", key=f"a_{oid}")
                cited = d2.checkbox("인용됨", key=f"c_{oid}")
                pos = st.number_input("인용 순위", min_value=0, max_value=50, value=0, key=f"p_{oid}")
                cited_url = st.text_input("인용 URL", key=f"u_{oid}")
                comp = st.text_input("경쟁 URL (쉼표로 구분)", key=f"k_{oid}")
                notes = st.text_input("메모", key=f"n_{oid}")
                if st.form_submit_button("💾 측정 결과 저장", type="primary"):
                    entry = {"targetQuestion": o.get("question", ""), "engine": eng,
                             "testDate": storage.today_kst_str(), "appeared": bool(appeared),
                             "cited": bool(cited), "citationPosition": int(pos), "citedUrl": cited_url.strip(),
                             "competitorUrls": [x.strip() for x in comp.split(",") if x.strip()],
                             "notes": notes.strip()}
                    existing = o.get("measurementTargets") or []
                    outputs.set_status(oid, "", fields={"measurementTargets": existing + [entry]})
                    updated = outputs.get_by_id(oid) or {}
                    if library.needs_update_reasons(updated):
                        outputs.set_status(oid, "needs_update")
                    ss["measure_focus"] = None
                    st.success("측정 저장 — 다음 항목으로 이동합니다.")
                    st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  ⑥ 갱신 관리
# ══════════════════════════════════════════════════════════════════════════
def render_update():
    st.subheader("⑥ 갱신 관리 — 갱신 필요 항목")
    pub = [o for o in outputs.list_outputs() if o.get("status") in ("published", "needs_update")]
    items = [(o, library.needs_update_reasons(o)) for o in pub]
    items = [(o, r) for o, r in items if r]
    next_box(f"다음 액션: 갱신 필요 {len(items)}개를 확인하세요.")
    if not items:
        st.info("갱신이 필요한 글이 없어요.")
        return
    for o, reasons in items:
        oid, slug = o.get("output_id"), o.get("slug")
        with st.expander(f'{o.get("question") or o.get("title")}  ·  {", ".join(reasons)}'):
            st.markdown(" ".join(
                f'<span style="background:#feefe3;color:#e8710a;padding:2px 9px;border-radius:999px;'
                f'font-size:0.74rem;margin:2px;display:inline-block">{r}</span>' for r in reasons),
                unsafe_allow_html=True)
            b1, b2 = st.columns(2)
            if o.get("status") != "needs_update" and b1.button("갱신 필요로 표시", key=f"nu_{oid}"):
                outputs.set_status(oid, "needs_update")
                st.rerun()
            if b2.button("재생성 큐로(발행 대기)", key=f"rq_{oid}"):
                pr = plan.get_by_slug(slug)
                if pr:
                    plan.set_status(pr["plan_id"], "ready")
                st.success("재생성 큐(발행 대기)로 보냈어요.")
                st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  ⚡ 빠른 발행 (보조 — 일회성 1개)
# ══════════════════════════════════════════════════════════════════════════
def render_quick():
    st.subheader("⚡ 빠른 발행 — 한 줄 질문 1개")
    next_box("다음 액션: 일회성 질문 1개를 즉시 만들어 발행할 때만 사용하세요(평소엔 ① 기획·분류 → ④ 생성·발행).")
    question = st.text_input("외국인이 묻는 영어 질문 한 줄", key="question",
                             placeholder="e.g.  How do I get from Incheon Airport to Seoul?")
    engine = st.selectbox("리서치 엔진", ["openai", "perplexity", "gemini"],
                          index=["openai", "perplexity", "gemini"].index(
                              getattr(config, "RESEARCH_ENGINE", "openai")))
    guard = pipeline.dry_run(question or "(질문 예시)", config)
    est = guard["estimate"]
    st.metric("이 글 예상 비용", f"약 {est['krw']:,.0f}원",
              help=f"검색 {est['search_calls']}회 등 총 {est['total_calls']}회 호출")
    if guard["blocked"]:
        for r in guard["reasons"]:
            st.error("⛔ " + r)

    running = run_runner.is_running()
    can_run = bool(question.strip()) and not guard["blocked"] and not running
    if st.button("▶ 글 만들기 시작", type="primary", disabled=not can_run, key="run_btn"):
        if not bool(llm.get_api_key_silent("openai")):
            st.warning("OpenAI 키가 없어요. 무료 초안(검토 필요)으로만 만들어져요.")
        run_runner.start(question.strip(), engine, config)
        st.rerun()
    if running:
        cur = run_runner.current()
        st.progress(float(cur["progress"]), text=cur["message"] or "작업 중…")
        time.sleep(0.6)
        st.rerun()
    cur = run_runner.current()
    if (not running) and cur.get("result") and not ss.get("draft"):
        ss["draft"] = cur["result"]
        run_runner.clear()

    draft = ss.get("draft")
    if not draft:
        return
    st.divider()
    st.subheader("미리보기")
    if draft.get("error"):
        st.warning(draft["error"])
    if not draft.get("ok"):
        st.error("실패: " + (draft.get("error") or "알 수 없는 오류"))
    else:
        synth, seo = draft.get("synth", {}), draft.get("seo", {})
        cp = synth.get("citation_pack", {}) or {}
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
                st.markdown(f"**Q. {f.get('q', '')}**")
                st.markdown(f.get("a", ""))
        st.metric("이 글에 쓴 비용", f"약 {draft.get('cost_spent_krw', 0):,.0f}원")
        if draft.get("verify_flags"):
            st.warning("⚠️ **확인 필요**:\n" + "\n".join(f"- {x}" for x in draft["verify_flags"]))
        st.subheader("발행")
        if report.get("gate") == "rewrite":
            st.error("GEO 점수가 낮아요(재작성 권장). 그래도 발행하려면 아래 버튼을 누르세요.")
        already_pub = (outputs.get_by_slug((seo or {}).get("slug", "")) or {}).get("status") == "published"
        if already_pub:
            st.info("이미 발행된 글이에요 — 중복 발행하지 않아요. (수정하려면 새로 생성하세요)")
        if st.button("✅ OK 발행", type="primary", key="publish_btn", disabled=already_pub):
            import publish
            with st.spinner("발행 중…"):
                res = publish.publish_article(draft, config)
            if res.get("ok") and res.get("mode") == "git_pushed":
                st.success(f"발행 완료! 🔗 {res.get('live_url')}")
            elif res.get("mode") == "file_only":
                st.info(f"📄 파일로 저장했어요(사이트 연결 전). 위치: `{res.get('saved_path', '')}`")
            else:
                st.error("발행 실패: " + res.get("message", "알 수 없는 오류"))
    if st.button("🆕 새 질문", key="reset_btn"):
        ss.pop("draft", None)
        st.rerun()


# ══════════════════════════════════════════════════════════════════════════
#  🖼 Image Manager — Unsplash 카테고리/클러스터 대표 비주얼 (선택형, hotlink)
# ══════════════════════════════════════════════════════════════════════════
def render_images():
    st.subheader("🖼 Image Manager — Unsplash (카테고리 / 클러스터 비주얼)")
    next_box("① 카테고리·클러스터를 고르고 → ② **Unsplash 후보 불러오기** → ③ 마음에 드는 사진의 **Apply** "
             "를 누르면 그 자리에 적용됩니다. 사진은 다운로드하지 않고 Unsplash 에서 **hotlink** 로 표시되고, "
             "Apply 시 Unsplash **download 가 트리거**되며 **사진가 attribution** 이 함께 저장됩니다. "
             "작은 Q&A 카드에는 큰 사진을 넣지 않아요.")

    # ── Unsplash Access Key (서버 전용) ────────────────────────────────────
    has_key = visuals.has_key()
    with st.expander("Unsplash Access Key  " + ("✅ 입력됨 (서버 전용)" if has_key else "⚠️ 필요"),
                     expanded=not has_key):
        st.markdown(
            "1) **unsplash.com/developers** → **New Application**(무료)\n"
            "2) **Access Key** 복사 → 아래에 붙여넣고 저장 (Secret 은 선택)\n\n"
            "→ 키는 `settings.json`(서버, gitignore)에만 저장됩니다. 사이트/클라이언트 번들엔 노출되지 않아요.")
        k = st.text_input("Access Key", value=getattr(config, "UNSPLASH_ACCESS_KEY", ""),
                          type="password", key="unsplash_key_in")
        if st.button("💾 키 저장", key="save_unsplash"):
            s = storage.safe_load_json(config.SETTINGS_FILE, {}) or {}
            s["UNSPLASH_ACCESS_KEY"] = (k or "").strip()
            storage.safe_save_json(config.SETTINGS_FILE, s)
            config.UNSPLASH_ACCESS_KEY = (k or "").strip()
            st.success("저장했어요. ✅")
            st.rerun()

    # ── 대상 선택 ──────────────────────────────────────────────────────────
    targets = visuals.list_targets()
    big = sum(1 for t in targets if t["type"] == "bigCategory")
    have = sum(1 for t in targets if t.get("current"))
    st.caption(f"대상 {len(targets)}개 (큰 카테고리 {big} + 클러스터 {len(targets) - big}) · "
               f"적용됨 {have} / 비어있음 {len(targets) - have}")

    def _label(t):
        mark = "🟢" if t.get("current") else "⬜"
        lvl = "큰" if t["type"] == "bigCategory" else "중간"
        return f"{mark} [{lvl}] {t['title']}  ·  {t['type']}:{t['key']}"

    options = {_label(t): t for t in targets}
    pick = st.selectbox("카테고리 / 클러스터 선택", list(options.keys()), key="img_target_pick")
    target = options[pick]
    tkey = f"{target['type']}:{target['key']}"

    # ── 현재 적용된 사진 + attribution + 메타데이터 ─────────────────────────
    cur = target.get("current")
    if cur:
        st.markdown("**현재 적용된 사진**")
        cc = st.columns([1, 3])
        try:
            cc[0].image(cur.get("urlSmall") or cur.get("url"), width=190)
        except Exception:  # noqa: BLE001
            cc[0].write("🟢")
        with cc[1]:
            st.markdown(f"📸 Photo by **{cur.get('photographerName')}** on Unsplash")
            st.caption(f"unsplashId `{cur.get('unsplashId')}` · download **{cur.get('downloadTriggerStatus')}** "
                       f"@ {cur.get('downloadTriggeredAt')}")
            st.caption(f"appliedAt {cur.get('appliedAt')}")
            st.caption(f"source {cur.get('sourceUrl')}")
        b1, b2 = st.columns(2)
        if b1.button("🗑 비우기(Clear) → 흰 패널", key="img_clear"):
            visuals.clear_visual(target["type"], target["key"])
            ss.pop("img_cands", None)
            ss.pop("img_applied", None)
            st.rerun()
        if b2.button("🔁 다른 후보 다시 보기(Regenerate)", key="img_regen"):
            ss.pop("img_cands", None)

    # ── 후보 불러오기 ──────────────────────────────────────────────────────
    st.divider()
    if st.button("🔎 Unsplash 후보 불러오기", type="primary", disabled=not has_key, key="img_search"):
        with st.spinner("Unsplash 검색 중…"):
            try:
                ss["img_cands"] = {"target": tkey, "items": visuals.get_candidates(target, per_page=12)}
            except Exception as e:  # noqa: BLE001
                ss["img_cands"] = {"target": tkey, "items": [], "error": str(e)}
    if not has_key:
        st.caption("먼저 위에서 Unsplash Access Key 를 저장하세요.")

    cands = ss.get("img_cands")
    if cands and cands.get("target") == tkey:
        items = cands.get("items") or []
        if cands.get("error"):
            st.error("검색 실패(요청 한도/네트워크): " + str(cands["error"]))
        elif not items:
            st.warning("후보가 없어요. 검색어가 너무 좁을 수 있어요 — 잠시 후 다시 시도하거나 taxonomy 의 visualQuery 를 조정하세요.")
        else:
            st.markdown(f"**후보 {len(items)}개** — 마음에 드는 사진의 **Apply** 를 누르세요. "
                        "(그 순간에만 Unsplash download 가 트리거됩니다. 보기만 할 땐 호출 안 함.)")
            ncol = 3
            for ri in range(0, len(items), ncol):
                row = items[ri:ri + ncol]
                cols = st.columns(ncol)
                for ci, cand in enumerate(row):
                    with cols[ci]:
                        try:
                            st.image(cand.get("thumb") or cand.get("urlSmall") or cand.get("url"), width=210)
                        except Exception:  # noqa: BLE001
                            st.write("🖼")
                        st.caption(f"Photo by {cand.get('photographerName')} on Unsplash")
                        if st.button("✅ Apply", key=f"apply_{cand.get('unsplashId')}_{ri}_{ci}"):
                            with st.spinner("적용 + Unsplash download 트리거 중…"):
                                rec = visuals.apply_visual(cand, target["type"], target["key"])
                            ss["img_applied"] = rec
                            ss.pop("img_cands", None)
                            st.rerun()

    # ── Apply 결과(메타데이터, 스크린샷용) ──────────────────────────────────
    applied = ss.get("img_applied")
    if applied and f"{applied.get('targetType')}:{applied.get('targetKey')}" == tkey:
        st.success(f"적용 완료 ✅  — Photo by {applied.get('photographerName')} on Unsplash")
        st.json({
            "targetType": applied.get("targetType"),
            "targetKey": applied.get("targetKey"),
            "unsplashId": applied.get("unsplashId"),
            "photographerName": applied.get("photographerName"),
            "downloadTriggeredAt": applied.get("downloadTriggeredAt"),
            "downloadTriggerStatus": applied.get("downloadTriggerStatus"),
            "sourceUrl": applied.get("sourceUrl"),
            "appliedAt": applied.get("appliedAt"),
        })

    # ── 배포 ───────────────────────────────────────────────────────────────
    st.divider()
    st.caption("적용한 이미지는 `site/content/visuals.json` 에 저장됩니다. 라이브 사이트에 반영하려면 올리세요.")
    if st.button("🚀 GitHub 에 올리기(배포)", type="primary", key="img_push"):
        with st.spinner("커밋·푸시 중…"):
            push = visuals.push_visuals()
        if push.get("ok"):
            st.success("올렸어요. 약 1분 뒤 자동 배포됩니다(그 후 Ctrl+Shift+R). ✅")
        elif push.get("reason") == "not_ready":
            st.warning("GitHub 토큰/원격 미설정 — `깃토큰입력.bat` 후 다시 시도하세요.")
        else:
            st.error("푸시 실패: " + str(push.get("log", push.get("reason", ""))))


# ══════════════════════════════════════════════════════════════════════════
#  ❓ 질문 인박스 — 외국인 질문 수집 → 답변/발행 (Supabase)
# ══════════════════════════════════════════════════════════════════════════
_Q_STATUSES = ["new", "reviewing", "answered", "draft_created", "published", "rejected", "spam"]
_Q_CATS = ["all", "K-Beauty", "Shopping Apps & Stores", "Korean Brands & Products",
           "Travel Essentials", "Local Shopping Places", "Korean Snacks & Food"]
_Q_STATUS_KO = {"new": "신규", "reviewing": "검토중", "answered": "답변완료",
                "draft_created": "초안생성", "published": "발행됨", "rejected": "거절", "spam": "스팸"}
_Q_PRIORITY_KO = {"low": "낮음", "normal": "보통", "high": "높음"}


def _ko_status(s):
    return _Q_STATUS_KO.get(s, s)


def _ko_priority(p):
    return _Q_PRIORITY_KO.get(p, p)


def _render_question_detail(q: dict):
    qid = q["id"]
    st.markdown(f"**{q.get('display_id') or ''}**")
    st.markdown(f"### {q.get('question', '')}")
    m = st.columns(3)
    m[0].caption(f"상태 **{_ko_status(q.get('status'))}** · 우선순위 {_ko_priority(q.get('priority'))}")
    m[1].caption(f"카테고리 {q.get('category_guess') or '—'} · 의도 {q.get('intent_guess') or '—'}")
    m[2].caption(f"{(q.get('created_at') or '')[:16]} · {q.get('source_component') or ''}")
    if q.get("email"):
        st.caption(f"✉️ {q.get('email')}  ·  알림희망={q.get('notify_on_answer')}  ·  발송상태={q.get('notification_status')}")
    st.caption("질문자에게 준 상태 페이지 링크:")
    st.code(questions.status_url(q.get("public_token", "")), language=None)

    # 메모 / 우선순위 / 상태
    a = st.columns([3, 1, 1])
    notes = a[0].text_area("관리자 메모", value=q.get("admin_notes") or "", key=f"q_notes_{qid}", height=80)
    pri = a[1].selectbox("우선순위", ["low", "normal", "high"], format_func=_ko_priority,
                         index=["low", "normal", "high"].index(q.get("priority", "normal")), key=f"q_pri_{qid}")
    cur_st = q.get("status", "new")
    new_st = a[2].selectbox("상태", _Q_STATUSES, format_func=_ko_status,
                            index=_Q_STATUSES.index(cur_st) if cur_st in _Q_STATUSES else 0, key=f"q_st_{qid}")
    if a[0].button("💾 저장 (메모·우선순위·상태)", key=f"q_savemeta_{qid}"):
        questions.update_question(qid, {"admin_notes": notes, "priority": pri, "status": new_st})
        st.success("저장했어요. ✅")
        st.rerun()

    st.divider()
    b = st.columns(3)
    # 1) 답변 초안 생성 → 콘텐츠 파이프라인(① 기획·분류)으로 바로 이동
    if b[0].button("📝 답변 초안 생성", key=f"q_draft_{qid}"):
        pid = questions.question_to_plan(q)
        if pid:
            questions.update_question(qid, {"answer_draft_id": pid, "status": "draft_created"})
            ss["q_draft_flash"] = pid
            ss["view"] = "기획·분류"   # 초안이 들어간 화면으로 이동
            st.rerun()
        else:
            st.error("초안 생성 실패")
    if q.get("answer_draft_id"):
        b[0].caption(f"초안: `{q.get('answer_draft_id')}`")
    # 2) 발행된 답변 페이지 연결
    pub = b[1].text_input("발행된 답변 URL", value=q.get("published_url") or "", key=f"q_pub_{qid}")
    if b[1].button("🔗 연결 + 발행됨 처리", key=f"q_linkpub_{qid}"):
        questions.update_question(qid, {"published_url": (pub or "").strip(), "status": "published"})
        st.success("연결했어요 → 상태: 발행됨 ✅")
        st.rerun()
    # 3) 질문자에게 답변 알림 — '발행 후'에만(URL 연결 필수)
    if b[2].button("📧 질문자에게 알림 보내기", key=f"q_email_{qid}"):
        if not q.get("email"):
            st.warning("이메일 없는 질문이에요.")
        elif not (q.get("published_url") or "").strip():
            st.warning("먼저 발행된 답변 URL 을 연결하세요(답변 페이지 없이 발송 금지).")
        else:
            res = questions.send_answer_email(q)
            questions.update_question(qid, {"notification_status": res,
                                            "notified_at": storage.now_kst().isoformat(timespec="seconds")})
            (st.success if res == "sent" else st.warning)(f"이메일 알림: {res}")
            st.rerun()
    if not questions.email_configured():
        b[2].caption("이메일(Resend) 미설정")

    st.divider()
    cdel = st.columns([1, 2, 3])
    if cdel[0].button("✖ 닫기", key=f"q_close_{qid}"):
        ss.pop("q_sel", None)
        st.rerun()
    confirm = cdel[1].checkbox("영구 삭제 확인", key=f"q_delchk_{qid}")
    if cdel[2].button("🗑 질문 삭제", key=f"q_del_{qid}", disabled=not confirm):
        if questions.delete_question(qid):
            ss.pop("q_sel", None)
            st.cache_data.clear()
            st.success("삭제했어요.")
            st.rerun()
        else:
            st.error("삭제 실패")


def render_questions():
    st.subheader("❓ 질문 인박스 — 외국인 질문 수집 → 답변 → 발행")
    next_box("사이트 검색에서 외국인이 로그인 없이 남긴 질문이 여기로 들어옵니다. 보고 → 답변 draft 생성 → "
             "발행 후 published URL 연결 → (이메일 있으면) 알림. 질문은 public 에 자동 노출되지 않아요.")

    if not questions.is_configured():
        with st.expander("Supabase 연결  ⚠️ 필요", expanded=True):
            st.markdown(
                "1) **supabase.com → New project**\n"
                "2) **SQL Editor** 에 `supabase/questions.sql` 실행\n"
                "3) **Settings → API** 에서 Project URL + **service_role** key 복사 → 아래 저장\n\n"
                "→ ⚠️ 같은 값을 **Vercel 프로젝트 env**(SUPABASE_URL, SUPABASE_SERVICE_KEY)에도 넣어야 사이트 제출이 동작합니다.")
            u = st.text_input("SUPABASE_URL", value=getattr(config, "SUPABASE_URL", ""), key="sb_url_in")
            k = st.text_input("SUPABASE_SERVICE_KEY", value=getattr(config, "SUPABASE_SERVICE_KEY", ""),
                              type="password", key="sb_key_in")
            if st.button("💾 저장", key="save_sb"):
                s = storage.safe_load_json(config.SETTINGS_FILE, {}) or {}
                s["SUPABASE_URL"] = (u or "").strip()
                s["SUPABASE_SERVICE_KEY"] = (k or "").strip()
                storage.safe_save_json(config.SETTINGS_FILE, s)
                config.SUPABASE_URL = (u or "").strip()
                config.SUPABASE_SERVICE_KEY = (k or "").strip()
                st.cache_data.clear()
                st.success("저장했어요. ✅")
                st.rerun()
        return

    counts = questions.counts_by_status()
    st.caption(f"전체 {counts.get('_total', 0)} · 🆕 신규 {counts.get('new', 0)} · 검토중 {counts.get('reviewing', 0)} "
               f"· 초안 {counts.get('draft_created', 0)} · 발행 {counts.get('published', 0)} · 스팸 {counts.get('spam', 0)}")

    f = st.columns([2, 2, 3, 1])
    status_f = f[0].selectbox("상태", ["all"] + _Q_STATUSES,
                              format_func=lambda s: "전체" if s == "all" else _ko_status(s), key="q_status_f")
    cat_f = f[1].selectbox("카테고리", _Q_CATS,
                           format_func=lambda c: "전체" if c == "all" else c, key="q_cat_f")
    search = f[2].text_input("검색 (질문·번호)", key="q_search_f")
    if f[3].button("🔄 새로고침", key="q_refresh"):
        st.cache_data.clear()
        st.rerun()

    rows = questions.list_questions(status=status_f, category=cat_f, search=search or None)
    st.caption(f"{len(rows)}건 (최신순)")

    for q in rows[:60]:
        with st.container(border=True):
            c = st.columns([6, 2, 1])
            c[0].markdown(f"**{q.get('display_id') or ''}** — {q.get('question', '')}")
            c[0].caption(
                f"{q.get('category_guess') or '—'} · {q.get('intent_guess') or '—'} · "
                f"{q.get('source_component') or ''} · {(q.get('created_at') or '')[:10]}"
                + ("  · ✉️" if q.get("email") else ""))
            c[1].markdown(f"`{_ko_status(q.get('status'))}`")
            if c[2].button("열기", key=f"q_open_{q['id']}"):
                ss["q_sel"] = q["id"]
                st.rerun()

    if ss.get("q_sel"):
        sel = next((x for x in rows if x["id"] == ss["q_sel"]), None)
        if not sel:
            sel = next((x for x in questions.list_questions(status="all", limit=1000) if x["id"] == ss["q_sel"]), None)
        if sel:
            st.divider()
            _render_question_detail(sel)


# ══════════════════════════════════════════════════════════════════════════
#  메인
# ══════════════════════════════════════════════════════════════════════════
st.title("🛠️ Daebak 운영 콘솔")
render_key_panel()
render_progress()
render_secondary_nav()
st.divider()

_VIEW_FN = {"기획·분류": render_plan, "생성·발행": render_generate, "라이브러리": render_library,
            "측정": render_measure, "갱신 관리": render_update, "빠른 발행": render_quick,
            "이미지": render_images, "질문": render_questions}
_VIEW_FN.get(ss["view"], render_plan)()
