# -*- coding: utf-8 -*-
"""
guards.py — 운영 실수 방지 경고(노랑 '확인 필요'). 빨강 에러 아님.
====================================================================
기획 표/발행 대상에 대한 구조적 경고를 모은다(순수 I/O). 콘텐츠형 경고(worth_it summary가
설명형인지·개요 칩 스코프 등)는 생성 이후 데이터가 필요해 여기선 best-effort/생략.
"""

from __future__ import annotations

import re

import outputs as _outputs


def _tokens(s: str) -> set:
    return set(re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).split())


def _is_dup(row: dict) -> bool:
    if row.get("dedupeOf"):
        return True
    return any((d or {}).get("is_dup") for d in (row.get("duplicateRisk") or []))


def plan_warnings(rows: list) -> list:
    """기획 표 전체 경고 목록. 반환 [{'msg': str}]. 노랑 배지로 표시."""
    rows = rows or []
    w: list[str] = []
    pillars = [r for r in rows if (r.get("questionType") or "") == "pillar"]
    qna = [r for r in rows if (r.get("questionType") or "") in ("supporting", "faq")]

    if len(pillars) == 0:
        w.append("Pillar(대표 질문)이 없습니다 — 1개를 지정하세요.")
    elif len(pillars) >= 2:
        w.append(f"Pillar이 {len(pillars)}개 감지됐습니다 — 보통 1개여야 합니다.")
    if len(qna) == 0 and rows:
        w.append("QnA(보조 질문)가 0개입니다.")

    dups = [r for r in rows if _is_dup(r)]
    if len(dups) >= max(3, len(rows) // 4) and dups:
        w.append(f"중복 의심 질문이 {len(dups)}개로 많습니다 — 정리하세요.")

    pub_slugs = {o.get("slug") for o in _outputs.list_outputs() if o.get("status") == "published"}
    row_msgs: list[str] = []
    for r in rows:
        q = (r.get("question") or "")[:46]
        if not r.get("clusterSlug"):
            row_msgs.append(f"클러스터 미배정: “{q}”")
            continue
        if not (r.get("intent") or "").strip() and (r.get("questionType") or "") not in ("pillar", "faq"):
            row_msgs.append(f"의도(intent) 비어 있음: “{q}”")
        t, qq = _tokens(r.get("title")), _tokens(r.get("question"))
        if t and qq and len(t & qq) / max(1, len(qq)) < 0.2:
            row_msgs.append(f"제목↔질문 범위가 많이 다릅니다: “{q}”")
        if r.get("slug") in pub_slugs and r.get("status") != "published":
            row_msgs.append(f"이미 발행된 질문을 다시 기획 중: “{q}”")

    w.extend(row_msgs[:8])
    if len(row_msgs) > 8:
        w.append(f"… 외 {len(row_msgs) - 8}건 더 (표에서 확인)")
    return [{"msg": m} for m in w]


def publish_warnings(target_rows: list) -> list:
    """생성·발행 대상 경고(이미 발행/중복 섞임 등)."""
    rows = target_rows or []
    w: list[str] = []
    pub_slugs = {o.get("slug") for o in _outputs.list_outputs() if o.get("status") == "published"}
    already = [r for r in rows if r.get("slug") in pub_slugs]
    if already:
        w.append(f"이미 발행된 질문 {len(already)}개가 대상에 섞여 있습니다 — 자동 제외됩니다.")
    dups = [r for r in rows if _is_dup(r)]
    if dups:
        w.append(f"중복 의심 {len(dups)}개가 대상에 있습니다 — 확인하세요.")
    return [{"msg": m} for m in w]
