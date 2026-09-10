-- Production sync diagnostics — READ ONLY
-- Run only in the Supabase SQL Editor for the LIVE project.
-- This file does not read financial payloads and does not modify data or policies.

-- A. Confirm the table and active RLS policies.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'app_state'
order by policyname;

-- B. Inspect only row identity, ownership and revision — never payload.
select
  id,
  owner_id,
  updated_at
from public.app_state
where id in ('user-raz', 'user-shira', 'shared-settlements')
order by id;

-- C. Find whether the two expected app keys are assigned.
-- Requires Supabase SQL Editor/admin access; do not export the result.
select
  id,
  email,
  raw_app_meta_data ->> 'app_user_key' as app_user_key,
  created_at,
  last_sign_in_at
from auth.users
where raw_app_meta_data ->> 'app_user_key' in ('raz', 'shira')
order by app_user_key;

-- D. If the project uses a production allow-list table, inspect it too.
-- If this returns “relation does not exist”, record that result; do not create it yet.
select
  user_id,
  app_user_key,
  created_at
from public.app_state_allowed_users
order by app_user_key;

-- Expected invariant after diagnosis:
-- user-raz.owner_id = auth user whose app_user_key is raz
-- user-shira.owner_id = auth user whose app_user_key is shira
-- shared-settlements.owner_id IS NULL only if its RLS policy is household-safe.
