-- Grade Arena — reactions and comments on feed posts
-- Run this once in the Supabase SQL Editor against a project that already
-- has migration_03_feed.sql applied.

-- Shared visibility check (same rule as posts.select: your own posts, or an
-- accepted friend's) — factored out so reactions/comments don't duplicate it.
create function public.can_see_post(pid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.posts p
    where p.id = pid
      and (
        p.author_id = auth.uid()
        or exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = auth.uid() and f.addressee_id = p.author_id)
              or (f.addressee_id = auth.uid() and f.requester_id = p.author_id))
        )
      )
  );
$$;

-- ============================================================
-- post_reactions — one emoji reaction per user per post. Tapping the same
-- emoji again removes it; tapping a different one swaps it (enforced in
-- the app, not the DB — the unique constraint just keeps it to one row).
-- ============================================================
create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.post_reactions enable row level security;

create policy "read reactions on visible posts" on public.post_reactions for select
  to authenticated
  using (public.can_see_post(post_id));

create policy "react as yourself on visible posts" on public.post_reactions for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_see_post(post_id));

create policy "change own reaction" on public.post_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "remove own reaction" on public.post_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- post_comments — same content shape as posts (text and/or a GIF).
-- ============================================================
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  gif_data_url text,
  created_at timestamptz not null default now(),
  constraint comment_has_content check (coalesce(btrim(text), '') <> '' or gif_data_url is not null)
);

alter table public.post_comments enable row level security;

create policy "read comments on visible posts" on public.post_comments for select
  to authenticated
  using (public.can_see_post(post_id));

create policy "comment as yourself on visible posts" on public.post_comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.can_see_post(post_id));

create policy "author deletes own comment" on public.post_comments for delete
  to authenticated
  using (author_id = auth.uid());
