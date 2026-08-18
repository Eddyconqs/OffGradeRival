-- Grade Arena — profile "hockey card" support
-- Run this once in the Supabase SQL Editor.
--
-- class_year drives the Rookie/Rising Star/Veteran badge on the profile
-- card. term is a free-text label ("Fall 2026") shown per class in the
-- card's stats table instead of a computed date, since the app doesn't
-- otherwise track academic terms. Both nullable — existing rows just
-- render as "not set" until a user fills them in. No RLS changes needed:
-- profiles/classes already have self-scoped policies covering all
-- columns, not just the ones that existed when they were written.

alter table public.profiles add column class_year text;
alter table public.classes add column term text;

-- profiles uses a deliberate column-level UPDATE allowlist (see
-- migration.sql: "grant update (xp, gpa, share_gpa) on public.profiles"),
-- not the table-wide default — new columns don't inherit it automatically,
-- so class_year needs its own grant or updates 403 with "permission denied
-- for table profiles" even though RLS itself is satisfied. classes has no
-- such restriction, so classes.term needed no equivalent grant.
grant update (class_year) on public.profiles to authenticated;
