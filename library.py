# -*- coding: utf-8 -*-
"""
library.py — 운영 대시보드 집계 (plan.json + outputs.json 머지)
================================================================
라이브러리/측정/진행바가 쓰는 읽기 전용 집계. plan(기획 큐)과 outputs(발행 원장)를 clusterSlug 로
묶고 slug 키로 중복 제거(발행=outputs 우선). 순수 I/O(LLM·네트워크 0).

표시 상태(운영자 친화): 발행됨 / 측정 필요 / 측정 완료 / 갱신 필요 / 발행 대기 / 기획됨 / 중복 의심 / 실패 / 보류.
"""

from __future__ import annotations

from datetime import datetime

import intent_label
import outputs as _outputs
import plan as _plan
import storage
import taxonomy as _tax

STALE_DAYS = 30

# 표시 상태 정렬용 가중치(요약/필터)
DISPLAY_STATUSES = ["발행됨", "측정 필요", "측정 완료", "갱신 필요", "발행 대기",
                    "기획됨", "중복 의심", "실패", "보류"]


def last_measured(out: dict) -> str:
    ds = [m.get("testDate", "") for m in (out.get("measurementTargets") or []) if m.get("testDate")]
    return max(ds) if ds else ""


def _is_stale(datestr: str, days: int = STALE_DAYS) -> bool:
    if not datestr:
        return True
    try:
        d = datetime.strptime(str(datestr)[:10], "%Y-%m-%d")
    except Exception:  # noqa: BLE001
        return False
    now = storage.now_kst().replace(tzinfo=None)
    return (now - d).days >= days


def _is_dup(prow: dict) -> bool:
    if not prow:
        return False
    if prow.get("dedupeOf"):
        return True
    return any((d or {}).get("is_dup") for d in (prow.get("duplicateRisk") or []))


def needs_update_reasons(out: dict) -> list:
    """발행글이 갱신 필요한 사유 목록(비면 갱신 불필요). 자동 조건 집합."""
    if not out or out.get("status") not in ("published", "needs_update"):
        return []
    reasons: list[str] = []
    mts = out.get("measurementTargets") or []
    lm = last_measured(out)
    pub = out.get("published_at") or out.get("updated_at") or ""
    if not lm:
        if _is_stale(pub):
            reasons.append("발행 30일 이상인데 측정 기록 없음")
    elif _is_stale(lm):
        reasons.append("마지막 측정 30일 경과")
    recent = mts[-3:]
    if len(recent) >= 2 and all(not m.get("appeared") for m in recent):
        reasons.append("최근 측정에서 검색결과 미등장 반복")
    if len(recent) >= 2 and all(not m.get("cited") for m in recent):
        reasons.append("최근 측정에서 인용 안 됨 반복")
    gs = out.get("geoScore")
    if isinstance(gs, (int, float)) and gs < 75:
        reasons.append(f"GEO 점수 낮음({int(gs)})")
    comp = [u for m in mts for u in (m.get("competitorUrls") or [])]
    rep = sorted({u for u in comp if comp.count(u) >= 2})
    if rep:
        reasons.append("경쟁 URL 반복 등장")
    return reasons


def measurement_queue() -> list:
    """측정 필요 = 발행됨(또는 갱신필요) & (미측정 or 30일+ 경과). 최근 발행/갱신순."""
    q = []
    for o in _outputs.list_outputs():
        if o.get("status") not in ("published", "needs_update"):
            continue
        lm = last_measured(o)
        if not lm or _is_stale(lm):
            q.append(o)
    return q  # list_outputs 가 updated_at desc 정렬


def _display_status(prow: dict | None, orec: dict | None) -> str:
    if orec:
        s = orec.get("status")
        if s in ("published", "needs_update"):
            if needs_update_reasons(orec):
                return "갱신 필요"
            lm = last_measured(orec)
            return "발행됨" if False else ("측정 필요" if (not lm or _is_stale(lm)) else "측정 완료")
        if s == "failed":
            return "실패"
        if s in ("generated", "approved"):
            return "발행 대기"
        if s == "archived":
            return "보류"
    if prow:
        if _is_dup(prow):
            return "중복 의심"
        ps = prow.get("status")
        if ps in ("ready", "generated"):
            return "발행 대기"
        if ps in ("planned", "researched"):
            return "기획됨"
        if ps == "folded":
            return "보류"
        if ps == "failed":
            return "실패"
        if ps == "published":
            return "발행됨"
    return "기획됨"


def _role(prow: dict | None, orec: dict | None) -> str:
    qt = (orec or {}).get("questionType") or (prow or {}).get("questionType") or ""
    return "Pillar" if qt == "pillar" else "QnA"


def _item(prow: dict | None, orec: dict | None) -> dict:
    src = orec or prow or {}
    question = src.get("question", "")
    status = _display_status(prow, orec)
    lab = intent_label.label(
        (prow or orec or {}).get("intent", ""), question,
        src.get("pageType", ""), src.get("questionType", ""), src.get("bigCategory", ""))
    return {
        "role": _role(prow, orec),
        "question": question,
        "slug": src.get("slug", ""),
        "status": status,
        "intent": lab,
        "geoScore": (orec or {}).get("geoScore", (prow or {}).get("geoScore")),
        "lastMeasured": last_measured(orec) if orec else "",
        "output_id": (orec or {}).get("output_id", ""),
        "plan_id": (prow or {}).get("plan_id", ""),
        "live_url": (orec or {}).get("live_url", ""),
    }


def cluster_overview() -> dict:
    """{'summary': {상태: n}, 'clusters': [ {clusterSlug, cluster, bigCategory, total, published,
    pending, planned, measure, update, dup, failed, pillar_q, items:[...] } ] }. plan+outputs 머지."""
    taxo = _tax.load()
    prows = _plan.load_plan()
    outs = _outputs.list_outputs()
    out_by_slug = {o.get("slug"): o for o in outs if o.get("slug")}
    plan_by_slug = {r.get("slug"): r for r in prows if r.get("slug")}

    # clusterSlug 순서 = taxonomy 순서, 그 외(미배정/타) 뒤에
    order: list[str] = []
    titles: dict[str, dict] = {}
    for c in _tax.clusters(taxo):
        cs = c.get("slug", "")
        if cs:
            order.append(cs)
            titles[cs] = {"cluster": c.get("title", cs), "bigCategory": "",
                          "pillar_q": (c.get("pillarQuestions") or [{}])[0].get("question", "") if c.get("pillarQuestions") else ""}

    groups: dict[str, dict] = {}

    def _group(cs: str, prow=None, orec=None) -> dict:
        key = cs or "(미배정)"
        g = groups.get(key)
        if not g:
            meta = titles.get(cs, {})
            src = orec or prow or {}
            g = {"clusterSlug": cs, "cluster": meta.get("cluster") or src.get("cluster", "") or key,
                 "bigCategory": src.get("bigCategory", ""), "pillar_q": meta.get("pillar_q", ""),
                 "_items": {}}
            groups[key] = g
        return g

    # 모든 slug(plan ∪ outputs) 한 번씩
    seen = set()
    for slug, orec in out_by_slug.items():
        prow = plan_by_slug.get(slug)
        cs = orec.get("clusterSlug") or (prow or {}).get("clusterSlug") or ""
        _group(cs, prow, orec)["_items"][slug] = _item(prow, orec)
        seen.add(slug)
    for slug, prow in plan_by_slug.items():
        if slug in seen:
            continue
        cs = prow.get("clusterSlug") or ""
        _group(cs, prow, None)["_items"][slug] = _item(prow, None)
        seen.add(slug)
    # slug 없는 plan 행(드묾) — question 키로
    for r in prows:
        if r.get("slug"):
            continue
        cs = r.get("clusterSlug") or ""
        _group(cs, r, None)["_items"].setdefault(r.get("question", ""), _item(r, None))

    summary = {s: 0 for s in DISPLAY_STATUSES}
    summary["전체"] = 0
    clusters_out = []
    for key in order + [k for k in groups if k not in order]:
        g = groups.get(key)
        if not g:
            continue
        items = list(g["_items"].values())
        items.sort(key=lambda it: (it["role"] != "Pillar", DISPLAY_STATUSES.index(it["status"])
                                   if it["status"] in DISPLAY_STATUSES else 99, it["question"]))
        cnt = {s: 0 for s in DISPLAY_STATUSES}
        for it in items:
            cnt[it["status"]] = cnt.get(it["status"], 0) + 1
            summary[it["status"]] = summary.get(it["status"], 0) + 1
            summary["전체"] += 1
        published = cnt["발행됨"] + cnt["측정 필요"] + cnt["측정 완료"] + cnt["갱신 필요"]
        clusters_out.append({
            "clusterSlug": g["clusterSlug"], "cluster": g["cluster"], "bigCategory": g["bigCategory"],
            "pillar_q": g["pillar_q"], "total": len(items), "published": published,
            "pending": cnt["발행 대기"], "planned": cnt["기획됨"], "measure": cnt["측정 필요"],
            "update": cnt["갱신 필요"], "dup": cnt["중복 의심"], "failed": cnt["실패"],
            "items": items,
        })
    clusters_out = [c for c in clusters_out if c["total"] > 0]
    return {"summary": summary, "clusters": clusters_out}


def workflow_state() -> dict:
    """상단 진행바 6단계 상태: 'done' | 'active' | 'wait' | 'problem'. + 'next' 안내문."""
    prows = _plan.load_plan()
    outs = _outputs.list_outputs()
    pub = [o for o in outs if o.get("status") in ("published", "needs_update")]
    classified = [r for r in prows if r.get("clusterSlug")]
    pending = [r for r in prows if r.get("status") in ("planned", "researched", "generated", "ready")
               and not _is_dup(r) and r.get("slug") not in {o.get("slug") for o in pub}]
    failed = [o for o in outs if o.get("status") == "failed"]
    mq = measurement_queue()
    nu = [o for o in pub if needs_update_reasons(o)]

    st = {
        "질문 입력": "done" if prows else "active",
        "AI 분류": "done" if classified else ("active" if prows else "wait"),
        "기획 저장": "done" if prows else "wait",
        "생성·발행": ("problem" if failed else ("active" if pending else ("done" if pub else "wait"))),
        "측정": ("active" if mq else ("done" if pub else "wait")),
        "갱신 관리": ("problem" if nu else ("done" if pub else "wait")),
    }
    if not prows:
        nxt = "Pillar 1개와 QnA 질문을 붙여넣고 [AI 분류하기]를 누르세요."
    elif pending:
        nxt = f"발행 대기 {len(pending)}개를 생성·발행하세요."
    elif mq:
        nxt = f"발행된 글 {len(mq)}개의 AI 인용 여부를 측정·기록하세요."
    elif nu:
        nxt = f"갱신 필요 {len(nu)}개를 확인하세요."
    else:
        nxt = "새 질문 묶음을 입력하거나 라이브러리에서 현황을 확인하세요."
    cur = next((k for k, v in st.items() if v in ("active", "problem")), "라이브러리")
    return {"steps": st, "current": cur, "next": nxt,
            "counts": {"pending": len(pending), "measure": len(mq), "update": len(nu), "failed": len(failed)}}
