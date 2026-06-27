# -*- coding: utf-8 -*-
"""
linking.py — 내부링크 자동화 (§18): relatedGuides 슬러그 계산
==============================================================
글은 혼자 존재하면 안 된다(기법 Z 경로 설계). 발행 시 관련 글 슬러그를 자동 산출:
  같은 cluster(같은 pillar 의 supporting 포함) → 같은 bigCategory 의 다른 cluster pillar.
**슬러그만** 기록 — 제목/존재여부는 사이트가 빌드 때 현재값으로 resolve(=stale 베이크 방지).
최소 4 ~ 최대 8. 후보는 taxonomy.json(커밋된 구조 데이터) 에서 가져오므로 발행 순서와 무관하게 4개 확보.
"""

from __future__ import annotations

import taxonomy


def compute_related(slug: str, cluster_slug: str, big_slug: str = "",
                    taxo: dict | None = None, lo: int = 4, hi: int = 8) -> list:
    """relatedGuides 슬러그 목록(자기 제외, 중복 제거, 최대 hi개)."""
    taxo = taxo or taxonomy.load()
    out, seen = [], {slug}

    def add(s):
        s = (s or "").strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)

    rec = taxonomy.cluster(cluster_slug, taxo) if cluster_slug else None
    if rec:
        p = taxonomy.pillar_of(cluster_slug, taxo)
        if p:
            add(p.get("slug"))
        for s in taxonomy.supporting_of(cluster_slug, taxo):
            add(s.get("slug"))
        big_slug = big_slug or (taxonomy.category(rec.get("bigCategory", ""), taxo) or {}).get("slug", "")

    if big_slug:
        for cl in taxonomy.clusters_of(big_slug, taxo):
            if cl.get("slug") == cluster_slug:
                continue
            p = taxonomy.pillar_of(cl.get("id", ""), taxo)
            if p:
                add(p.get("slug"))

    return out[:hi]
