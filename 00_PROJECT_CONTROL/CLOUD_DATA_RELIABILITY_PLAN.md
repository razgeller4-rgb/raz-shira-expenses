# Cloud & Data Reliability Plan — Raz + Shira

**Priority:** P0 / production incident · **Status:** discovery and remediation plan  
**Scope correction:** this plan targets the live site, `expense-app-v37.html` (production), not the V38 demo. The production file has not received the demo redesign.
**Goal:** Shira and Raz always use the same live app version, authenticate as themselves, and safely push/pull their own data and the shared household data.

## What we know now

1. The live site is deployed through GitHub Pages, while local `file://` copies can remain open independently. A user can therefore see a valid-but-old local file or a cached Pages response.
2. The client writes per-user snapshots to `app_state` as `user-raz` / `user-shira`; `owner_id` is stamped from the authenticated Supabase session.
3. The current RLS model allows a user to read/write their own row plus shared rows (`owner_id IS NULL`). It does **not** yet implement a household read model.
4. A Supabase session must include `app_metadata.app_user_key` (`raz` / `shira`). Without it, the client must not treat the person as linked to the app.

## 2026-08-29 — Production read-only audit

**Confirmed from the live Supabase project `קובץ הוצאות` (read-only):** both authenticated users are in `app_state_allowed_users`; their immutable app roles are `raz` and `shira`; and `user-raz`, `user-shira`, and `shared-settlements` have the matching owners. The live RLS policies permit each authenticated allow-listed user to read/write their own row and shared rows.

**Implication:** the reported 403 is not explained by a missing household member, missing role metadata, or a missing `user-shira` row. The remaining most likely causes are device/session configuration (expired or wrong token, a disabled/old local cloud configuration) or a stale/local app build. The GitHub Pages branch also matches the current repository head (`5ea4cdf`); the user must use the canonical HTTPS page, not a `file://` copy.

**Decision rule:** do not patch `expense-app-v37.html` until the sync-card message and browser network response from Shira's device classify the failure. `401/403` with an anonymous/stale token points to session/configuration; a 403 carrying the authenticated user points to a request/ownership mismatch; a “disabled/no connection” badge points to device configuration.

**Prepared diagnostic:** `supabase-production-sync-diagnostics.sql` is read-only and intentionally excludes financial payloads. Run it in the live Supabase SQL Editor, retain the result privately, then apply only the targeted repair.

## 2026-08-29 — Confirmed cross-device root cause

`fetchCloudUserRows()` explicitly asks Supabase for both `user-raz` and `user-shira`, and `assembleFromCloudRows()` is written to merge the partner row. However, the production `SELECT` RLS policy permits only `owner_id = auth.uid()` or `owner_id IS NULL`. PostgreSQL silently filters out the partner's row rather than returning an error. Each device therefore receives only its own personal state plus shared settlements, while a recovery point is an ownerless shared full snapshot and appears to “work”.

**P0 correction:** broaden only the `SELECT` policy for the two allow-listed household accounts so each can read the other allow-listed personal snapshot. Do not broaden `INSERT`, `UPDATE`, or `DELETE`: personal writes remain restricted to `owner_id = auth.uid()`.

**Status:** applied to the live `קובץ הוצאות` Supabase project on 2026-08-29. Supabase accepted the transaction with no data rows changed. A genuine two-device pull/push test remains required before this gate is marked complete.

**Verification:** after the policy change, Raz and Shira each pull exactly three identifiers (`user-raz`, `user-shira`, `shared-settlements`); each may write only their own `user-*` row; an anonymous user and a non-member receive no rows. Create local recovery points before the change and test with one labelled, non-financial edit per device.

## Non-negotiable product rules

- A person never chooses the other partner's identity in the UI after login.
- Personal rows are writable only by their owner; household reads are defined in RLS, not JavaScript.
- Sync never overwrites local data silently. Every pull/push is versioned and recoverable.
- The UI always says whether it is **offline**, **sign-in required**, **syncing**, **synced**, or **failed**.
- Production is not changed until the demo passes this plan.

## Production incident sequence — before any redesign rollout

1. **Freeze destructive actions:** Shira does not use “משוך מהענן”, reset, restore or overwrite until a recovery point is recorded.
2. **Identify the exact live build:** capture the HTTPS URL, current page title/version, account identity and the sync-card message on Shira's device.
3. **Check Supabase facts read-only:** verify that Shira's Auth account exists, has `app_user_key = shira`, and can read/write only the expected `user-shira` snapshot row.
4. **Take a production recovery snapshot:** export/local backup from both devices and record remote `updated_at` values before a fix.
5. **Reproduce safely:** one harmless labelled edit from Shira, observe request/result, then verify whether the cloud row changes and whether Raz can pull it without overwriting local state.
6. **Patch only the proven fault:** auth metadata, RLS, client error handling or release/version integrity. Every production patch is separate from V38 and has rollback.

**Production DoD:** Shira can push a labelled test update, it appears in the expected cloud state, the sync card reports success, and no existing row changes unexpectedly.

## Remediation plan

### Gate C0 — Version integrity (same app for both devices)

1. Establish one canonical URL: GitHub Pages production URL, never a `file://` shortcut for collaborative use.
2. Show a visible build identifier: git short SHA + deployment timestamp + environment (`demo` / `production`).
3. Add a `version.json` release manifest generated at commit time; the app compares it on load and offers “רענן לגרסה חדשה”.
4. Set no-cache headers where hosting permits; otherwise cache-bust the HTML app version via deployment query/version manifest.
5. Test on Raz and Shira devices: same SHA, same current date, same auth state after a hard refresh.

**DoD:** both devices report identical build ID from the canonical HTTPS URL.

### Gate C1 — Identity and onboarding

1. Create/verify two Supabase Auth users with distinct email addresses.
2. Set immutable `app_metadata.app_user_key`: `raz` and `shira` server-side only.
3. Make first sign-in show account identity, household membership and sync status.
4. Provide a safe “יציאה והתחברות מחדש” recovery path; never expose keys or metadata editors.
5. Log auth failures with a user-safe code and a detailed developer diagnostic.

**DoD:** Raz cannot act as Shira, Shira cannot act as Raz, and an unlinked user receives a clear recoverable error.

### Gate C2 — Household schema and RLS

1. Prototype `households` and `household_members` in a separate test schema/project; promote to production only after the production incident is resolved and backups are verified.
2. Map `auth.uid()` to exactly one membership for this household.
3. Personal snapshot/transaction: household members may read if product policy requires it; only `owner_id = auth.uid()` can create/update/delete.
4. Shared objects (`settlements`, shared budgets, import batches) are explicit `household_id` rows, never inferred from `owner_id = null` alone.
5. Add `created_by`, `updated_by`, `updated_at`, `version` and `source` to cloud writes.

**Mandatory RLS tests:**

| Scenario | Expected |
|---|---|
| Raz reads Shira's household-visible row | allowed |
| Raz edits/deletes Shira's personal row | denied |
| Shira creates a row owned by Raz | denied |
| non-member reads either partner | denied |
| anonymous request reads/writes | denied |
| shared settlement update | allowed only under documented household rule + audit |

### Gate C3 — Safe sync protocol

1. Replace “last write wins” with a per-row `version` / `updated_at` comparison.
2. Pull flow: fetch → compare local/remote → show conflict count → create recovery point → apply only approved changes.
3. Push flow: validate session + ownership → create immutable audit event → upsert only eligible rows → report accepted/rejected counts.
4. Conflict flow: keep both versions, show “local / cloud / merge manually”; never delete either automatically.
5. Background sync is debounced and visibly cancellable; manual Sync Now remains available.

**DoD:** offline edits from both devices do not silently erase data; a conflict becomes a review item.

### Gate C4 — Observability and support

1. Sync health card: build ID, identity, household, last successful pull/push, remote revision and error code.
2. Local diagnostics export with no passwords, tokens or financial payload by default.
3. Cloud audit table for actor, action, row type, batch ID and result.
4. Alert only on actionable failures: expired session, RLS rejection, version conflict, malformed import.
5. Weekly automated health check after production launch.

## Immediate triage for Shira

1. Open the canonical HTTPS production URL, not a local file shortcut.
2. Confirm the build ID and account name shown in the app.
3. Sign out/in once if identity or session is stale.
4. Capture the sync-card status/error text before retrying a push.
5. Do **not** reset local storage, pull cloud, or overwrite data until a recovery point exists.

## Release gate

No V38 production rollout until C0–C3 pass on **two real devices** and the five RLS tests are recorded. The existing production incident is handled first through the incident sequence above.
