#!/usr/bin/env python3
"""Extract the app's inline JS from a single-file HTML build so `node --check`
can parse it. The app has no build step, so this is the only way to catch a
syntax error before it reaches a browser.

Usage: python3 00_PROJECT_CONTROL/check_js.py expense-app-v37.html
Writes the extracted JS next to /tmp and prints the path for node --check.
"""
import re
import sys
import pathlib

if len(sys.argv) < 2:
    sys.exit("usage: check_js.py <html-file>")

src_path = pathlib.Path(sys.argv[1])
src = src_path.read_text(encoding="utf-8")

# inline <script> only — skip the CDN tags that carry a src attribute
blocks = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", src, re.S)
out = pathlib.Path("/tmp") / (src_path.stem + ".extracted.js")
out.write_text("\n".join(blocks), encoding="utf-8")

print(f"{len(blocks)} inline blocks, {sum(len(b) for b in blocks)} chars -> {out}")
