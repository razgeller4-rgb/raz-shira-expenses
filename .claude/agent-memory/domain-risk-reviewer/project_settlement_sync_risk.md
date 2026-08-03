---
name: project-settlement-sync-risk
description: Known structural risk in expense-app-v37 settlement cloud-sync (no tombstones, weak id scheme) — check before approving any future settlement/sync change
metadata:
  type: project
---

Reviewed 2026-06-25 on `expense-app-v37-demo.html` (sync fix: single blob → per-user rows + shared `shared-settlements` row).

Two structural issues found in the settlement merge logic (`pushSettlementsRow` / `applySettlementsRow`, ~line 2469-2512), independent of whether the specific sync fix under review is promoted:

1. **No delete tombstones.** `deleteSharedSettlement` (~line 3012) does a pure local array filter. Both merge functions are append-only unions keyed by `item.id` — they never know an id was intentionally removed. A stale device that still has the deleted item locally will resurrect it on its next push/pull. This is **not** the same as the documented "self-heals" race (which converges to correct); this can make a *correct* deleted state flip back to *wrong* indefinitely.
2. **Weak settlement id.** `addSharedSettlement` (~line 3000) uses `id: \`settle-${Date.now()}\`` — ms timestamp only, no user id, no randomness. Double-submit (double click, retry) within the same ms could create two ids for the same logical payment, both of which sum into `netBalance` in `getSharedExpenseSummary` with no other dedup safeguard.

**How to apply:** Before approving any future change that touches `pushSettlementsRow`, `applySettlementsRow`, `addSharedSettlement`, or `deleteSharedSettlement`, check whether tombstones / a stronger id scheme have been added yet. If not, these two issues are still open and should be re-flagged, not treated as new findings. See also [[feedback_data_safety]] if it exists — v37 is the real-money source of truth.
