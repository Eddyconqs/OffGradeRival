# Grade Arena

Compete. Improve. Celebrate. Track weighted grades, run what-if
projections, trade study files, and level up — with grade privacy on
by default, since this is a school-oriented app.

## Stack

- Next.js 14 (App Router), plain CSS. Real multi-user backend on
  Supabase: accounts (full name + password, no email), classes/grades,
  friend connections, and shared study groups (files, notes, reminders)
  all live in Postgres under the signed-in account, with row-level
  security scoping each user to their own data and each group to its
  members. Only the light/dark theme preference stays in this browser's
  `localStorage` — a per-device UI choice, not app data.

## Privacy

Grades are private by default. Nobody — not even an accepted friend —
sees your GPA unless you explicitly turn on "Share my GPA" in Groups.
A student's full name is always searchable (so a friend request can be
sent in the first place), but the number itself stays hidden until the
owner opts in. This is enforced in Postgres (`public_profiles` view in
`supabase/migration.sql`), not just hidden in the UI.

Mutually-agreed competition on a specific test or course grade (propose
→ the other person accepts → only then is that one number visible to
them) is a planned follow-up, not built yet — today's opt-in is an
all-or-nothing "share my overall GPA with friends" toggle.

## Local development

```bash
cp .env.local.example .env.local   # fill in your Supabase project's URL + anon key
npm install
npm run dev
```

Before first run, apply these once in your project's SQL Editor
(Supabase dashboard → SQL Editor → New query → paste → Run), in order:
1. `supabase/migration.sql` — every table, RLS policy, and helper
   function the app needs.
2. `supabase/migration_02_privacy.sql` — adds the private-by-default
   GPA model. (Already folded into `migration.sql` for anyone running
   it fresh; this file is only needed as a delta against a database
   that ran the pre-privacy version of `migration.sql`.)

Without a Supabase project connected, the app shows a "backend not
connected" screen instead of the sign-up/log-in form. In the Supabase
dashboard, under Authentication → Providers → Email:
- **Enable Email provider** must be **on**.
- **Confirm email** must be **off** — accounts sign up with a synthetic
  `@graderival.vercel.app` address behind the scenes (users never see
  it, and nothing is ever actually delivered there), which can't
  receive a real confirmation email.

## Deploy

Deployed at https://graderival.vercel.app (Vercel project `graderival`,
connected via Git to this repo's `main` branch — every push deploys
automatically). `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set as Project → Environment
Variables on Vercel (same values as `.env.local`).

The underlying Vercel project/domain still says "graderival," not
"Grade Arena" — that's real infrastructure existing accounts' login
depends on (see `lib/auth.js`), kept separate from the display brand
on purpose.

## Next steps

- The mutual opt-in "compete on this specific test/course" challenge
  feature described above under Privacy.
- Real file storage (S3/Supabase Storage) instead of base64 payloads in
  Postgres — fine for small study-guide PDFs, not ideal at scale.
- Live updates: group content currently syncs on load/action (refetch),
  not instantly via Supabase Realtime — a member won't see a teammate's
  new note until they revisit the group.
