-- Grade Arena — privacy-by-default addendum
-- Run this once in the Supabase SQL Editor against the project that
-- already has migration.sql applied. Makes GPA private unless a student
-- opts in to share it with their accepted friends.

alter table public.profiles add column share_gpa boolean not null default false;

drop policy "profiles are readable by any signed-in user" on public.profiles;

create policy "users can read their own full profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (xp, gpa, share_gpa) on public.profiles to authenticated;

-- The only sanctioned way to look up anyone but yourself: full_name is
-- always visible (needed to find someone to send a friend request to),
-- gpa/xp are only visible on your own row, or on a friend's row once
-- THEY'VE turned share_gpa on.
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
