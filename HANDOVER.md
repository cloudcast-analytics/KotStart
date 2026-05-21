# KotStart Handover

Date: 2026-05-21

## Current Goal

Build a mobile-ready demo of the KotStart student onboarding app, push it to the Cloudcast GitHub account, host it on Railway, and connect Supabase when the client/demo needs real persistence instead of mock data.

## Local Project

- Path: `/Users/arryawillems/Desktop/Projects/StudentOnboarding`
- Framework: React + Vite + TypeScript + Tailwind
- App name in package: `kotbeheer-scaffold`
- Node requirement: Node 20+
- Local Node 20 installed via Homebrew:
  - Binary path: `/opt/homebrew/opt/node@20/bin/node`
  - Version tested: `v20.20.2`
  - It is not globally linked; current shell still defaults to Node `v18.17.0` unless PATH is overridden.

Use this local command prefix when building until Node 20 is globally configured:

```bash
env PATH=/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin npm run build
```

## What Is Built

- Contract wizard:
  - Multi-step room, student, second party, review flow.
  - Mobile file inputs support camera/gallery via `accept="image/*"` and `capture="environment"`.
  - Saves through data layer when Supabase is configured.
- Inspection wizard:
  - Categories: Keuken, Badkamer, Kamer, Inkom, Algemeen, Overzichtsfoto.
  - Condition buttons: Goed, Matig, Slecht, Onbruikbaar.
  - Photo required/available for bad/unusable item states and overview photo.
  - Final PDF preview/print flow.
- Properties page:
  - Shows property cards with room count, occupied count, free count.
  - Inside a property, each room shows occupant name and contract link, or clear `Vrij` status.
  - Only school year filter is shown on this page; residentie filter is hidden there.
- Contract detail:
  - Contract status, room/student/finance info, renewal entrypoint, inspection entrypoint.
  - PDF/print preview button.
- Contract renewal page.
- Supabase data layer:
  - Uses mock data if Supabase env vars are missing.
  - Uses Supabase if configured.
  - Uploads student photos and inspection photos to Storage buckets.

## Important Files

- `src/lib/data.ts`: data access, mock/Supabase switching, Storage upload helpers.
- `src/lib/supabase.ts`: Supabase client and config guard.
- `src/lib/pdfDocuments.ts`: browser print/save-as-PDF documents.
- `src/pages/ContractNewPage.tsx`: contract wizard entry.
- `src/pages/InspectionNewPage.tsx`: inspection wizard.
- `src/pages/PropertiesPage.tsx`: property/room management.
- `src/pages/ContractDetailPage.tsx`: contract detail and PDF action.
- `src/pages/ContractRenewPage.tsx`: renewal flow.
- `supabase/migrations/20260521000000_initial.sql`: database schema + Storage bucket policies.
- `package.json`: added `engines.node >=20` and Railway-compatible `start`.
- `railway.toml`: Railway build/start config.

## Verification Status

These passed locally with Node 20:

```bash
npx tsc --noEmit
npm run test:run
npm run lint
npm run build
```

Latest full test run:

- 18 test files passed
- 76 tests passed

Known warning:

- Vite bundle warning: main JS chunk is >500 kB. Not blocking for demo.

Known old issue:

- With Node 18, `npm run build` fails in PWA tooling with `TypeError: tracingChannel is not a function`.
- Fix is to use Node 20+, which has been validated locally and on Railway build logs.

## Railway Status

Railway CLI installed:

```bash
railway --version
# railway 4.59.0
```

Logged in as:

```text
info@cloudcastanalytics.com
```

Railway project:

- Project name: `kotstart-demo`
- Project ID: `e27e76f3-753d-41db-a8c1-7aec0d2361e0`
- Environment: `production`
- Service name: `kotstart-demo`
- Service ID: `a49af1d6-b8e9-4dea-ad51-e428427fc325`
- Public URL: `https://kotstart-demo-production.up.railway.app`

Current deployment:

- Deployment ID: `01d5b288-a2dc-4731-825e-08639382a97f`
- Build succeeded on Railway.
- Deploy logs show Vite preview starting on port `8080`.
- Healthcheck was still retrying when this handover was written.

Commands to continue checking Railway:

```bash
railway deployment list --json
railway service status --json
railway logs --latest --deployment --lines 120
curl -I https://kotstart-demo-production.up.railway.app
```

If Railway keeps failing healthcheck:

1. Check deploy logs for actual runtime errors.
2. Confirm the app listens on `$PORT`. Current Railway config:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run preview -- --host 0.0.0.0 --port $PORT"
healthcheckPath = "/"
```

3. If needed, change start command to use the npm `start` script:

```toml
[deploy]
startCommand = "npm run start"
healthcheckPath = "/"
```

## GitHub / Cloudcast Status

GitHub CLI exists, but auth is currently invalid:

```text
gh auth status
# token for account arryaetil is invalid
```

There is no git remote configured yet:

```bash
git remote -v
# no output
```

Recommended next steps:

```bash
gh auth login -h github.com
```

Log in with the Cloudcast GitHub account, then create/push the repository:

```bash
gh repo create CloudcastAnalytics/kotstart-demo --private --source=. --remote=origin --push
```

If the organization name differs, run:

```bash
gh repo list --limit 20
gh repo create <org-or-user>/kotstart-demo --private --source=. --remote=origin --push
```

Before pushing, review the dirty worktree:

```bash
git status --short
git diff --stat
```

There are many modified/untracked files from the current build phases. Do not reset them.

## Supabase Status

The app can run without Supabase because `src/lib/data.ts` falls back to mock data. For a demo on Railway this means the app is usable immediately, but edits/uploads will not persist across users/sessions unless Supabase env vars are configured.

Supabase migration exists:

```text
supabase/migrations/20260521000000_initial.sql
```

It creates:

- properties
- rooms
- students
- contracts
- inspections
- inspection_items
- Storage buckets:
  - `student-photos`
  - `inspection-photos`

What to do in Supabase:

1. Create a Supabase project.
2. Run the SQL migration in Supabase SQL Editor, or via Supabase CLI if linked.
3. Seed real initial data for properties/rooms/students/contracts, or add seed SQL.
4. Copy project URL and anon key.
5. Add Railway variables:

```bash
railway variable --set VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
railway variable --set VITE_SUPABASE_ANON_KEY="<anon-key>"
railway redeploy
```

Local `.env` format:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Important security note:

- Current Storage policies are demo-friendly and public-ish.
- Before production/client use, tighten RLS and Storage policies around authenticated users/tenant ownership.

## Open Tasks

1. Confirm Railway deployment reaches healthy status and the public URL returns HTTP 200.
2. Fix Railway config if healthcheck keeps failing.
3. Log in to GitHub as Cloudcast and push this repo.
4. Decide whether this demo uses mock data or a real Supabase project.
5. If using Supabase, run migration, add env vars to Railway, redeploy, and test create/edit/photo flows.
6. Optional: globally configure Node 20:

```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
```

## Notes For Claude

- Do not discard the dirty working tree. The current app work is not committed yet.
- Prefer preserving the existing React/Tailwind patterns.
- The user wants a practical mobile demo they can open on a phone.
- Keep Railway public URL and Cloudcast GitHub push as the immediate delivery path.
- For Supabase, explain clearly that Railway hosting and Supabase persistence are separate steps.
