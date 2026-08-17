-- Grade Arena — Study Hub addendum: flashcard decks + daily streak bonus
-- Run this once in the Supabase SQL Editor against a project that already
-- has migration.sql applied.

-- ============================================================
-- flashcard decks — private, owner-only, mirrors classes/categories
-- ============================================================

create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  created_at timestamptz not null default now
);

alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;

create policy "own decks only" on public.flashcard_decks for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own flashcards only" on public.flashcards for all
  to authenticated
  using (exists (select 1 from public.flashcard_decks d where d.id = deck_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.flashcard_decks d where d.id = deck_id and d.user_id = auth.uid()));

-- ============================================================
-- daily streak — a Duolingo-style "claim once a day" counter,
-- resolved server-side (not trusted from the client) so it can't be
-- claimed twice by racing requests or a stale clock.
-- ============================================================

alter table public.profiles add column streak_count int not null default 0;
alter table public.profiles add column streak_last_claim date;

create function public.claim_streak_bonus()
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  prev_date date;
  prev_streak int;
  new_streak int;
  bonus int;
  new_xp int;
begin
  select streak_last_claim, streak_count into prev_date, prev_streak
    from public.profiles where id = auth.uid();

  if prev_date = current_date then
    raise exception 'streak already claimed today';
  end if;

  if prev_date = current_date - 1 then
    new_streak := prev_streak + 1;
  else
    new_streak := 1;
  end if;

  bonus := 5 + least(new_streak, 7);

  update public.profiles
    set streak_count = new_streak, streak_last_claim = current_date, xp = xp + bonus
    where id = auth.uid()
    returning xp into new_xp;

  insert into public.activity (user_id, amount, reason)
    values (auth.uid(), bonus, 'Day ' || new_streak || ' streak bonus');

  return json_build_object('streak', new_streak, 'bonus', bonus, 'xp', new_xp);
end;
$$;

revoke execute on function public.claim_streak_bonus() from public, anon;
grant execute on function public.claim_streak_bonus() to authenticated;
