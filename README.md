# GradeRival

Compete with friends for the highest GPA. Track weighted grades, run
what-if projections, trade study files, and level up.

## Stack

- Next.js 14 (App Router), plain CSS. Real multi-user backend on
  Supabase: accounts (full name + password, no email), classes/grades,
  friend connections, and shared study groups (files, notes, reminders)
  all live in Postgres under the signed-in account, with row-level
  security scoping each user to their own data and each group to its
  members. Only the light/dark theme preference stays in this browser's
  `localStorage` — a per-device UI choice, not app data.

## Local development

```bash
cp .env.local.example .env.local   # fill in your Supabase project's URL + anon key
npm install
npm run dev
```

Before first run, apply `supabase/migration.sql` once in your project's
SQL Editor (Supabase dashboard → SQL Editor → New query → paste → Run) —
it creates every table, RLS policy, and helper function the app needs.

Without a Supabase project connected, the app shows a "backend not
connected" screen instead of the sign-up/log-in form. In the Supabase
dashboard, under Authentication → Providers → Email:
- **Enable Email provider** must be **on**.
- **Confirm email** must be **off** — accounts sign up with a synthetic
  `@graderival.vercel.app` address behind the scenes (users never see
  it, and nothing is ever actually delivered there), which can't
  receive a real confirmation email.

## Deploy

Already deployed at https://graderival.vercel.app (Vercel project
`graderival`). Pushing to `main` will trigger a new deployment once
this repo is connected to that Vercel project via Git (Project
Settings → Git in the Vercel dashboard). On Vercel, set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
Project → Environment Variables (same values as `.env.local`) so the
deployed build can reach the backend.

## Next steps

- Real file storage (S3/Supabase Storage) instead of base64 payloads in
  Postgres — fine for small study-guide PDFs, not ideal at scale.
- Live updates: group content currently syncs on load/action (refetch),
  not instantly via Supabase Realtime — a member won't see a teammate's
  new note until they revisit the group.
- Friends/groups were rebuilt to run on real accounts instead of
  `localStorage` — anything created during earlier local-only testing
  (seeded demo classes, browser-only friends/groups) wasn't migrated and
  no longer appears; new accounts get fresh seeded classes instead.
