# -*- coding: utf-8 -*-
"""
pipeline.py — 오케스트레이터: 리서치 → 합성 → 영작·SEO (발행은 별도 단계)
=========================================================================
한 질문 → draft(=미리보기 + 발행 재료). 비용가드 + 단계 실패 그레이스풀 + 진행률.
발행(git push/IndexNow)은 publish.py 가 사장님 'OK' 클릭 뒤에만 수행.

check_guards/dry_run = 'LLM 호출 0' 으로 비용·한도 미리보기(geo-tracker app 비용블록 미러).
"""

from __future__ import annotations

import config
import llm
import outputs
import research
import seo as seo_mod
import synthesis
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
