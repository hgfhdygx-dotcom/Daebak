# -*- coding: utf-8 -*-
"""
pipeline.py — 오케스트레이터: 리서치 → 합성 → 영작·SEO (발행은 별도 단계)
=========================================================================
한 질문 → draft(=미리보기 + 발행 재료). 비용가드 + 단계 실패 그레이스풀 + 진행률.
발행(git push/IndexNow)은 publish.py 가 사장님 'OK' 클릭 뒤에만 수행.

check_guards/dry_run = 'LLM 호출 0' 으로 비용·한도 미리보기(geo-tracker app 비용블록 미러).
"""

from __future__ import annotations

import json
import os

import classify
import config
import dedupe
import geo_check
import intent_label
import linking
import llm
import outputs
import plan
import research
import seo as seo_mod
import storage
import synthesis
import taxonomy
import usage


def check_guards(question: str = "", cfg=None) -> dict:
    """발행 전 비용/한도 점검. {blocked, reasons[], estimate, remaining}."""
    cfg = cfg or config
    est = usage.estimate_pipeline_cost(getattr(cfg, "RESEARCH_ENGINE", "openai"))
    rem = usage.remaining()
    reasons = []
    cap = float(getattr(cfg, "MAX_COST_PER_RUN_KRW", 0) or 0)
    if cap and est["krw"] > cap:
        reasons.append(f"예상 비용 {est['krw']:,.0f}원이 1회 상한 {cap:,.0f}원을 넘어요.")
    if getattr(cfg, "ENFORCE_CALL_LIMITS", False):
        if rem["day"] <= 0:
            reasons.append(f"오늘 호출 한도({getattr(cfg,'DAILY_LIMIT',50)}회)를 다 썼어요.")
        if rem["month"] <= 0:
            reasons.append(f"이번 달 호출 한도({getattr(cfg,'MONTHLY_LIMIT',1000)}회)를 다 썼어요.")
        # 한도가 남았는지(이번 글 예상 호출 수만큼)
        if 0 < rem["day"] < est["total_calls"]:
            reasons.append(f"오늘 남은 호출({rem['day']}회)이 이 글 예상({est['total_calls']}회)보다 적어요.")
    return {"blocked": bool(reasons), "reasons": reasons, "estimate": est, "remaining": rem}


def dry_run(question: str, cfg=None) -> dict:
    """LLM 호출 0 — 비용·계획·차단 여부만. 미리보기 ③단계."""
    g = check_guards(question, cfg)
    g["plan"] = [
        "1) 리서치 — 질문 + 하위질문(질문 그림자)을 웹 검색",
        "2) 본문 합성 — 답변 우선 + Citation Pack + 증거 기반(영어)",
        "3) 영작·SEO — 제목·메타·슬러그(연도 제거)",
        "4) 미리보기 → OK 누르면 내 사이트 발행 + IndexNow",
    ]
    return g


def _cost_of(engine: str, searches: int, did_subq: bool, did_synth: bool, did_seo: bool) -> float:
    """실제 일어난 호출로 비용(원) 추정."""
    krw = float(config.USD_TO_KRW)
    usd = searches * usage.per_call_usd(engine)
    if did_subq:
        usd += float(getattr(config, "SEO_USD_PER_CALL", 0.002))
    if did_synth:
        usd += float(getattr(config, "SYNTH_USD_PER_CALL", 0.03))
    if did_seo:
        usd += float(getattr(config, "SEO_USD_PER_CALL", 0.002))
    return usd * krw


def run(question: str, engine: str | None = None, cfg=None, progress_cb=None) -> dict:
    """질문 → draft. 단계 실패해도 미리보기는 렌더(폴백). 발행은 안 함."""
    cfg = cfg or config
    engine = engine or getattr(cfg, "RESEARCH_ENGINE", "openai")
    q = (question or "").strip()

    def _p(frac, msg):
        if progress_cb:
            progress_cb(max(0.0, min(1.0, frac)), msg)

    draft = {"ok": False, "error": "", "question": q, "engine": engine,
             "evidence": {}, "synth": {}, "seo": {}, "cost_spent_krw": 0.0, "verify_flags": []}
    if not q:
        draft["error"] = "질문을 입력하세요."
        return draft

    # 1) 리서치 (0.05 → 0.55)
    _p(0.05, "리서치 시작…")
    try:
        def _rcb(f, m):
            _p(0.05 + 0.50 * f, m)
        evidence = research.gather(q, engine, cfg, _rcb)
    except RuntimeError as e:   # 키 없음 등
        draft["error"] = str(e)
        return draft
    except Exception as e:  # noqa: BLE001
        draft["error"] = f"리서치 실패: {str(e)[:100]}"
        return draft
    draft["evidence"] = evidence

    # 합성·SEO용 OpenAI 클라이언트(리서치 엔진과 무관 — 항상 OpenAI). 없으면 무료 폴백.
    okey = llm.get_api_key_silent("openai")
    oclient = llm.make_client("openai", okey) if okey else None

    # 2) 합성 (0.6 → 0.85)
    _p(0.60, "본문 합성 중…")
    synth = synthesis.synthesize(q, evidence, oclient, cfg)
    draft["synth"] = synth

    # 3) 영작·SEO (0.85 → 1.0)
    _p(0.85, "제목·메타·슬러그…")
    seo_out = seo_mod.build_seo(q, synth, oclient, cfg)
    draft["seo"] = seo_out

    # 비용·플래그 집계
    draft["cost_spent_krw"] = _cost_of(
        engine, int(evidence.get("calls", 0)), bool(evidence.get("subqs")),
        bool(synth.get("used_llm")), bool(seo_out.get("used_llm")))
    draft["verify_flags"] = synth.get("verify_flags") or []
    draft["ok"] = True
    draft["error"] = synth.get("error") or ""

    # 레지스트리에 'generated' 적재
    try:
        outputs.upsert_generation(
            slug=seo_out.get("slug", ""), question=q, title=seo_out.get("title", ""),
            engine=engine, verify_count=len(draft["verify_flags"]))
    except Exception:  # noqa: BLE001
        pass

    _p(1.0, "완료")
    return draft


# ══════════════════════════════════════════════════════════════════════════
#  🗂️ 배치 기획·분류 (Phase 1A) — 질문 묶음 → 분류 + 중복감지 → plan.json
# ══════════════════════════════════════════════════════════════════════════
def _parse_frontmatter(text: str) -> dict:
    """MDX 상단 JSON frontmatter(--- … ---) 파싱. 실패 → {}."""
    if not (text or "").startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    try:
        return json.loads(text[3:end].strip())
    except Exception:  # noqa: BLE001
        return {}


def existing_answers(cfg=None) -> list:
    """중복감지 후보 = 발행된 MDX + outputs.json + plan.json 의 질문들.
    [{slug, question, title, questionType}] (slug 기준 중복 제거)."""
    cfg = cfg or config
    out, seen = [], set()
    content_dir = storage.abspath(os.path.join(
        getattr(cfg, "SITE_DIR", "site"), getattr(cfg, "SITE_CONTENT_DIR", "content/answers")))
    try:
        for fn in sorted(os.listdir(content_dir)):
            if not fn.endswith((".mdx", ".md")):
                continue
            try:
                with open(os.path.join(content_dir, fn), encoding="utf-8") as f:
                    fm = _parse_frontmatter(f.read())
            except Exception:  # noqa: BLE001
                fm = {}
            slug = fm.get("slug") or fn.rsplit(".", 1)[0]
            if slug in seen:
                continue
            seen.add(slug)
            out.append({"slug": slug, "question": fm.get("question") or fm.get("title") or "",
                        "title": fm.get("title", ""), "questionType": fm.get("questionType", "")})
    except FileNotFoundError:
        pass
    for o in outputs.load_outputs():
        s = o.get("slug")
        if s and s not in seen:
            seen.add(s)
            out.append({"slug": s, "question": o.get("question", ""),
                        "title": o.get("title", ""), "questionType": ""})
    for p in plan.load_plan():
        s = p.get("slug")
        if s and s not in seen:
            seen.add(s)
            out.append({"slug": s, "question": p.get("question", ""),
                        "title": p.get("title", ""), "questionType": p.get("questionType", "")})
    return out


import re as _re


def _qnorm(s: str) -> str:
    return _re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def parse_labeled_questions(text: str) -> dict:
    """'PILLAR:' / 'QNA:' 라벨 입력 파싱 → {'pillar': str|None, 'qna': [str], 'all': [str]}.
    라벨이 없으면 전부 평면(pillar=None, classify 가 pillar 판정)."""
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    pillar = None
    qna: list[str] = []
    section = None
    has_label = False
    for l in lines:
        low = l.lower().rstrip(":").strip()
        if low in ("pillar", "대표", "대표 질문", "메인", "main"):
            section = "pillar"; has_label = True; continue
        if low in ("qna", "q&a", "qa", "supporting", "보조", "보조 질문", "질문", "questions"):
            section = "qna"; has_label = True; continue
        if section == "pillar" and pillar is None:
            pillar = l
        elif section == "pillar":
            qna.append(l)          # PILLAR 섹션의 두 번째부터는 보조로
        else:
            qna.append(l)          # qna 섹션 또는 라벨 이전
    allq = ([pillar] if pillar else []) + qna
    if not has_label:
        return {"pillar": None, "qna": lines, "all": lines}
    return {"pillar": pillar, "qna": qna, "all": allq}


def plan_batch(questions: list, cfg=None, persist: bool = True, pillar_question: str | None = None) -> list:
    """질문 묶음 → 자동 분류(taxonomy 닫힌 집합) + 중복감지 → plan 행 목록.
    persist=True 면 plan.json 에 저장. OpenAI 키 있으면 분류/경계중복 품질↑, 없으면 휴리스틱 폴백.
    pillar_question 이 주어지면 그 질문의 역할을 pillar 로 강제하고 다른 pillar 후보는 supporting 으로 강등."""
    cfg = cfg or config
    qs = [str(q).strip() for q in (questions or []) if str(q).strip()]
    if not qs:
        return []
    okey = llm.get_api_key_silent("openai")
    client = llm.make_client("openai", okey) if okey else None
    taxo = taxonomy.load()
    rows = classify.classify_batch(qs, taxo, client, cfg)
    # 사용자가 지정한 Pillar 역할 강제(분류는 LLM, 역할은 운영자 의도 우선)
    if pillar_question:
        pk = _qnorm(pillar_question)
        for r in rows:
            if _qnorm(r.get("question", "")) == pk:
                r["questionType"] = "pillar"
            elif r.get("questionType") == "pillar":
                r["questionType"] = "supporting"
    cand = existing_answers(cfg)
    for i, r in enumerate(rows):
        others = [{"slug": x.get("slug"), "question": x.get("question"),
                   "title": x.get("title"), "questionType": x.get("questionType")}
                  for j, x in enumerate(rows) if j != i]
        dups = dedupe.find_near_dupes(r.get("question", ""), cand + others, client=client, cfg=cfg)
        r["duplicateRisk"] = dups
        r["dedupeOf"] = next((d["slug"] for d in dups if d.get("is_dup") and d.get("slug")), "")
    if persist:
        rows = plan.add_batch(rows)
    return rows


def reconcile_row(row: dict, cfg=None) -> dict:
    """관리 화면에서 cluster 를 바꾸면 clusterSlug/bigCategory/pillar/publishMode 재계산."""
    taxo = taxonomy.load()
    rec = taxonomy.resolve(row.get("bigCategory", ""), row.get("cluster", ""), taxo)
    if rec:
        big = taxonomy.category(rec.get("bigCategory", ""), taxo) or {}
        pillar = taxonomy.pillar_of(rec.get("id", ""), taxo) or {"question": "", "slug": ""}
        row["bigCategory"] = big.get("title", row.get("bigCategory", ""))
        row["bigCategorySlug"] = big.get("slug", "")
        row["cluster"] = rec.get("title", "")
        row["clusterSlug"] = rec.get("slug", "")
        row["pillarQuestion"] = pillar.get("question", "")
        row["pillarSlug"] = pillar.get("slug", "")
        row["publishMode"] = taxonomy.default_publish_mode(row.get("question", ""), rec, taxo)
    else:
        row["clusterSlug"] = ""
    return row


def auto_select_batch(cluster_slug: str, batch_size: int = 5, cfg=None) -> list:
    """발행 대기 자동 선택(운영자 수동선택 대체). 규칙: published/보류/중복 제외 →
    Pillar 미발행이면 먼저 → 상태(ready>generated>researched>planned)·우선순위 → 의도 다양성(라운드로빈).
    반환 plan_id 목록(앞 batch_size 개)."""
    rows = [r for r in plan.list_plan(cluster_slug=cluster_slug)
            if r.get("status") in ("planned", "researched", "generated", "ready")
            and not r.get("dedupeOf")
            and not any((d or {}).get("is_dup") for d in (r.get("duplicateRisk") or []))]
    pub = {o.get("slug") for o in outputs.list_outputs() if o.get("status") == "published"}
    rows = [r for r in rows if r.get("slug") not in pub]
    if not rows:
        return []
    rank = {"ready": 0, "generated": 1, "researched": 2, "planned": 3}
    rows.sort(key=lambda r: (rank.get(r.get("status"), 9), -int(r.get("priority") or 0), r.get("plan_id", "")))
    pillars = [r for r in rows if r.get("questionType") == "pillar"]
    rest = [r for r in rows if r.get("questionType") != "pillar"]
    # 의도 다양성: 같은 의도 라벨이 몰리지 않게 라운드로빈
    buckets: dict[str, list] = {}
    bucket_order: list[str] = []
    for r in rest:
        lab = intent_label.label(r.get("intent", ""), r.get("question", ""),
                                 r.get("pageType", ""), r.get("questionType", ""), r.get("bigCategory", ""))
        if lab not in buckets:
            buckets[lab] = []
            bucket_order.append(lab)
        buckets[lab].append(r)
    diverse: list = []
    while any(buckets[l] for l in bucket_order):
        for l in bucket_order:
            if buckets[l]:
                diverse.append(buckets[l].pop(0))
    ordered = pillars + diverse
    return [r["plan_id"] for r in ordered[:max(1, int(batch_size))]]


# ══════════════════════════════════════════════════════════════════════════
#  🏭 클러스터 생성 (Phase 1B) — Research Pack 재사용 + pageType + GEO 검사 + 관련글
# ══════════════════════════════════════════════════════════════════════════
def ensure_cluster_pack(cluster_slug: str, engine: str | None = None, force: bool = False,
                        cfg=None, progress_cb=None) -> dict | None:
    """클러스터 Research Pack 확보(없거나 stale 면 빌드). pillar 질문으로 풀 리서치 1회."""
    cfg = cfg or config
    if not cluster_slug:
        return None
    taxo = taxonomy.load()
    rec = taxonomy.cluster(cluster_slug, taxo)
    if not rec:
        return None
    pack = research.load_cluster_pack(cluster_slug, cfg)
    if pack and not force and not research.is_pack_stale(pack, cfg):
        return pack
    pillar = taxonomy.pillar_of(cluster_slug, taxo) or {}
    pillar_q = pillar.get("question") or rec.get("title") or cluster_slug
    ttl = taxonomy.ttl_days_for(rec, pillar_q)
    return research.build_cluster_pack(rec, pillar_q, engine, ttl, cfg, progress_cb)


def run_planned(plan_id: str, cfg=None, progress_cb=None, fresh_override: bool | None = None) -> dict:
    """plan 행 → draft(미리보기 + 발행 재료). 팩 재사용 + delta 리서치 + pageType 합성 + GEO 검사 + 관련글.
    발행은 안 함(publish_batch 가). plan/outputs 레저 갱신.
    fresh_override: None=행의 needsFreshSource 따름 / False=delta 검색 생략(팩만 재사용, 저비용) — frontmatter 플래그는 유지."""
    cfg = cfg or config
    row = plan.get_by_id(plan_id)

    def _p(frac, msg):
        if progress_cb:
            progress_cb(max(0.0, min(1.0, frac)), msg)

    draft = {"ok": False, "error": "", "plan_id": plan_id, "question": "", "engine": "",
             "evidence": {}, "synth": {}, "seo": {}, "geo": {}, "page_type": "practical",
             "publishMode": "auto", "cost_spent_krw": 0.0, "verify_flags": []}
    if not row:
        draft["error"] = "기획 항목을 찾을 수 없습니다."
        return draft

    q = (row.get("question") or "").strip()
    engine = getattr(cfg, "RESEARCH_ENGINE", "openai")
    cluster_slug = row.get("clusterSlug") or ""
    page_type = row.get("pageType") or "practical"
    needs_fresh = bool(row.get("needsFreshSource"))         # frontmatter 플래그(고지용)
    gather_fresh = needs_fresh if fresh_override is None else bool(fresh_override)  # delta 검색 여부
    draft.update({"question": q, "engine": engine, "page_type": page_type,
                  "publishMode": row.get("publishMode", "auto")})

    # 1) 리서치 (팩 재사용 + delta)
    _p(0.05, "리서치 준비…")
    try:
        if cluster_slug:
            pack = ensure_cluster_pack(cluster_slug, engine, cfg=cfg,
                                       progress_cb=lambda f, m: _p(0.05 + 0.35 * f, m))
            evidence = research.gather_with_pack(q, pack or {}, engine, gather_fresh, cfg,
                                                 lambda f, m: _p(0.40 + 0.15 * f, m))
        else:
            evidence = research.gather(q, engine, cfg, lambda f, m: _p(0.05 + 0.50 * f, m))
    except RuntimeError as e:
        draft["error"] = str(e)
        return draft
    except Exception as e:  # noqa: BLE001
        draft["error"] = f"리서치 실패: {str(e)[:100]}"
        return draft
    draft["evidence"] = evidence

    okey = llm.get_api_key_silent("openai")
    oclient = llm.make_client("openai", okey) if okey else None

    # 2) 합성(pageType 골격)
    _p(0.60, "본문 합성 중…")
    synth = synthesis.synthesize(q, evidence, oclient, cfg, page_type=page_type,
                                 question_type=row.get("questionType") or "supporting")
    draft["synth"] = synth

    # 3) SEO + 택소노미/관련글 frontmatter
    _p(0.85, "제목·메타·슬러그·관련글…")
    big_slug = row.get("bigCategorySlug") or ""
    slug = row.get("slug") or seo_mod.slugify_no_year(synth.get("title") or q)
    related = linking.compute_related(slug, cluster_slug, big_slug)
    extra = {
        "bigCategory": row.get("bigCategory", ""), "bigCategorySlug": big_slug,
        "cluster": row.get("cluster", ""), "clusterSlug": cluster_slug,
        "pillarSlug": row.get("pillarSlug", ""), "pillarQuestion": row.get("pillarQuestion", ""),
        "questionType": row.get("questionType", "supporting"), "pageType": page_type,
        "intent": row.get("intent", ""),
        "priority": row.get("priority"), "featured": bool(row.get("featured")),
        "tags": row.get("tags") or [],
        "needsFreshSource": needs_fresh, "relatedGuides": related,
    }
    seo_out = seo_mod.build_seo(q, synth, oclient, cfg, extra=extra)
    # 슬러그는 택소노미/기획에서 고정한 값을 우선(허브·관련글 일치 + URL 안정)
    seo_out["slug"] = slug
    seo_out["frontmatter"]["slug"] = slug
    extra["answerSummary"] = seo_out.get("meta_description", "")
    seo_out["frontmatter"]["answerSummary"] = extra["answerSummary"]
    draft["seo"] = seo_out

    # 4) GEO 검사 + 자동보정
    report = geo_check.run_checks(synth, seo_out["frontmatter"], page_type,
                                 duplicate_risk=row.get("duplicateRisk"), cfg=cfg)
    corrected = report.get("corrected") or {}
    if corrected.get("markdown"):
        synth["markdown"] = corrected["markdown"]
    seo_out["frontmatter"]["geoScore"] = report.get("score")
    draft["geo"] = report

    draft["cost_spent_krw"] = _cost_of(
        engine, int(evidence.get("calls", 0)), bool(evidence.get("subqs")),
        bool(synth.get("used_llm")), bool(seo_out.get("used_llm")))
    draft["verify_flags"] = synth.get("verify_flags") or []
    draft["ok"] = True
    draft["error"] = synth.get("error") or ""

    # 5) 레저 갱신
    gate = report.get("gate", "minor")
    new_status = "ready" if gate != "rewrite" else "generated"
    try:
        plan.set_status(plan_id, new_status, fields={
            "title": seo_out.get("title", ""), "slug": slug,
            "geoScore": report.get("score"), "answerSummary": extra["answerSummary"]})
    except Exception:  # noqa: BLE001
        pass
    try:
        outputs.upsert_generation(
            slug=slug, question=q, title=seo_out.get("title", ""), engine=engine,
            verify_count=len(draft["verify_flags"]),
            meta={"bigCategory": row.get("bigCategory", ""), "bigCategorySlug": big_slug,
                  "cluster": row.get("cluster", ""), "clusterSlug": cluster_slug,
                  "pillarSlug": row.get("pillarSlug", ""), "pillarQuestion": row.get("pillarQuestion", ""),
                  "questionType": row.get("questionType", ""), "pageType": page_type,
                  "publishMode": row.get("publishMode", "auto"), "needsFreshSource": needs_fresh,
                  "geoScore": report.get("score"), "answerSummary": extra["answerSummary"],
                  "plan_id": plan_id})
    except Exception:  # noqa: BLE001
        pass

    _p(1.0, "완료")
    return draft


def dry_run_batch(plan_ids: list, cfg=None) -> dict:
    """배치 생성 예상 비용/차단 — LLM 호출 0. 팩 빌드 필요 여부도 반영."""
    cfg = cfg or config
    ids = list(plan_ids or [])
    n = len(ids)
    engine = getattr(cfg, "RESEARCH_ENGINE", "openai")
    reasons = []
    planning_only = int(getattr(cfg, "BATCH_PLANNING_ONLY", 20))
    if n >= planning_only:
        reasons.append(f"{planning_only}개 이상은 기획/분류 전용 — 완성 글 생성은 막혀 있어요(5개씩 나누세요).")

    # 글 1편(팩 재사용): 질문검색 1~ + 합성 + SEO. + 필요한 클러스터 팩 빌드(풀 리서치 1회).
    per_article = usage.per_call_usd(engine) * 2 + float(getattr(cfg, "SYNTH_USD_PER_CALL", 0.03)) \
        + float(getattr(cfg, "SEO_USD_PER_CALL", 0.002))
    clusters_needing_pack = set()
    for pid in ids:
        row = plan.get_by_id(pid) or {}
        cs = row.get("clusterSlug")
        if cs:
            pk = research.load_cluster_pack(cs, cfg)
            if not pk or research.is_pack_stale(pk, cfg):
                clusters_needing_pack.add(cs)
    pack_usd = len(clusters_needing_pack) * usage.estimate_pipeline_cost(engine)["usd"]
    usd = n * per_article + pack_usd
    krw = usd * float(getattr(cfg, "USD_TO_KRW", 1350))

    rem = usage.remaining()
    est_calls = n * 4 + len(clusters_needing_pack) * (2 + int(getattr(cfg, "MAX_SUBQS", 6)))
    if rem["day"] <= 0:
        reasons.append("오늘 호출 한도를 다 썼어요.")
    elif rem["day"] < est_calls:
        reasons.append(f"오늘 남은 호출({rem['day']})이 예상({est_calls})보다 적어요 — 일부만 생성될 수 있어요.")

    return {"blocked": any(r.startswith(f"{planning_only}") for r in reasons), "reasons": reasons,
            "n": n, "krw": krw, "est_calls": est_calls,
            "packs_to_build": sorted(clusters_needing_pack)}


def run_batch(plan_ids: list, cfg=None, progress_cb=None, fresh_override: bool | None = None) -> dict:
    """plan_ids → 글 생성(5개씩 권장). 20개 이상은 차단(기획 전용). 한도 초과 시 부분 생성(이미 만든 건 보존).
    fresh_override=False 면 delta 검색 생략(저비용 — 팩만 재사용)."""
    cfg = cfg or config
    ids = [p for p in (plan_ids or []) if p]
    planning_only = int(getattr(cfg, "BATCH_PLANNING_ONLY", 20))
    if len(ids) >= planning_only:
        return {"ok": False, "error": f"{planning_only}개 이상은 기획 전용입니다 — 완성 글 생성 불가. 5개씩 나누세요.",
                "drafts": []}
    drafts, stopped = [], ""
    for i, pid in enumerate(ids):
        if getattr(cfg, "ENFORCE_CALL_LIMITS", False) and usage.remaining()["day"] <= 0:
            stopped = "오늘 호출 한도에 도달해 일부만 생성했어요."
            break
        if progress_cb:
            progress_cb(i / max(1, len(ids)), f"{i+1}/{len(ids)} 글 생성 중…")
        d = run_planned(pid, cfg, fresh_override=fresh_override)
        drafts.append(d)
    if progress_cb:
        progress_cb(1.0, "배치 생성 완료")
    return {"ok": True, "drafts": drafts, "stopped": stopped}
