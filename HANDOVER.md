# KotStart Handover

Date: 2026-05-23

## Current Status

KotStart is deployed on Railway, connected to Supabase, and pushed to GitHub.

- Production URL: `https://kotstart.up.railway.app`
- GitHub remote: `https://github.com/cloudcast-analytics/KotStart.git`
- Branch: `master`
- Latest pushed commit at handover time: `03e84ee fix: simplify login and correct Cloudcast email domain`
- Supabase project ref: `tsieqsxzjrfnevcrbswg`
- Supabase URL: `https://tsieqsxzjrfnevcrbswg.supabase.co`

The app now uses Supabase in production (`VITE_DEMO_MODE=false`). Tests use mock data even when `.env.local` contains Supabase values.

## Local Project

- Path: `/Users/arryawillems/Desktop/Projects/StudentOnboarding`
- Framework: React + Vite + TypeScript + Tailwind
- Node requirement: Node 20+
- Local shell may default to Node 18. Use `nvm use 20` before production builds.

Useful commands:

```bash
nvm use 20
npm run lint
npm run test:run
npm run build
```

## Implemented Features

- Email/password authentication through Supabase Auth.
- Google login is intentionally hidden for now because Google OAuth is not configured.
- Dashboard with property/year filters.
- Contract wizard for new contracts.
- Contract renewal flow.
- Contract detail with PDF/print and signature/email action.
- Inspection wizard with photos and PDF preview.
- Properties page exists but is currently disabled in the UI.
- Supabase data layer with mock fallback only for demo/test mode.
- Supabase Storage upload support with private storage references and signed URL reads.
- Supabase Edge Function `send-contract-email` sends through Resend.
- Route-level lazy loading for smaller production chunks.

## Important Files

- `src/lib/supabase.ts`: Supabase config guard. Production uses Supabase when `VITE_DEMO_MODE=false`; tests force mock data.
- `src/contexts/AuthProvider.tsx`: Supabase auth provider.
- `src/pages/LoginPage.tsx`: email/password login/register UI. Google button removed.
- `src/lib/data.ts`: data access, upload helpers, signed storage URL resolution.
- `src/lib/pdfDocuments.ts`: browser print/PDF documents.
- `supabase/functions/send-contract-email/index.ts`: Resend email function.
- `supabase/migrations/20260521000000_initial.sql`: initial database schema.
- `supabase/migrations/20260523000000_security_hardening.sql`: RLS/storage hardening.
- `supabase/migrations/20260523001000_bootstrap_user_property.sql`: creates default property/rooms for new users.

## Railway

Railway is linked locally.

- Project: `proud-success`
- Service: `KotStart`
- Environment: `production`
- Public URL: `https://kotstart.up.railway.app`
- Railway account used by CLI: `info@cloudcastanalytics.com`

Railway variables currently expected:

```env
VITE_DEMO_MODE=false
VITE_SUPABASE_URL=https://tsieqsxzjrfnevcrbswg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
RESEND_FROM_NAME=Cloudcast Analytics
RESEND_FROM_EMAIL=info@cloudcastanalytics.com
```

Redeploy command:

```bash
railway up --detach
railway status
```

## Supabase

Supabase CLI was linked and migrations/functions were deployed manually by the user.

Completed:

```bash
npx supabase link --project-ref tsieqsxzjrfnevcrbswg
npx supabase db push
npx supabase functions deploy send-contract-email
```

Auth settings observed through `/auth/v1/settings`:

- `email: true`
- `disable_signup: false`
- `mailer_autoconfirm: true`
- Google provider: false

Direct signup against Supabase succeeded after email autoconfirm was enabled. If the browser still shows connection errors, suspect stale PWA/service-worker cache first.

Recommended user-side browser reset:

- Hard refresh: `Cmd + Shift + R`
- Or test in incognito/private window

## Resend / Email

Current intended sender:

```txt
Cloudcast Analytics <info@cloudcastanalytics.com>
```

Important: the correct Cloudcast mail domain is `cloudcastanalytics.com` without a hyphen. `cloudcast-analytics.com` has no MX record and Supabase rejected addresses on that domain as invalid.

Supabase secrets expected:

```bash
npx supabase secrets set RESEND_API_KEY=...
npx supabase secrets set RESEND_FROM_NAME="Cloudcast Analytics"
npx supabase secrets set RESEND_FROM_EMAIL=info@cloudcastanalytics.com
npx supabase secrets set ALLOWED_ORIGIN=https://kotstart.up.railway.app
npx supabase functions deploy send-contract-email
```

Resend may still require domain verification for `cloudcastanalytics.com` before production email delivery works reliably.

## Known Issues / Current Debug Context

- Supabase registration previously returned `over_email_send_rate_limit`; this was the built-in Supabase auth mailer limit, not a general app request limit.
- Email autoconfirm is now enabled, so registration no longer needs Supabase to send confirmation email.
- If login fails for an account created during earlier failures, the account may not exist. Register again with a valid email.
- Use a normal email address such as Gmail or `...@cloudcastanalytics.com`; do not use `...@cloudcast-analytics.com`.
- Google login is disabled in UI until a Google Cloud OAuth app is configured.
- A Supabase access token was pasted in chat earlier; it should be revoked in Supabase account settings if not already done.

## Verification

Latest successful local checks after login/domain fixes:

```bash
npm run lint
npm run test:run
nvm use 20 && npm run build
```

Results:

- 21 test files passed
- 88 tests passed
- Production build passed

## Next Steps

1. In Supabase, confirm the pasted access token has been revoked.
2. Confirm `RESEND_FROM_EMAIL` secret is set to `info@cloudcastanalytics.com`, then redeploy the Edge Function.
3. Verify Resend domain setup for `cloudcastanalytics.com`.
4. Test registration in incognito on `https://kotstart.up.railway.app`.
5. If registration works but dashboard is empty, confirm the bootstrap migration trigger exists and inspect the new user's `properties` rows.
6. Later: configure Google OAuth under a Cloudcast-controlled Google account or leave email/password only.
