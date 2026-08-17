-- Grade Arena — allow updating files (needed for AI notes to actually save)
-- Run this once in the Supabase SQL Editor against a project that already
-- has migration_06_ai_notes.sql applied.
--
-- There was no UPDATE policy on public.files at all, so the ai_notes save
-- in generateFileNotes() was being silently dropped by RLS (0 rows
-- affected, no error) — notes generated fine but never persisted.

create policy "owner or group member updates file" on public.files for update
  to authenticated
  using (
    (group_id is null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  )
  with check (
    (group_id is null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  );
