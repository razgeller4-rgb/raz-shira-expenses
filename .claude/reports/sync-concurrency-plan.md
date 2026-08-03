# Sync Concurrency Fix — Architecture Plan

**App:** expense-app-v37.html (production, Supabase-synced)
**Author:** solution-architect
**Date:** 2026-06-25
**Status:** Plan only — no code written. Awaiting Raz's decision on Open Decisions.

---

## 1. Context

- **Problem:** Raz and Shira both open the app, both edit, last push silently overwrites the other's work.
- **For whom:** 2 users, iPhone Safari, Hebrew RTL, single self-contained HTML file, vanilla JS, no build step.
- **Hard constraint:** must not corrupt or lose existing `app_state` production data. Migration must be safe + reversible.

---

## 2. Root Cause (3-4 lines)

The entire two-user app state is stored as ONE JSON blob in a single Supabase row (`id="shared-expense-app"`). `collectCloudSnapshot()` bundles **both** users' namespaced keys (`getCloudSyncKeys()` → `USERS.flatMap(...)`) into that one blob. Every local change debounces 900ms (`scheduleCloudSync`) then full-blob upserts with `resolution=merge-duplicates` — which is row-level last-write-wins, **not** a field merge. There is no realtime subscription and no read-before-write guard, so whoever's 900ms timer fires last overwrites the other's entire half of the blob, including changes they never saw.

**Two latent bugs found while reading the code (call these out to Raz):**
- **B1 — settlements don't sync at all.** `expense_app_shared_settlements_v1` is written locally and calls `scheduleCloudSync()`, but it is **NOT** in `getCloudSyncKeys()`. So shared settlements live only on whichever device created them and are never pushed to the cloud. Any concurrency fix that re-keys the blob must also decide whether to start syncing this key.
- **B2 — single non-scoped shared key.** Settlements use one global key (no per-user suffix), so they are genuinely co-edited by both users — the one place where "split per user" does not fully separate writes.

---

## 3. Candidate Approaches

### (a) Supabase Realtime subscribe + reconcile-on-change

Open a websocket subscription to the `app_state` row. When the other device pushes, receive the new payload and reconcile into local state live.

| Pros | Cons |
|------|------|
| Near-instant convergence; users see each other's edits live | Requires `supabase-js` (or hand-rolled phoenix websocket) — **breaks the "plain fetch, no build step" model**; adds a CDN dependency |
| Feels modern | Reconcile-into-live-state while a user is mid-edit is the hardest UI problem here (cursor/form clobbering) |
| | iOS Safari backgrounds tabs aggressively → socket drops, reconnect storms, battery cost on mobile |
| | Still need a merge strategy underneath — realtime only changes *when* you find out, not *how* you merge |

**Verdict:** over-engineered for 2 users who edit a few times a day. Adds the most moving parts and the most mobile-Safari risk. Reject.

### (b) Optimistic concurrency guard (updated_at / version, reject stale → re-pull → merge)

Before upsert, send the `updated_at` (or an integer `version`) we last saw. DB rejects the write if the row moved since (conditional update). On rejection: re-pull, merge, retry.

| Pros | Cons |
|------|------|
| Stays on plain fetch; no new deps | A correct field-level merge of two arbitrary JSON blobs is real work — and the blob still contains *both* users, so you must merge per-key anyway |
| Standard, well-understood pattern | Conditional update over PostgREST needs an RPC or a careful `?updated_at=eq.X` filter + row-count check; fiddly |
| Protects against the lost-write directly | If you're going to merge per-key, you've already done 80% of the work of just splitting the rows — but kept the contention |

**Verdict:** correct but does more work than needed. Because the blob is two independent users glued together, the guard buys you a conflict you then have to merge — when the cleaner move is to make the conflict impossible. Reject as primary, but **keep the `version`/`updated_at` guard idea as a cheap safety net on the shared settlements row** (see B2).

### (c) Split the single blob into per-user rows (RECOMMENDED)

Replace the one `shared-expense-app` row with **one row per user**: `user-raz` and `user-shira`. Each device only ever **writes its own row**. On read/sync, each device pulls **both** rows and assembles the full picture. Plus **one shared row** `shared-settlements` for the genuinely co-edited settlement list (guarded with approach-b style optimistic concurrency, since both write it — but it's a small append-mostly list).

| Pros | Cons |
|------|------|
| The two users **physically cannot overwrite each other** — different primary keys | Settlement row is still co-edited (B2); needs a light guard or append-merge |
| Stays 100% on plain fetch REST — no supabase-js, no websocket, no build step | Two/three reads instead of one on pull (trivial at this scale) |
| Maps perfectly onto the existing data model: keys are **already** namespaced per user | One-time migration of the existing blob |
| Migration is a pure copy (old blob → two new rows); old row kept untouched = reversible | Cross-device freshness still depends on pull cadence (mitigate with pull-on-focus) |
| Smallest change to the mental model and the code | |

**Verdict:** RECOMMENDED. The data is already split by user in localStorage; we're just stopping the code from re-merging it into a shared row before writing. This removes the lost-write class entirely for personal data, keeps the no-build-step constraint, and is the smallest, most reversible change.

---

## 4. Recommended Design — Per-User Rows + Guarded Shared Row

### Row layout (table `app_state`, schema unchanged)

| Row id | Written by | Read by | Contents |
|--------|-----------|---------|----------|
| `user-raz` | Raz's device only | both | Raz's 7 namespaced keys |
| `user-shira` | Shira's device only | both | Shira's 7 namespaced keys |
| `shared-settlements` | both (guarded) | both | `expense_app_shared_settlements_v1` |
| `shared-expense-app` (OLD) | nobody after migration | migration only | legacy blob — **kept, frozen, never deleted** |
| `backup-snapshot-*` | unchanged | unchanged | recovery points — no change |

`CLOUD_SYNC_ROW_ID` stays defined but is no longer the write target for live sync. New constants:
```
CLOUD_SYNC_ROW_PREFIX = "user-"        // → user-raz / user-shira
CLOUD_SETTLEMENTS_ROW_ID = "shared-settlements"
```

### Data flow — local change (push)

1. User edits → `saveX()` → `markLocalDataChanged()` → `scheduleCloudSync()` (900ms debounce — unchanged).
2. Timer fires → new `pushCloudSnapshot()`:
   1. Collect **only the current user's** keys (`getAllUserStorageKeys(currentUser)`) into a per-user snapshot.
   2. Upsert to row `user-${currentUser}` only.
   3. Separately, if settlements changed, upsert `shared-settlements` **with optimistic guard** (send last-seen `updated_at`; on conflict, re-pull settlements, append-merge by `id`, retry once).
3. Save recovery point (unchanged path, still full snapshot).

### Data flow — load / pull (assemble both)

1. New `pullCloudSnapshot()` / bootstrap fetches **both** `user-raz` and `user-shira` rows (+ `shared-settlements`).
2. `applyCloudSnapshot()` writes each user's keys back into their own namespaced localStorage keys (logic already per-key, just fed from two rows instead of one).
3. **Self-row freshness rule:** for the *current* user's own row, apply remote only if remote `changedAt` ≥ local `changedAt` (don't clobber unsaved local edits with a slightly-stale self-row). For the *other* user's row, always take remote (you never write it, so remote is authoritative).
4. Settlements: take remote, append-merge any local-only `id`s.

### Freshness on mobile (cheap, no websocket)

Add **pull-on-focus**: on `visibilitychange`/`focus`, if last pull > N seconds ago, pull. iOS Safari fires these when returning to the tab. This gives "open the app → see partner's latest" without a socket. Optional: a light poll (e.g. every 60s while visible). This is the pragmatic substitute for Realtime at 2-user scale.

---

## 5. Functions That Change

| Function | Change |
|----------|--------|
| `collectCloudSnapshot()` | Add param/variant to collect **one user's** keys (`getAllUserStorageKeys(userId)`) instead of all. Keep a full-snapshot variant for recovery points. |
| `applyCloudSnapshot()` | Accept a per-user payload; merge into localStorage per-key (mostly unchanged — already per-key). Add caller that applies two payloads. |
| `pushCloudSnapshot()` | Target `user-${currentUser}` row, not `CLOUD_SYNC_ROW_ID`. Add separate guarded push for `shared-settlements`. |
| `fetchCloudState()` | Generalize to fetch a given row id (or fetch the two user rows + settlements). |
| `pullCloudSnapshot()` | Fetch both user rows + settlements; apply with the self-row vs other-row freshness rule. |
| `bootstrapCloudSync()` | Same assemble-both logic on load; plus the **one-time migration** step (see §6). |
| `getCloudSyncKeys()` | Keep for recovery/backup (full set). Add `getCloudSyncKeysForUser(userId)` for per-row push. **Add settlements key to whichever set should now sync (fixes B1).** |
| `scheduleCloudSync()` | Unchanged (still debounced). |
| New: `migrateBlobToPerUserRows()` | Runs once, flag in localStorage. |
| New: focus/visibility listener | Pull-on-focus. |

No schema change required — the existing `(id, payload, updated_at)` table already supports multiple rows. (Optional: add an integer `version` column for a stricter settlements guard; not required if we use `updated_at`.)

---

## 6. Migration (safe + reversible)

**Principle:** additive only. The old `shared-expense-app` row is **read once, never modified, never deleted.** New rows are created alongside it. If anything breaks, flip one constant back.

Steps (run inside `bootstrapCloudSync`, gated by a `localStorage` flag `cloud_split_migration_v1`):

1. **Backup first (no ask):**
   `cp "backups/raz-expenses-backup-LATEST.json" "backups/raz-expenses-backup-$(date +%Y-%m-%d_%H-%M).json"`
   Also create a cloud recovery point (existing `saveCloudRecoveryPoint`) before migrating.
2. **Read** the legacy `shared-expense-app` row (existing `fetchCloudState`).
3. **If** `user-raz` / `user-shira` rows do **not** yet exist: split the legacy blob's `data` by user key-prefix and **insert** `user-raz` and `user-shira`. Split out the settlements key into `shared-settlements`.
4. **Set** local flag `cloud_split_migration_v1=done` so it never re-runs.
5. **Leave** `shared-expense-app` in place, frozen, as the rollback artifact.

Because only one device needs to perform the split (it's idempotent — guarded by "rows don't exist yet"), whichever of Raz/Shira opens the updated app first migrates; the second device just reads the new rows.

**Reversibility:** the legacy row is intact. Rollback = redeploy the previous HTML (which still reads/writes `shared-expense-app`). No data was destroyed; at worst, edits made *after* migration on the new rows would need a manual re-merge from the new rows back into the blob — but the blob from migration time is preserved as a floor.

---

## 7. How to Test Two-Device Simultaneous Editing

Follow the project's demo-first rule. Build all of this on `expense-app-v37-demo.html` (namespace `demo__`, no Supabase) **plus** a throwaway Supabase test row set first — do **not** touch v37 production until Raz signs off.

**Test matrix (two physical iPhones, or iPhone + desktop Safari with two profiles):**

1. **Lost-write regression (the actual bug):**
   - Device A (Raz) edits an expense; Device B (Shira) edits a different expense *within the same 900ms-plus window*.
   - Both let auto-sync fire. Foreground both. **Expected:** both edits survive. (Pre-fix: one is lost.)
2. **Self-row protection:** Device A makes a local edit, does NOT let it sync, then pulls. **Expected:** unsynced local edit is not clobbered by a stale self-row.
3. **Cross-user visibility:** Raz adds an expense; on Shira's device, switch tab away and back (triggers pull-on-focus). **Expected:** Raz's new state appears in Shira's view of Raz.
4. **Settlement co-edit (B2):** Both add a settlement near-simultaneously. **Expected:** both settlements present after sync (append-merge by id), no loss.
5. **Migration idempotency:** Open the new build on Device A (migrates), then Device B (reads new rows, does not re-migrate, does not duplicate). Re-open A. **Expected:** no duplicate rows, flag respected.
6. **Rollback drill:** Point a test build back to the legacy `shared-expense-app` row → confirm data still loads from the frozen blob.

**Verification queries (Supabase, test project):**
- `select id, updated_at from app_state order by updated_at desc;` → confirm `user-raz`, `user-shira`, `shared-settlements` exist and only the editing user's row's `updated_at` moves on that user's edit.

---

## 8. Scalability Notes

- **What breaks first:** nothing at 2 users / a few edits a day. The settlements row is the only contended write; append-merge + single guard is plenty.
- **Deferred (do NOT build now):** Realtime websocket, CRDT/field-level merge, per-entry rows, operational transform. None justified for 2 users. Pull-on-focus + per-user rows covers it.
- **If it ever grew** (more users, frequent concurrent edits): then revisit approach (a) Realtime, and split data to per-entity rows. Not now.

---

## 9. Risk + Rollback

| Risk | Mitigation |
|------|------------|
| Migration corrupts/loses data | Legacy row frozen + JSON backup + cloud recovery point before migrating; migration is insert-only |
| Both devices migrate and create duplicates | Idempotent: guard on "user rows don't exist yet" + local done-flag |
| Settlement co-edit still races | Optimistic `updated_at` guard + append-merge by id; small append-mostly list |
| Stale self-row overwrites unsynced local edits | Self-row vs other-row freshness rule (§4) |
| B1 (settlements never synced) silently persists | Explicitly add settlements key to sync set as part of this work — call out to Raz first |
| iOS Safari tab backgrounding misses updates | Pull-on-focus; optional 60s visible-poll |

**Rollback:** redeploy previous HTML → it reads/writes the untouched `shared-expense-app` blob. Zero destructive operations in the whole plan.

---

## 10. Open Decisions (need Raz before feature-builder starts)

1. **Settlements (B1):** confirmed they currently do NOT sync to cloud. Start syncing them as part of this work (recommended) — yes/no?
2. **Freshness:** pull-on-focus only, or also a light 60s poll while the app is open? (Poll = fresher, marginally more requests/battery.)
3. **Settlement conflict policy:** append-merge by id (keep both) vs last-write-wins on the settlements row. Recommend append-merge.
4. **Migration trigger:** auto-migrate silently on first load of the new build (recommended, with backups), or gate behind a manual "שדרג סנכרון" button so Raz controls the moment?
5. **Optional `version` column:** add an integer `version` to `app_state` for a stricter settlements guard, or rely on `updated_at`? Recommend `updated_at` (no schema change).
