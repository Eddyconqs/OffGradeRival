-- Grade Arena — friends feed addendum
-- Run this once in the Supabase SQL Editor against a project that already
-- has migration.sql applied.

-- ============================================================
-- posts — a lightweight feed of updates from your friend circle.
-- Visibility mirrors friendships everywhere else in this app: you see your
-- own posts plus posts from anyone you're accepted friends with (same
-- "either side" check used by public_profiles / group access). There is no
-- global/public feed.
-- ============================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  gif_data_url text,
  created_at timestamptz not null default now(),
  constraint post_has_content check (coalesce(btrim(text), '') <> '' or gif_data_url is not null)
);

alter table public.posts enable row level security;

create policy "read own or friends' posts" on public.posts for select
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = author_id)
          or (f.addressee_id = auth.uid() and f.requester_id = author_id))
    )
  );

create policy "post as yourself" on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "author deletes own post" on public.posts for delete
  to authenticated
  using (author_id = auth.uid());
