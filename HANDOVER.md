# KotStart Handover

Date: 2026-05-24

## Current Status

KotStart is deployed on Railway, connected to Supabase, and pushed to GitHub.

- Production URL: `https://kotstart.up.railway.app`
- GitHub remote: `https://github.com/cloudcast-analytics/KotStart.git`
- Branch: `master`
- Latest commit: `cd9306e fix: remove stale signature guard on send, fix status message colors`
- Supabase project ref: `tsieqsxzjrfnevcrbswg`
- Supabase URL: `https://tsieqsxzjrfnevcrbswg.supabase.co`

The app uses Supabase in production. Tests run on mock data regardless of env vars.

## What Was Built (May 24 2026 — Contract Flow Redesign)

The contract flow was redesigned to enforce the legally correct order required by the Vlaams Woninghuurdecreet:

**Before:** Wizard ended with "Contract versturen" — sending the email without a start inspection or landlord signature.

**After:** Wizard ends with "Opslaan als concept". The contract detail page shows a 4-step voortgangschecklist:

1. Contract aangemaakt (always done)
2. Startplaatsbeschrijving → navigates to inspection wizard (always available)
3. Handtekening verhuurder → opens signature canvas (only after step 2)
4. Versturen naar student → sends the email (only after step 3)

Each step is gated on the previous one. The `contract.status` progression is now `draft → signed → sent`.

## Local Project

- Path: `/Users/arryawillems/Desktop/Projects/StudentOnboarding`
- Framework: React 18 + Vite + TypeScript + Tailwind CSS
- Node requirement: Node 20+
- Local shell may default to Node 18 — use `nvm use 20` before production builds.

```bash
nvm use 20
npm run lint
npm run test:run    # 22 files, 104 tests
npm run build
```

## Implemented Features

- Email/password authentication via Supabase Auth.
- Dashboard with property/year filters.
- Contract wizard (4 steps: kamer → student → tweede partij → overzicht).
- After saving, navigates directly to the new contract's detail page.
- 4-step voortgangschecklist on contract detail page (create → inspect → sign → send).
- Signature capture via canvas (stored in-session as data URL; included in PDF).
- Contract renewal flow.
- Inspection wizard (start + einde) with photos and PDF preview.
- Properties page with room management.
- PDF generation for contracts and inspections (browser print).
- Supabase data layer with mock fallback for demo/test mode.
- Supabase Storage for student photos and inspection photos (private buckets, signed URLs).
- Supabase Edge Function `send-contract-email` via Resend.

## Important Files

- `src/lib/data.ts` — all data access; `createContractDraft` returns contract ID, `updateContractStatus` updates `draft → signed → sent`
- `src/pages/ContractDetailPage.tsx` — voortgangschecklist, split sign/send flow
- `src/pages/ContractNewPage.tsx` — wizard entry; navigates to `/contracts/:id` after save
- `src/pages/wizard/WizardLayout.tsx` — last step button is "Opslaan als concept"
- `src/lib/pdfDocuments.ts` — HTML contract generation (Art. 1–19 + Bijlage A)
- `src/components/SignatureModal.tsx` — canvas signature capture
- `supabase/functions/send-contract-email/index.ts` — Resend email function
- `supabase/migrations/20260521000000_initial.sql` — full DB schema
- `supabase/migrations/20260523000000_security_hardening.sql` — RLS + private storage
- `supabase/migrations/20260523001000_bootstrap_user_property.sql` — default property for new users

## Railway

- Project: `proud-success`, Service: `KotStart`, Environment: `production`
- Public URL: `https://kotstart.up.railway.app`
- CLI account: `info@cloudcastanalytics.com`

Railway env vars required:

```env
VITE_SUPABASE_URL=https://tsieqsxzjrfnevcrbswg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
RESEND_FROM_NAME=Cloudcast Analytics
RESEND_FROM_EMAIL=info@cloudcastanalytics.com
```

Redeploy:

```bash
railway up --detach
railway status
```

## Supabase

```bash
npx supabase link --project-ref tsieqsxzjrfnevcrbswg
npx supabase db push
npx supabase functions deploy send-contract-email
```

Auth settings: email/password enabled, autoconfirm on, Google provider off.

Supabase secrets needed for the Edge Function:

```bash
npx supabase secrets set RESEND_API_KEY=...
npx supabase secrets set RESEND_FROM_NAME="Cloudcast Analytics"
npx supabase secrets set RESEND_FROM_EMAIL=info@cloudcastanalytics.com
npx supabase secrets set ALLOWED_ORIGIN=https://kotstart.up.railway.app
npx supabase functions deploy send-contract-email
```

## Resend / Email

Sender: `Cloudcast Analytics <info@cloudcastanalytics.com>`

DNS records at one.com for `cloudcastanalytics.com`:
- SPF: `v=spf1 include:amazonses.com ~all` (TXT at `@`)
- DKIM: set at `resend._domainkey` (TXT, long `p=MIGfMA0...` value from Resend dashboard)
- MX: `feedback-smtp.eu-west-1.amazonses.com` priority 10

Status as of 2026-05-24: SPF + MX verified in Resend; DKIM was added and is pending propagation (can take up to 48h at one.com).

## Known Limitations

- **Landlord signature is session-only.** After signing (status → `signed`), the signature image lives only in React state. If the page reloads before sending, the PDF will be sent without an embedded signature image. The contract status in Supabase remains `signed`, and sending still works — but the PDF won't contain the signature image. Fix for a future session: persist the signature to Supabase Storage.
- Google login is disabled in the UI until Google OAuth is configured in a Google Cloud project.
- Properties page shows rooms but full property creation UI is not complete.

## Next Steps

1. Verify DKIM propagation in Resend dashboard (check after 24–48h).
2. Test full flow end-to-end in production: create contract → start inspection → sign → send email → student receives PDF.
3. Future: persist landlord signature to Supabase Storage so re-sending after reload includes the signature image.
4. Future: configure Google OAuth if needed.
