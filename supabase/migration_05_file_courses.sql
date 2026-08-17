-- Grade Arena — link personal files to a course
-- Run this once in the Supabase SQL Editor against a project that already
-- has migration.sql applied.

alter table public.files add column class_id uuid references public.classes(id) on delete set null;
