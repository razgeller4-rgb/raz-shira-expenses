---
name: project-settlement-sync-risk
description: RESOLVED 2026-09 — settlement sync tombstones + strong id scheme now implemented; historical record only, do not re-flag as a new finding
metadata:
  type: project
---

Originally reviewed 2026-06-25 on `expense-app-v37-demo.html`: found no delete-tombstones and a weak id (`settle-${Date.now()}` only, ms timestamp) in `pushSettlementsRow` / `applySettlementsRow` / `addSharedSettlement` / `deleteSharedSettlement`.

**Status 2026-09-13: confirmed resolved by direct code re-check** (not just trusting other memory/docs):
- Tombstones exist end-to-end: `getSharedSettlementTombstones` / `saveSharedSettlementTombstones`, applied in both merge functions (`pushSettlementsRow` ~line 4153, `applySettlementsRow` ~line 4185) and in the read path `getSharedSettlements()` (~line 4747-4751, filters out tombstoned ids). `deleteSharedSettlement` (~4781) writes a tombstone before removing the item and requires an explicit `confirm()` (irreversible, cross-device).
- Id is now strong: `addSharedSettlement` (~4769) uses `settle-${currentUser}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` — user + timestamp + random suffix, not timestamp alone.
- Independently corroborated by `00_PROJECT_CONTROL/CALC_LOGIC_MAP.md` (dated 2026-09-10, §4): "שני הסיכונים שתועדו ב-06/2025 ... נסגרו."

**How to apply:** Do not re-raise "no tombstones" / "weak id" for settlement sync as a new finding. If a future change touches `pushSettlementsRow`, `applySettlementsRow`, `addSharedSettlement`, or `deleteSharedSettlement`, just confirm (quick grep) these two mechanisms are still intact — don't assume they're missing based on the old 2026-06-25 review.
