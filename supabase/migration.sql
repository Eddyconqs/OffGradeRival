-- Grade Arena — multi-user backend migration
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to run on a fresh project; not written to be re-run on top of itself.
-- (Internal domain/table names still say "graderival" in a few places —
-- that's the real infrastructure hostname, not the brand, and renaming it
-- would break existing accounts' login emails. See lib/auth.js.)

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles — one row per account, auto-created at signup.
-- Grades are private by default: full_name is always readable (needed to
-- search for someone to send a friend request), but gpa/xp are only
-- visible on your own row, or on a friend's row once THEY'VE opted in via
-- share_gpa. Other code must query the public_profiles view below to look
-- up anyone but themselves — this base table's RLS is owner-only.
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  xp int not null default 0,
  gpa numeric not null default 0,
  share_gpa boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can read their own full profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only xp/gpa/share_gpa are writable by the client — full_name is the
-- login identifier (derived into the synthetic email in lib/auth.js) and
-- must not drift from what was set at signup.
revoke update on public.profiles from authenticated;
grant update (xp, gpa, share_gpa) on public.profiles to authenticated;

-- public_profiles view is created further down, once the friendships
-- table it depends on exists (see "public directory view" section).

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Scholar'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- classes / categories / assignments — private, owner-only
-- ============================================================

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  credits int not null default 3,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  weight numeric not null default 0
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  score numeric not null,
  max numeric not null,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;
alter table public.categories enable row level security;
alter table public.assignments enable row level security;

create policy "own classes only" on public.classes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own categories only" on public.categories for all
  to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.user_id = auth.uid()));

create policy "own assignments only" on public.assignments for all
  to authenticated
  using (exists (
    select 1 from public.categories cat
    join public.classes c on c.id = cat.class_id
    where cat.id = category_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.categories cat
    join public.classes c on c.id = cat.class_id
    where cat.id = category_id and c.user_id = auth.uid()
  ));

-- ============================================================
-- activity — per-user XP log
-- ============================================================

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.activity enable row level security;

create policy "own activity only" on public.activity for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Atomic XP grant: bumps xp and logs the activity row in one transaction,
-- so concurrent grants (e.g. two tabs) can't clobber each other the way a
-- client-side read-modify-write update could.
create function public.grant_xp(amount int, reason text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  new_xp int;
begin
  update public.profiles set xp = xp + amount where id = auth.uid() returning xp into new_xp;
  insert into public.activity (user_id, amount, reason) values (auth.uid(), amount, reason);
  return new_xp;
end;
$$;

-- ============================================================
-- friendships — real connections between real accounts
-- ============================================================

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id),
  constraint unique_pair unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "see your own friendships" on public.friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "send a friend request" on public.friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "addressee can accept" on public.friendships for update
  to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create policy "either side can remove" on public.friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ============================================================
-- public directory view — the only sanctioned way to look up anyone
-- but yourself. Runs as the view owner (bypasses profiles' owner-only
-- RLS) so it can see every row internally, then decides per-column what
-- the calling user is actually allowed to see: full_name is always
-- visible (needed to find someone to send a friend request to before any
-- friendship exists); gpa/xp are only visible on your own row, or on a
-- friend's row once THEY'VE turned share_gpa on.
-- ============================================================

create view public.public_profiles as
select
  p.id,
  p.full_name,
  case
    when p.id = auth.uid() then p.xp
    when p.share_gpa and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p.id)
          or (f.addressee_id = auth.uid() and f.requester_id = p.id))
    ) then p.xp
    else null
  end as xp,
  case
    when p.id = auth.uid() then p.gpa
    when p.share_gpa and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = p.id)
          or (f.addressee_id = auth.uid() and f.requester_id = p.id))
    ) then p.gpa
    else null
  end as gpa,
  p.share_gpa
from public.profiles p;

grant select on public.public_profiles to authenticated;

-- ============================================================
-- groups — real shared spaces
-- ============================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create function public.is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members can see their group" on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "captain can rename or delete" on public.groups for update
  to authenticated
  using (captain_id = auth.uid())
  with check (captain_id = auth.uid());

create policy "captain can delete group" on public.groups for delete
  to authenticated
  using (captain_id = auth.uid());

-- Groups are created via create_group() below, not a direct insert, so no
-- INSERT policy is needed on this table for normal client use.

create policy "members can see group roster" on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "captain adds an accepted friend" on public.group_members for insert
  to authenticated
  with check (
    exists (select 1 from public.groups g where g.id = group_id and g.captain_id = auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = user_id))
    )
  );
create policy "captain removes anyone, member removes self" on public.group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.captain_id = auth.uid())
  );

-- Atomic create: insert the group and the creator's own membership in one
-- call, so there's never a moment where the group exists with zero members
-- (which the SELECT/INSERT policies above would otherwise deadlock on).
create function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  new_group public.groups;
begin
  insert into public.groups (name, captain_id) values (group_name, auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id) values (new_group.id, auth.uid());

  return new_group;
end;
$$;

-- Only the current captain can hand the role to another member — no
-- "reclaim" override; this is a real permission now, not a local safety
-- valve.
create function public.transfer_captain(gid uuid, new_captain_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.groups where id = gid and captain_id = auth.uid()) then
    raise exception 'only the current captain can transfer captaincy';
  end if;
  if not exists (select 1 from public.group_members where group_id = gid and user_id = new_captain_id) then
    raise exception 'new captain must already be a member of the group';
  end if;
  update public.groups set captain_id = new_captain_id where id = gid;
end;
$$;

-- ============================================================
-- group notes / reminders / files — shared within the group
-- ============================================================

create table public.group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.group_reminders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  due date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- One files table for both personal uploads (group_id null, owner-only) and
-- group-shared uploads (group_id set, visible to every member) — mirrors
-- the single "files" array the local-only version already used, just with
-- an optional group_id tag instead of an in-memory filter.
create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  name text not null,
  size bigint not null,
  type text,
  data_url text,
  note text,
  created_at timestamptz not null default now()
);

alter table public.group_notes enable row level security;
alter table public.group_reminders enable row level security;
alter table public.files enable row level security;

create policy "read personal or group files" on public.files for select
  to authenticated
  using (
    (group_id is null and owner_id = auth.uid())
    or (group_id is not null and public.is_group_member(group_id))
  );

create policy "upload personal or group files" on public.files for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and (group_id is null or public.is_group_member(group_id))
  );

create policy "owner or captain deletes file" on public.files for delete
  to authenticated
  using (
    owner_id = auth.uid()
    or (group_id is not null and exists (
      select 1 from public.groups g where g.id = group_id and g.captain_id = auth.uid()
    ))
  );

create policy "members read notes" on public.group_notes for select
  to authenticated using (public.is_group_member(group_id));
create policy "members post notes" on public.group_notes for insert
  to authenticated with check (public.is_group_member(group_id) and author_id = auth.uid());
create policy "author or captain deletes note" on public.group_notes for delete
  to authenticated using (
    author_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.captain_id = auth.uid())
  );

create policy "members read reminders" on public.group_reminders for select
  to authenticated using (public.is_group_member(group_id));
create policy "members add reminders" on public.group_reminders for insert
  to authenticated with check (public.is_group_member(group_id) and author_id = auth.uid());
create policy "members toggle reminders" on public.group_reminders for update
  to authenticated using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
create policy "author or captain deletes reminder" on public.group_reminders for delete
  to authenticated using (
    author_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.captain_id = auth.uid())
  );

-- ============================================================
-- lock down RPC functions to signed-in users only
-- ============================================================
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so an
-- unauthenticated (anon) caller could invoke these today. They currently
-- fail harmlessly for anon (auth.uid() is null, which trips a NOT NULL
-- constraint before anything is written), but that's incidental — make it
-- explicit instead of relying on that.

revoke execute on function public.grant_xp(int, text) from public, anon;
grant execute on function public.grant_xp(int, text) to authenticated;

revoke execute on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

revoke execute on function public.transfer_captain(uuid, uuid) from public, anon;
grant execute on function public.transfer_captain(uuid, uuid) to authenticated;