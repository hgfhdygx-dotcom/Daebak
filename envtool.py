# -*- coding: utf-8 -*-
"""
envtool.py — .env 의 한 줄(KEY=VALUE)만 안전하게 upsert (다른 키 보존)
=====================================================================
.bat 들이 키를 넣을 때 .env 전체를 덮어쓰지 않도록(다른 키 날아감 방지).
사용: python envtool.py OPENAI_API_KEY "sk-..."
"""

from __future__ import annotations

import os
import re
import sys


def set_env_var(name: str, value: str, path: str = ".env") -> None:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
    lines = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            lines = f.read().splitlines()
    out, found = [], False
    for ln in lines:
        if re.match(rf"\s*{re.escape(name)}\s*=", ln):
            out.append(f"{name}={value}")
            found = True
        else:
            out.append(ln)
    if not found:
        out.append(f"{name}={value}")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(out).strip() + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: python envtool.py NAME VALUE")
        sys.exit(1)
    set_env_var(sys.argv[1], sys.argv[2])
    print(f"[DONE] {sys.argv[1]} saved to .env")
