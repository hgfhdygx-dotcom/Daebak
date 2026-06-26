# -*- coding: utf-8 -*-
"""
run_runner.py — 파이프라인을 백그라운드 스레드로 실행 (UI 멈춤 방지)
====================================================================
geo-tracker/measure_runner.py 패턴 미러: 모듈 전역 _CURRENT 에 진행률·결과 보관,
Streamlit 이 폴링(st.rerun)으로 진행률 갱신. 한 번에 하나만(중복 실행 방지).
"""

from __future__ import annotations

import threading

import pipeline

_LOCK = threading.Lock()
_CURRENT = {"running": False, "progress": 0.0, "message": "", "result": None, "error": "", "question": ""}


def _set(**kw):
    with _LOCK:
        _CURRENT.update(kw)


def current() -> dict:
    with _LOCK:
        return dict(_CURRENT)


def is_running() -> bool:
    with _LOCK:
        return bool(_CURRENT["running"])


def clear():
    _set(running=False, progress=0.0, message="", result=None, error="", question="")


def start(question: str, engine: str | None = None, cfg=None) -> bool:
    """이미 돌고 있으면 False. 아니면 스레드 시작하고 True."""
    if is_running():
        return False
    _set(running=True, progress=0.0, message="시작…", result=None, error="", question=question)

    def _cb(frac, msg):
        _set(progress=float(frac), message=str(msg))

    def _work():
        try:
            draft = pipeline.run(question, engine, cfg, _cb)
            _set(result=draft, error=draft.get("error", ""), progress=1.0,
                 message="완료" if draft.get("ok") else "오류")
        except Exception as e:  # noqa: BLE001
            _set(error=f"실행 오류: {str(e)[:120]}", message="오류")
        finally:
            _set(running=False)

    threading.Thread(target=_work, daemon=True).start()
    return True
