#!/usr/bin/env python3
"""Promote expense-app-v37-demo.html to expense-app-v37.html.

The two files are the same app with exactly two intentional differences:
the localStorage namespace and the Supabase table name. Everything else
drifting apart is drift, not design — which is how production ended up
missing four sync keys and a quota guard for two days while the demo had
them.

So the promotion is mechanical: take the demo, invert those two knobs, and
that is production. What makes it safe is the checking around it.

Run with --check to see what would happen without writing anything.

Guards, in order:
  1. Nothing may exist only in production. A function, constant, or element
     id present in prod but absent from demo means prod has something the
     demo never had, and copying would delete it. Hard stop.
  2. No storage key may exist only in production, for the same reason.
  3. No key may change scope (global <-> per-user) without a migration
     registered below. A scope change renames the key, which silently
     orphans whatever was stored under the old name.
  4. The output must contain zero demo markers.
  5. The output's JS must parse.
"""

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEMO = ROOT / "expense-app-v37-demo.html"
PROD = ROOT / "expense-app-v37.html"

# Keys whose scope legitimately changes, each with the migration that carries
# the old data over. Anything not listed here is a hard stop.
MIGRATED_SCOPE_CHANGES = {
    "expense_app_merchant_memory_v1": "migrateLegacyMerchantMemory",
}

# Production identifiers the demo deliberately drops, each with what replaced
# it. Every entry is a decision someone has to justify in writing, which is the
# point — an empty dict means a clean promotion.
ALLOWED_REMOVALS = {
    "MERCHANT_MEMORY_STORAGE_KEY":
        "a single global key for both users; replaced by "
        "getMerchantMemoryStorageKey(), which scopes it per user so it syncs "
        "and backs up. Only shira's key is actually renamed (raz's stays "
        "unsuffixed), and migrateLegacyMerchantMemory() seeds hers from the "
        "shared blob.",

    # The backup tab offered manual pull and push buttons alongside automation
    # that already did both: every save schedules a push, and load plus
    # tab-focus each pull. The buttons implied the automation could not be
    # trusted. The underlying functions are kept and annotated - only the UI
    # entry points are gone.
    "pullCloudSyncBtn":
        "manual pull button; the app already pulls on load and on tab focus "
        "via maybePullOnFocus, so the button was redundant.",
    "pushCloudSyncBtn":
        "manual push button; scheduleCloudSync already fires from every save "
        "path, so the button was redundant.",
    "clearCloudSyncBtn":
        "disconnect-sync button; Raz judged it irrelevant for a two-person "
        "household app, and logging out already stops syncing.",
}

CHECK_ONLY = "--check" in sys.argv


def fail(msg):
    print(f"\n\033[31mSTOP\033[0m  {msg}\n")
    sys.exit(1)


def ok(msg):
    print(f"  \033[32mok\033[0m    {msg}")


def demo_to_prod(text):
    text = text.replace("app_state_demo", "app_state")
    text = text.replace('const STORAGE_NS_PREFIX = "demo__";',
                        'const STORAGE_NS_PREFIX = "";')
    return text


def identifiers(text):
    pat = r'^\s*(?:async )?function ([A-Za-z0-9_]+)|^const ([A-Z_]{4,})|id="([A-Za-z0-9_]+)"'
    found = set()
    for m in re.finditer(pat, text, re.M):
        found.add(next(g for g in m.groups() if g))
    return found


def storage_keys(text):
    return set(re.findall(r'"(?:demo__)?(expense_app[a-z_0-9]*)"', text))


def global_keys(text):
    return set(re.findall(r'STORAGE_NS_PREFIX \+ "(expense_app[a-z_0-9]*)"', text))


def scoped_keys(text):
    return set(re.findall(r'getScopedStorageKey\("(expense_app[a-z_0-9]*)"', text))


def main():
    demo_src = DEMO.read_text(encoding="utf-8")
    prod_src = PROD.read_text(encoding="utf-8")
    candidate = demo_to_prod(demo_src)

    print(f"\npromoting {DEMO.name} -> {PROD.name}"
          f"{'  (check only)' if CHECK_ONLY else ''}\n")

    # 1. nothing may exist only in production, unless justified above
    orphaned = identifiers(prod_src) - identifiers(candidate)
    unexplained = orphaned - set(ALLOWED_REMOVALS)
    if unexplained:
        fail("these exist only in production and would be deleted:\n"
             + "\n".join(f"    - {name}" for name in sorted(unexplained)))
    for name in sorted(orphaned):
        ok(f"{name} removed on purpose — {ALLOWED_REMOVALS[name]}")
    ok("no unexplained production-only identifiers")

    # 2. no storage key may exist only in production
    lost_keys = storage_keys(prod_src) - storage_keys(candidate)
    if lost_keys:
        fail("these storage keys exist only in production:\n"
             + "\n".join(f"    - {k}" for k in sorted(lost_keys)))
    ok("no production-only storage keys")

    # 3. scope changes need a migration
    changed = global_keys(prod_src) & scoped_keys(candidate)
    unmigrated = changed - set(MIGRATED_SCOPE_CHANGES)
    if unmigrated:
        fail("these keys change scope with no migration, which orphans "
             "existing data:\n"
             + "\n".join(f"    - {k}" for k in sorted(unmigrated)))
    for key, fn in MIGRATED_SCOPE_CHANGES.items():
        if key in changed:
            if f"function {fn}" not in candidate:
                fail(f"{key} changes scope but {fn}() is not defined")
            # defined is not enough — it has to actually run
            if len(re.findall(rf"\b{fn}\(\)", candidate)) < 2:
                fail(f"{fn}() is defined but never called")
            ok(f"{key} scope change covered by {fn}()")

    # 4. no demo markers survive in code. Comments may legitimately mention
    #    "demo__" while documenting the two builds, so they are stripped first
    #    — a stale comment is a docs problem, a stale key is a data problem.
    code_only = re.sub(r"/\*.*?\*/", "", candidate, flags=re.S)
    code_only = re.sub(r"^\s*//.*$", "", code_only, flags=re.M)
    for marker in ("app_state_demo", "demo__"):
        if marker in code_only:
            n = code_only.count(marker)
            fail(f'{n} occurrence(s) of "{marker}" survived the rewrite '
                 f"(in code, not comments)")
    ok("no demo markers in output code")

    if 'const STORAGE_NS_PREFIX = "";' not in candidate:
        fail("STORAGE_NS_PREFIX is not empty in the output")
    ok("STORAGE_NS_PREFIX is empty")

    # 5. the JS has to parse
    blocks = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>",
                        candidate, re.S)
    js = pathlib.Path("/tmp/promote_candidate.js")
    js.write_text("\n".join(blocks), encoding="utf-8")
    result = subprocess.run(["node", "--check", str(js)],
                            capture_output=True, text=True)
    if result.returncode != 0:
        fail(f"candidate JS does not parse:\n{result.stderr}")
    ok("candidate JS parses")

    added = len(candidate.splitlines()) - len(prod_src.splitlines())
    print(f"\n  {added:+d} lines vs current production")

    if CHECK_ONLY:
        print("\n  check only — nothing written\n")
        return

    PROD.write_text(candidate, encoding="utf-8")
    print(f"\n  \033[32mwrote\033[0m {PROD.name}\n")


if __name__ == "__main__":
    main()
