---
name: project-sync-concurrency
description: The concurrent-edit cloud-sync fix — per-user Supabase rows + guarded shared-settlements row. Built on demo, awaiting promotion to v37.
metadata:
  type: project
---

Cloud sync was changed from ONE shared JSON blob row (`shared-expense-app`) to **per-user rows** (`user-raz`, `user-shira`) + ONE shared row (`shared-settlements`). Each device writes ONLY its own user row → two users physically cannot overwrite each other. Settlements are co-edited → guarded row with append-merge by id.

**Why:** Raz and Shira both edited concurrently; the 900ms debounce push did a row-level last-write-wins on the single blob, silently clobbering the other's half. Plan: `.claude/reports/sync-concurrency-plan.md` (approach (c), per-user rows).

**Two latent bugs fixed alongside:**
- B1: `expense_app_shared_settlements_v1` called `scheduleCloudSync()` but was NOT in `getCloudSyncKeys()` → settlements never reached the cloud. Now synced via the `shared-settlements` row, gated by a `settlementsDirty` flag set in `saveSharedSettlements`.
- B2: settlement key is global (no per-user suffix) — kept shared, correct for a co-edited row.

**How to apply:**
- Migration `migrateBlobToPerUserRows()` is ADDITIVE + REVERSIBLE: reads legacy blob, creates new rows, LEAVES the old blob frozen. Guarded by localStorage flag `cloud_split_migration_v1`. Rollback = redeploy previous HTML (still reads the frozen blob).
- The legacy `shared-expense-app` row must stay READ-ONLY (only `migrateBlobToPerUserRows` reads it). Never write to it again.
- Recovery points & backups still use FULL snapshots (both users); restore paths use `pushAllRowsFromLocal()` to write both rows back.
- Still on plain fetch REST — NO supabase-js, NO websocket. Pull-on-focus (`maybePullOnFocus`) is the freshness mechanism, throttled 30s.
- **Status: implemented on `expense-app-v37-demo.html` ONLY.** Demo has cloud disabled (`disabled:true`, namespace `demo__`) so sync is unrunnable there — code written, not live-tested. NOT yet promoted to v37 production. See [[project-expense-app]] for the demo→v37 promotion workflow.
