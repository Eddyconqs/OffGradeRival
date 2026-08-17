-- Grade Arena — lock down public_profiles
-- Run this once in the Supabase SQL Editor.
--
-- public_profiles is SECURITY DEFINER (necessary — it needs to see past
-- the "only your own row" RLS on profiles to power friend search / shared
-- GPA). But it inherited Postgres/Supabase's default grants, which meant:
--   - `anon` (fully unauthenticated) had SELECT on it — anyone on the
--     internet could read every student's real full name.
--   - It's an auto-updatable view, and both `anon` and `authenticated`
--     had UPDATE/INSERT/DELETE on it — combined with SECURITY DEFINER
--     bypassing profiles' own RLS, that's a write-bypass path for
--     unauthenticated users to modify or delete arbitrary profile rows.
--
-- The view's own SELECT logic (the CASE statements gating xp/gpa) was
-- always correct — this only tightens who can reach it and how.

revoke all on public.public_profiles from anon;
revoke all on public.public_profiles from authenticated;
grant select on public.public_profiles to authenticated;
