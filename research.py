# -*- coding: utf-8 -*-
"""
research.py — 리서치 단계: 웹 검색(공식 API) + C-2 하위질문 fan-out
===================================================================
geo-tracker/geo_tracker.py 의 search_openai/gemini/perplexity + run_one_search 이식 +
  · expand_questions(): 원질문 하나를 'AI가 내부에서 펼치는 하위질문(query shadow, 기법 C-2)'
    3~5개로 확장 → 질문의 그림자까지 점유.
  · gather(): (원질문 + 하위질문) 각각을 웹 검색해 **답변 텍스트 + 인용 출처 URL**을 모음.

🚨 안전: **공식 web_search 도구가 돌려준 인용·텍스트만** 사용(직접 크롤링/스크래핑 0).
   성공 호출 1건당 usage.bump_usage(1). 503/타임아웃 실패는 미차감.
"""

from __future__ import annotations

import json
import random
import time
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import config
import llm
import usage

_TOOL_TYPES = ["web_search", "web_search_preview"]
_TRACKING = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
             "ref", "ref_src", "referrer", "fbclid", "gclid", "gclsrc", "dclid",
             "msclkid", "mc_cid", "mc_eid", "igshid", "yclid", "_hsenc", "_hsmi", "spm", "scm"}


# ── URL 정규화 / 도메인 ─────────────────────────────────────────────
def clean_url(u: str) -> str:
    try:
        p = urlparse((u or "").strip())
        if not p.scheme or not p.netloc:
            return (u or "").strip()
        host = p.netloc.lower().removeprefix("www.")
        q = [(k, v) for k, v in parse_qsl(p.query) if k.lower() not in _TRACKING]
        path = p.path.rstrip("/") or "/"
        return urlunparse((p.scheme.lower(), host, path, "", urlencode(q), ""))
    except Exception:  # noqa: BLE001
        return (u or "").strip()


def domain_of(u: str) -> str:
    try:
        return urlparse(clean_url(u)).netloc.lower().removeprefix("www.")
    except Exception:  # noqa: BLE001
        return ""


# ── 응답 → 인용 URL + 텍스트 (엔진별) ────────────────────────────────
def _to_dict(response) -> dict:
    if hasattr(response, "model_dump"):
        return response.model_dump()
    if hasattr(response, "to_dict"):
        return response.to_dict()
    return response if isinstance(response, dict) else {}


def _citations_openai(response) -> list:
    data = _to_dict(response)
    cited, sources = [], []
    for item in (data.get("output") or []):
        if not isinstance(item, dict):
            continue
        if item.get("type") == "message":
            for content in (item.get("content") or []):
                if isinstance(content, dict):
                    for ann in (content.get("annotations") or []):
                        if isinstance(ann, dict) and ann.get("type") == "url_citation" and ann.get("url"):
                            cited.append(ann["url"])
        elif item.get("type") == "web_search_call":
            action = item.get("action") or {}
            if isinstance(action, dict):
                for src in (action.get("sources") or []):
                    if isinstance(src, str):
                        sources.append(src)
                    elif isinstance(src, dict) and src.get("url"):
                        sources.append(src["url"])
    return cited + sources


def _text_openai(response) -> str:
    data = _to_dict(response)
    parts = []
    for item in (data.get("output") or []):
        if isinstance(item, dict) and item.get("type") == "message":
            for content in (item.get("content") or []):
                if isinstance(content, dict) and content.get("type") in ("output_text", "text") and content.get("text"):
                    parts.append(str(content["text"]))
    return " ".join(parts)


def _citations_pplx(response) -> list:
    data = _to_dict(response)
    urls = []

    def _take(items):
        for c in (items or []):
            if isinstance(c, str):
                urls.append(c)
            elif isinstance(c, dict) and c.get("url"):
                urls.append(c["url"])

    _take(data.get("citations"))
    _take(data.get("search_results"))
    for ch in (data.get("choices") or []):
        _take(((ch or {}).get("message") or {}).get("citations"))
    return urls


def _text_pplx(response) -> str:
    data = _to_dict(response)
    for ch in (data.get("choices") or []):
        msg = (ch or {}).get("message") or {}
        if msg.get("content"):
            return str(msg["content"])
    return ""


# ── 엔진별 검색 ──────────────────────────────────────────────────────
def search_openai(client, query: str) -> dict:
    last = None
    model = llm.effective_openai_model()
    mot = getattr(config, "OPENAI_MAX_OUTPUT_TOKENS", None)
    for i, tool_type in enumerate(list(_TOOL_TYPES)):
        try:
            kwargs = {
                "model": model,
                "tools": [{"type": tool_type, "user_location": config.USER_LOCATION}],
                "include": ["web_search_call.action.sources"],
                "input": query,
            }
            if mot:
                kwargs["max_output_tokens"] = int(mot)
            resp = client.responses.create(**kwargs)
            if i != 0:
                _TOOL_TYPES.remove(tool_type)
                _TOOL_TYPES.insert(0, tool_type)
            return {"urls": _citations_openai(resp), "text": _text_openai(resp)}
        except Exception as e:  # noqa: BLE001
            msg = str(e).lower()
            tool_issue = "web_search" in msg and any(k in msg for k in ("type", "tool", "support", "invalid", "unknown"))
            last = e
            if tool_issue and i + 1 < len(_TOOL_TYPES):
                continue
            raise
    if last:
        raise last
    return {"urls": [], "text": ""}


def search_perplexity(client, query: str) -> dict:
    resp = client.chat.completions.create(
        model=config.PERPLEXITY_MODEL,
        messages=[{"role": "user", "content": query}],
    )
    return {"urls": _citations_pplx(resp), "text": _text_pplx(resp)}


def _is_gemini_redirect(u: str) -> bool:
    return ("grounding-api-redirect" in (u or "")) or ("vertexaisearch" in (u or ""))


def _resolve_redirect(u: str, timeout: float = 4.0) -> str:
    """구글 그라운딩 리다이렉트 → 실제 글 URL(가능하면). 실패하면 원본 그대로."""
    try:
        import requests
        r = requests.get(u, allow_redirects=True, timeout=timeout,
                         headers={"User-Agent": "Mozilla/5.0"})
        if r.url and not _is_gemini_redirect(r.url):
            return r.url
    except Exception:  # noqa: BLE001
        pass
    return u


def search_gemini(client, query: str) -> dict:
    from google.genai import types  # 지연 import
    gcfg = types.GenerateContentConfig(tools=[types.Tool(google_search=types.GoogleSearch())])
    models, seen = [], set()
    for m in [getattr(config, "GEMINI_MODEL", "gemini-2.5-flash")] + list(getattr(config, "GEMINI_FALLBACK_MODELS", []) or []):
        if m and m not in seen:
            seen.add(m)
            models.append(m)
    resp, last_err = None, None
    for m in models:
        try:
            resp = client.models.generate_content(model=m, contents=query, config=gcfg)
            break
        except Exception as e:  # noqa: BLE001
            last_err = e
            continue
    if resp is None:
        raise last_err if last_err is not None else RuntimeError("Gemini 응답 없음")
    text = getattr(resp, "text", "") or ""
    urls = []
    try:
        for cand in (getattr(resp, "candidates", None) or []):
            gm = getattr(cand, "grounding_metadata", None)
            for ch in (getattr(gm, "grounding_chunks", None) or []):
                web = getattr(ch, "web", None)
                if not web:
                    continue
                uri = str(getattr(web, "uri", "") or "").strip()
                if uri:
                    urls.append(_resolve_redirect(uri) if _is_gemini_redirect(uri) else uri)
    except Exception:  # noqa: BLE001
        pass
    return {"urls": [u for u in urls if not _is_gemini_redirect(u)], "text": text}


def engine_search_fn(engine: str):
    return {"perplexity": search_perplexity, "gemini": search_gemini}.get(engine, search_openai)


# ── 재시도 래퍼 ──────────────────────────────────────────────────────
def is_retryable(e: Exception) -> bool:
    status = getattr(e, "status_code", None) or getattr(e, "status", None)
    if status in (429, 500, 502, 503, 504):
        return True
    if status in (400, 401, 403, 404):
        return False
    m = str(e).lower()
    return any(t in m for t in ("429", "500", "502", "503", "504", "timeout",
                                "timed out", "connection", "rate limit", "overload", "temporar"))


def run_one_search(engine_search, client, query):
    """(payload|None, attempts, error). 지수 백오프 + 지터, 재시도 소진 시 None."""
    attempts, last_err = 0, None
    max_retries = int(getattr(config, "MAX_RETRIES", 3))
    base = float(getattr(config, "RETRY_WAIT", 2.0))
    for attempt in range(max_retries + 1):
        attempts += 1
        try:
            return engine_search(client, query), attempts, None
        except KeyboardInterrupt:
            raise
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt < max_retries and is_retryable(e):
                wait = min(base * (2 ** attempt), 16.0)
                wait += random.uniform(0, wait * float(getattr(config, "RETRY_JITTER", 0.0) or 0.0))
                try:
                    time.sleep(wait)
                except KeyboardInterrupt:
                    raise
                continue
            break
    return None, attempts, last_err


# ── C-2 하위질문 fan-out ─────────────────────────────────────────────
def expand_questions(question: str, client, cfg=None) -> list:
    """원질문 → 'AI가 내부에서 펼칠' 하위질문 3~5개(기법 C-2). gpt-4o-mini 1콜.
    실패/키없음/형식이상 → [question] 만(폴백). 성공 시 bump_usage(1)."""
    cfg = cfg or config
    q = (question or "").strip()
    if not q:
        return []
    n = int(getattr(cfg, "MAX_SUBQS", 4))
    try:
        sysp = (
            "You expand ONE user question that a foreigner would ask into the sub-questions that an AI "
            "search engine would fan out internally to answer it well (query fan-out). "
            f"Return STRICT JSON: {{\"subquestions\": [\"...\", ...]}} with {n} concise, distinct, "
            "answer-seeking sub-questions in English. No duplicates, no numbering, no preamble."
        )
        resp = client.chat.completions.create(
            model=getattr(cfg, "SUBQ_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": sysp},
                      {"role": "user", "content": q}],
            response_format={"type": "json_object"}, temperature=0.5, max_tokens=300)
        data = json.loads(resp.choices[0].message.content or "{}")
        subs = [str(s).strip() for s in (data.get("subquestions") or []) if str(s).strip()]
        usage.bump_usage(1)
        # 원질문과 (대소문자 무시) 중복 제거, 상한 적용
        out, low = [], {q.lower()}
        for s in subs:
            if s.lower() not in low:
                out.append(s)
                low.add(s.lower())
        return out[:n]
    except Exception:  # noqa: BLE001
        return []


# ── 통합: 질문 → 증거 묶음(evidence pack) ────────────────────────────
def gather(question: str, engine: str | None = None, cfg=None, progress_cb=None) -> dict:
    """원질문 + 하위질문 각각 웹 검색 → {question, subqs, queries[], sources[], research_text, ...}.
    progress_cb(frac, msg) 선택. 검색 성공 1건당 bump_usage(1)."""
    cfg = cfg or config
    engine = engine or getattr(cfg, "RESEARCH_ENGINE", "openai")
    q = (question or "").strip()
    pack = {"question": q, "engine": engine, "subqs": [], "queries": [],
            "sources": [], "research_text": "", "calls": 0, "errors": []}
    if not q:
        pack["errors"].append("질문이 비어 있어요.")
        return pack

    key = llm.get_api_key(engine)        # 없으면 RuntimeError(앱이 안내)
    client = llm.make_client(engine, key)
    search = engine_search_fn(engine)

    # 1) 하위질문 확장 (openai 키로 — 리서치 엔진이 perplexity/gemini여도 subq는 openai로 가능하면)
    subq_client = client
    if engine != "openai":
        okey = llm.get_api_key_silent("openai")
        subq_client = llm.make_client("openai", okey) if okey else None
    pack["subqs"] = expand_questions(q, subq_client, cfg) if subq_client else []

    queries = [q] + pack["subqs"]
    seen_src = set()
    texts = []
    for i, qq in enumerate(queries):
        if progress_cb:
            progress_cb(i / max(1, len(queries)), f"리서치 {i+1}/{len(queries)}…")
        payload, _attempts, err = run_one_search(search, client, qq)
        if payload is None:
            pack["errors"].append(f"검색 실패: {str(err)[:80]}")
            continue
        usage.bump_usage(1)
        pack["calls"] += 1
        text = (payload.get("text") or "").strip()
        urls = [clean_url(u) for u in (payload.get("urls") or []) if u]
        urls = [u for u in urls if u]
        if text:
            texts.append(f"### Research for: {qq}\n{text}")
        for u in urls:
            if u not in seen_src:
                seen_src.add(u)
                pack["sources"].append({"url": u, "domain": domain_of(u)})
        pack["queries"].append({"query": qq, "text": text[:4000], "urls": urls})

    pack["research_text"] = "\n\n".join(texts)[:9000]   # 합성 토큰 안정 — 상한
    if progress_cb:
        progress_cb(1.0, "리서치 완료")
    return pack
