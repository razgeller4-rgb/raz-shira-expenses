-- P0 cross-device sync repair — PRODUCTION ACCESS-CONTROL CHANGE
-- Do not run until the owner confirms in the Supabase SQL Editor.
-- Purpose: let the two explicit allow-listed household users READ both personal
-- snapshots. It intentionally does NOT grant cross-user INSERT/UPDATE/DELETE.
-- It does not touch any financial payload or row data.

begin;

drop policy if exists "auth users read own or shared app_state" on public.app_state;

create policy "auth household users read household app_state"
on public.app_state
for select
to authenticated
using (
  exists (
    select 1
    from public.app_state_allowed_users viewer
    where viewer.user_id = auth.uid()
  )
  and (
    owner_id is null
    or owner_id in (
      select member.user_id
      from public.app_state_allowed_users member
    )
  )
);

commit;

-- Post-change verification (read-only; never select payload):
-- As each signed-in client, GET /rest/v1/app_state?id=in.(user-raz,user-shira,shared-settlements)&select=id,owner_id,updated_at
-- Expected: both members see three rows; only their own user-* row is writable.
