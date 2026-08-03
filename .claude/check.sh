#!/bin/bash
# בדיקת תחביר ל-JS המוטמע בקבצי ה-HTML של האפליקציה.
# הפרויקט חסר build/lint/tests — זו רשת הביטחון האוטומטית היחידה.
# שימוש:  bash .claude/check.sh [קובץ.html ...]   (ברירת מחדל: demo + v37)
set -u
cd "$(dirname "$0")/.." || exit 1
files=("$@")
[ ${#files[@]} -eq 0 ] && files=("expense-app-v37-demo.html" "expense-app-v37.html")
fail=0
for f in "${files[@]}"; do
  [ -f "$f" ] || { echo "SKIP  $f (לא קיים)"; continue; }
  tmp="$(mktemp -t appjs).js"
  python3 - "$f" "$tmp" <<'PY'
import re, sys
src, out = sys.argv[1], sys.argv[2]
html = open(src, encoding='utf-8').read()
blocks = re.findall(r'<script(?![^>]*\ssrc=)[^>]*>(.*?)</script>', html, re.S)
open(out, 'w', encoding='utf-8').write("\n;\n".join(blocks))
print(f"  {len(blocks)} script blocks", file=sys.stderr)
PY
  if node --check "$tmp"; then echo "OK    $f"; else echo "FAIL  $f"; fail=1; fi
  rm -f "$tmp"
done
exit $fail
