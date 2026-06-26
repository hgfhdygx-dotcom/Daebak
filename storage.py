# -*- coding: utf-8 -*-
"""
storage.py — 원자적·안전 파일 IO (모든 ledger/파일 공용)
========================================================
임시파일→os.replace(원자적), 깨진/비-list 파일은 덮어쓰지 않음(데이터 보호).
순수 stdlib(네트워크·streamlit 0). geo-tracker/storage.py 이식.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
KST = timezone(timedelta(hours=9))


def slugify(text: str) -> str:
    """텍스트 → ascii slug(소문자·하이픈). 순수 한글/이모지면 안정 해시(파일명 안전)."""
    b = (text or "").strip()
    if not b:
        return "untitled"
    s = unicodedata.normalize("NFKD", b)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    if not s:
        s = "q" + hashlib.sha1(b.encode("utf-8")).hexdigest()[:8]
    return s[:80]


def abspath(path: str) -> str:
    return path if os.path.isabs(path) else os.path.join(BASE, path)


def now_kst() -> datetime:
    return datetime.now(KST)


def today_kst_str() -> str:
    return datetime.now(KST).strftime("%Y-%m-%d")


def month_kst_str() -> str:
    return datetime.now(KST).strftime("%Y-%m")


def clip(s, cap: int) -> str:
    return (str(s if s is not None else "").strip())[:cap]


def safe_load_list(path: str):
    """(list, '') — 없으면 ([],''). 깨짐/비-list면 ([], 사유)(절대 raise 안 함, 덮어쓰기 금지 신호)."""
    p = abspath(path)
    if not os.path.exists(p):
        return [], ""
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:  # noqa: BLE001
        return [], f"{os.path.basename(p)} 읽기 실패(파일 보호)"
    if not isinstance(data, list):
        return [], f"{os.path.basename(p)} 형식이 list 아님(파일 보호)"
    return data, ""


def safe_load_json(path: str, default=None):
    """dict 등 JSON 로드. 없거나 깨지면 default(=기본 {})."""
    p = abspath(path)
    if not os.path.exists(p):
        return {} if default is None else default
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {} if default is None else default


def safe_save_json(path: str, data, *, max_bytes: int = 8_000_000):
    """원자적 JSON 저장. (ok, msg). max_bytes 초과 시 거부(런어웨이 가드). 절대 raise 안 함."""
    p = abspath(path)
    tmp = p + ".tmp"
    try:
        text = json.dumps(data, ensure_ascii=False, indent=2)
        if len(text.encode("utf-8")) > max_bytes:
            return False, "데이터가 너무 커서 저장을 취소했습니다."
        os.makedirs(os.path.dirname(p) or ".", exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, f"저장 오류: {e}"
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:  # noqa: BLE001
            pass


def safe_save_text(path: str, text: str):
    """원자적 텍스트 저장(.md/.mdx/.html 등). (ok, msg). 절대 raise 안 함."""
    p = abspath(path)
    tmp = p + ".tmp"
    try:
        os.makedirs(os.path.dirname(p) or ".", exist_ok=True)
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(text or "")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, f"저장 오류: {e}"
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except Exception:  # noqa: BLE001
            pass


def next_seq_id(items: list, prefix: str, field: str = "id", width: int = 4) -> str:
    """기존 항목에서 PREFIX-NNN 최대값+1."""
    maxn = 0
    for it in (items or []):
        m = re.match(rf"{re.escape(prefix)}-(\d+)$", str((it or {}).get(field, "")))
        if m:
            maxn = max(maxn, int(m.group(1)))
    return f"{prefix}-{maxn + 1:0{width}d}"
