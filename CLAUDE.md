# CLAUDE.md

## Project Overview

**KotStart** is a mobile-ready PWA for Belgian student landlords. It digitizes three workflows: creating rental contracts, recording move-in/move-out inspections (plaatsbeschrijving), and managing properties and rooms.

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (optional — app falls back to mock data when env vars are absent)
- **Hosting**: Railway via a custom Node.js static server (`server.js`)
- **PWA**: `vite-plugin-pwa` with auto-update, installable on mobile
- **Node requirement**: Node 20+ (Node 18 breaks the PWA build step)
- **GitHub**: `https://github.com/cloudcast-analytics/KotStart.git` (branch: `master`)

---

## File Map

```
src/
  App.tsx                    # Route table (React Router v7)
  main.tsx                   # App entry point, BrowserRouter, global CSS
  index.css                  # Tailwind base + global styles
  types/index.ts             # All shared TypeScript interfaces
  lib/
    supabase.ts              # Supabase client; exports `isSupabaseConfigured`
    data.ts                  # All data access functions (mock ↔ Supabase switch)
    mockData.ts              # In-memory mock datasets
    pdfDocuments.ts          # generateContractHtml(ContractBundle) + printContractDocument/printInspectionDocument
    cn.ts                    # clsx utility for conditional class names
  contexts/
    AuthContext.tsx          # React context + useAuth() hook definition (user, signIn, signUp, signInWithGoogle, signOut, updateEmail, updatePassword, resetPassword)
    AuthProvider.tsx         # Implements AuthContext against Supabase Auth; DEMO_USER auto-login when Supabase absent
  components/layout/
    AppShell.tsx             # Wraps every logged-in page: Drawer + TopBar + content area
    Sidebar.tsx              # Desktop nav sidebar (Overzicht/Panden/Account/Instellingen)
    TopBar.tsx               # Mobile top bar with hamburger + school year/property FilterDropdowns
    Drawer.tsx               # Mobile slide-out nav drawer
  components/ui/
    FilterDropdown.tsx       # Generic dropdown with optional extra action (e.g. "+ volgend schooljaar"); replaces the old Chip.tsx
  components/
    ProtectedRoute.tsx       # Redirects to /login when user is null; shows spinner while loading
    SignatureModal.tsx        # Canvas handtekeningpad (signature_pad); returns landlord + student/guardian data URLs via onConfirm
    InstitutionSelect.tsx    # Searchable dropdown of Flemish institutions with "Andere…" free-text fallback
  pages/
    DashboardPage.tsx        # Student list filtered by property + school year; context-sensitive inspection button (own wizard vs. delegation vs. review)
    ContractNewPage.tsx      # Entry point for the 3-step contract wizard (Kamer/Student/Overzicht)
    ContractDetailPage.tsx   # Voortgangschecklist (contract created → concept sent → signed → sent), Inspectiepaspoort
    ContractRenewPage.tsx    # Contract renewal flow, with rent indexation preview
    InspectionDetailPage.tsx # Full inspection report: items by category, condition chips, PDF print
    InspectionNewPage.tsx    # Multi-category inspection wizard with photo upload (landlord doing it themselves)
    InspectionDelegatePage.tsx # Generates/sends a plaatsbeschrijving delegation link (inspection_tokens) to the student
    InspectionReviewPage.tsx # Landlord reviews/approves/rejects a student-submitted delegated inspection
    InspectionStudentPage.tsx # Public token-based page (no login) where a student fills in the plaatsbeschrijving themselves
    PropertiesPage.tsx       # Property cards → room list with occupancy status
    AccountPage.tsx          # Verhuurdersprofiel (name, RR-nr, IBAN, insurance, EPC) + email/password change + sign out
    SettingsPage.tsx         # Per-property settings: inspection template editor, delegation mode, rent indexation toggle
    LoginPage.tsx            # Login / registration / forgot-password (three modes in one page), incl. Google OAuth
    ResetPasswordPage.tsx    # Landing page from the password-reset email; sets a new password
  pages/wizard/
    WizardLayout.tsx         # Shared wizard chrome (progress bar, next/back buttons, swipe navigation)
    StepIndicator.tsx        # Step dots/labels at top of wizard
    Step1Room.tsx            # Step 1: pick a free room for the property/school year
    Step2Student.tsx         # Step 2: full student form(s) — identity, institution (InstitutionSelect), residence address, guardian fields when isMinor(); renders two stacked forms for a double room
    Step4Review.tsx          # Step 3 in the UI ("Overzicht"): review summary → save/submit
    types.ts                 # Wizard-internal form state types
  pages/components/
    ActionBar.tsx            # Sticky bottom action bar (used in detail pages)
    EmptyState.tsx           # Empty list placeholder component
    StudentRow.tsx           # Single row in the dashboard student list
  __tests__/                 # Vitest + Testing Library tests (30 files)
supabase/
  migrations/
    20260521000000_initial.sql  # Full DB schema + Storage bucket policies
server.js                    # Custom Node.js static server for Railway (SPA fallback)
vite.config.ts               # Vite + React + PWA plugin config
railway.toml                 # Railway build/start config
Dockerfile                   # Alternative Docker build (not primary deploy path)
HANDOVER.md                  # Detailed handover notes: Railway, GitHub, Supabase status
```

---

## Domain Model

All types live in `src/types/index.ts`.

| Type | Key fields | Notes |
|------|-----------|-------|
| `Property` | id, owner_id, name, street/number/postalCode/city, inspectionDelegation?, indexationEnabled? | A building with multiple rooms; owner_id references auth.users. `inspectionDelegation`: `'together' \| 'delegate'` |
| `Room` | propertyId, roomNumber, roomType, monthlyRent, studentTax, fixedCosts, deposit, baseRent?, baseRentYear? | roomType: `studio \| single \| double`. `baseRent`/`baseRentYear` anchor rent indexation |
| `Student` | owner_id, firstName, lastName, email, phone, dateOfBirth, photoUrl?, institution?, faculty?, studentNumber?, residenceStreet/Number/Box/PostalCode/City?, guardianName/Email/Phone? | Photo stored in Supabase Storage. Guardian fields are required by the wizard when `isMinor(dateOfBirth)` |
| `LandlordProfile` | firstName, lastName, street, number, postalCode, city, phone, email, ibanCountry (`BE\|NL`), iban | Stored via Supabase RPC (`get_landlord_profile`/`save_landlord_profile`) when configured, else localStorage. Editable via `/account` |
| `Contract` | roomId, schoolYear, studentId, secondStudentId?, status, signedAt?, sentAt?, conceptSentAt?, monthlyRent?, fixedCosts?, studentTax? | status: `draft \| signed \| sent` (order matters). Per-contract rent fields let a renewal snapshot an indexed rent independent of the room |
| `Inspection` | contractId, type, overviewPhotoUrls | type: `start \| end` |
| `InspectionItem` | inspectionId, category, itemName, condition, keyCount?, meterValue?, meterUnit? (`kWh\|m³`), photoUrl?, notes? | condition: `good \| moderate \| bad \| unusable \| null` |
| `InspectionTemplateCategory` | id, label, items[] (name, type: `condition\|count\|meter`, unit?) | Per-property customizable inspection checklist, edited on `/settings` |
| `InspectionToken` | id, token, contractId, propertyId, status, expiresAt, landlordItems, studentItems, studentPhotoUrls, submittedAt?, reviewedAt? | Backs the plaatsbeschrijving-delegation flow (`inspection_tokens` table); status: `pending \| submitted \| approved \| rejected` |
| `StudentDashboardRow` | studentId, firstName, lastName, roomNumber, contractId, secondFirstName?/secondLastName?, startInspectionDone?, inspectionTokenStatus?, renewDone?, endInspectionDone? | Computed join for dashboard display |

---

## Data Layer (`src/lib/data.ts`)

Single point of contact between pages and persistence. Switches between mock data and Supabase based on `isSupabaseConfigured` (evaluated at module load from env vars).

**Read functions** (all return typed domain objects):
- `getProperties()`, `getRooms()`, `getStudents()`, `getContracts()`, `getSchoolYears()` (contract years merged with a per-owner `school_years` table)
- `getDashboardRowsData(propertyId, schoolYear)` — joins rooms + contracts + students + inspection flags + delegation-token status into `StudentDashboardRow[]`
- `getAvailableRoomsForNewContract` / `getAvailableRoomsForRenewal` — free rooms for a property/school year (capacity-aware: `studio`/`single` = 1, `double` = 2)
- `getContractBundleData(contractId)` — returns `{ contract, room, student, secondStudent?, property, startInspection?, startInspectionItems?, endInspection?, endInspectionItems?, landlord }` or `null`
- `getLandlordProfile()` — Supabase RPC `get_landlord_profile` when configured, else localStorage (falls back to `MOCK_LANDLORD_PROFILE`); `isLandlordProfileComplete(profile)` gates contract creation
- `getInspectionCategories(propertyId)` / `getPropertyDelegation(propertyId)` / `getPropertyIndexation(propertyId)` — per-property settings, each with a Supabase-configured/mock fallback
- `getHealthIndex(year, month)` / `getLatestHealthIndex()` / `calculateIndexedRent(...)` — rent indexation lookups against the `health_index` table (pure math lives in `src/lib/indexation.ts`)

**Write functions** (no-ops when Supabase is not configured):
- `createContractDraft(input)` — inserts student(s) + contract (status `draft`), uploads student photos; returns contract ID or `null` in demo mode
- `createContractRenewal(input)` / `updateStudentData(studentId, updates)` — renewal flow, with optional room price update
- `updateContractStatus(contractId, status)` — updates status + stamps `signed_at`/`sent_at`; `saveConceptSentAt` stamps `concept_sent_at`
- `deleteContractBundleData(contractId)` — cascade-deletes inspection items → inspections → contract → student(s)
- `saveInspectionData(input)` — inserts inspection + items, uploads inspection photos (landlord doing the inspection directly)
- `createInspectionToken` / `getInspectionTokenForContract` / `approveInspectionToken` / `rejectInspectionToken` / `sendInspectionDelegationEmail` — the delegation flow: generate a token+link for the student, review their submission, approve (writes the real inspection) or reject (issues a fresh token)
- `savePropertyDelegation(propertyId, mode)` / `savePropertyIndexation(propertyId, enabled)` / `saveInspectionCategories(propertyId, categories)` — per-property settings writes
- `updateRoomData(room)` — updates a room record
- `saveLandlordProfile(profile)` — Supabase RPC `save_landlord_profile` when configured, else localStorage
- `sendContractEmail(to, name, html, pdfBase64?, isConcept?)` — calls Supabase Edge Function `send-contract-email` (no-op in demo mode)

**Photo uploads**: `uploadDataUrl(bucket, folder, dataUrl)` converts a base64 data URL to a Blob and uploads to Supabase Storage, storing a `storage://bucket/path` reference; `resolveStorageUrl`/`resolveStorageUrls` turn those back into signed URLs (60 min) on read. Student photos → `student-photos` bucket; inspection photos → `inspection-photos` bucket.

**Mock data**: `src/lib/mockData.ts` exports `PROPERTIES`, `ROOMS`, `STUDENTS`, `CONTRACTS`, `MOCK_INSPECTIONS`, `MOCK_INSPECTION_ITEMS`, `MOCK_LANDLORD_PROFILE`, `MOCK_HEALTH_INDEX`, `DEFAULT_INSPECTION_CATEGORIES`, `SCHOOL_YEARS` used when Supabase is absent.

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `LoginPage` | Login / registration / forgot-password, incl. Google OAuth. Public route |
| `/reset-password` | `ResetPasswordPage` | Set a new password from the reset-email link. Public route |
| `/inspection/student/:token` | `InspectionStudentPage` | Public, token-based plaatsbeschrijving form for a delegated student (no login) |
| `/` | `DashboardPage` | Student list; filter by property + school year |
| `/contracts/new` | `ContractNewPage` | 3-step contract creation wizard (Kamer/Student/Overzicht) |
| `/contracts/:id/renew` | `ContractRenewPage` | Contract renewal |
| `/contracts/:id` | `ContractDetailPage` | Contract info + PDF action |
| `/inspections/delegate` | `InspectionDelegatePage` | Generate/send a delegation link so the student fills in the plaatsbeschrijving |
| `/inspections/new` | `InspectionNewPage` | Inspection wizard (landlord doing it themselves; linked from contract detail) |
| `/inspections/review/:contractId` | `InspectionReviewPage` | Landlord reviews and approves/rejects a student-submitted delegated inspection |
| `/inspections/:id` | `InspectionDetailPage` | Inspection detail: items grouped by category + PDF print |
| `/properties` | `PropertiesPage` | Property + room management |
| `/account` | `AccountPage` | Verhuurdersprofiel (naam, RR-nr., IBAN, verzekering, EPC) + e-mail/wachtwoord wijzigen + uitloggen |
| `/settings` | `SettingsPage` | Per pand: plaatsbeschrijvingstemplate, delegatiemodus, huurindexatie |
| `*` | → `/` | Catch-all redirect |

Routes are lazy-loaded (`React.lazy`) and wrapped in `ProtectedRoute` except the three public routes above. Full functional breakdown of every page (features, data reads/writes, cross-page navigation) lives in `APP_STRUCTUUR.md` at the project root — read that instead of the source when you just need to understand what a page does.

---

## Key Patterns

- **AppShell wraps every logged-in page.** Pages do not render their own layout chrome (nav, topbar). Public pages (`LoginPage`, `ResetPasswordPage`, `InspectionStudentPage`) render standalone.
- **Auth**: `AuthProvider` (`src/contexts/AuthProvider.tsx`) implements the `AuthContext`/`useAuth()` contract against Supabase Auth (email/password, Google OAuth, password reset); falls back to a fixed `DEMO_USER` when Supabase isn't configured, so the whole app stays usable in demo mode. `ProtectedRoute` redirects to `/login` when `user` is null.
- **Wizard state is local React state** in `ContractNewPage` and `InspectionNewPage`. Step components receive props + callbacks; no global state manager. The contract wizard is 3 steps (Kamer → Student → Overzicht) — there is no separate "second party" step; a double room just renders two stacked student forms inside Step2Student.
- **Minors get a guardian, not their own signature**: `isMinor(dateOfBirth)` (in `pages/wizard/types.ts`) drives whether the wizard requires `guardianName`/`guardianEmail`/`guardianPhone`, and whether `SignatureModal` labels the signature block for the guardian instead of the student.
- **`cn()` from `src/lib/cn.ts`** is the project-wide utility for conditional Tailwind classes (wraps `clsx`).
- **PDF/print** is triggered browser-side via `pdfDocuments.ts` using `window.print()`. `generateContractHtml(ContractBundle)` produces a full A4 HTML contract (Art. 1–19 + Bijlage A plaatsbeschrijving) conform het Vlaams Woninghuurdecreet. `ContractBundle` = `{ contract, room, property, student, secondStudent?, inspection?, inspectionItems?, landlord?, landlordSignatureDataUrl?, studentSignatureDataUrl? }`. `landlord` defaults to `MOCK_LANDLORD` when absent.
- **Contract flow (legally correct order)**: `ContractDetailPage` shows a voortgangschecklist: (1) Contract aangemaakt, with an optional "Concept sturen" action that emails a draft and stamps `concept_sent_at` before anything is signed, (2) Handtekening verhuurder + student/voogd → opens `SignatureModal`, calls `updateContractStatus('signed')`, (3) Versturen → calls `generateContractHtml` + `sendContractEmail` + `updateContractStatus('sent')`. Startplaatsbeschrijving lives in a separate "Inspectiepaspoort" section on the same page, not in this checklist.
- **Plaatsbeschrijving delegation**: each property has an `inspectionDelegation` mode (`'together'` = landlord does it with the student in `InspectionNewPage`, `'delegate'` = landlord sends the student a tokenized link). `DashboardPage`'s inspection button branches on this mode plus the live `inspection_tokens` status (`pending`/`submitted`) to route to `InspectionNewPage`, `InspectionDelegatePage`, or `InspectionReviewPage`. Tokens expire; rejecting a submission issues a fresh token rather than editing the old one.
- **Rent indexation**: when `properties.indexation_enabled` is on, `ContractNewPage`/`ContractRenewPage` recompute a room's rent from `rooms.base_rent`/`base_rent_year` against the `health_index` table (August value of the base year vs. the target year, via `calculateIndexedRentPure` in `src/lib/indexation.ts`). A contract can snapshot its own `monthlyRent`/`fixedCosts`/`studentTax` independent of the room so historical contracts aren't affected by later indexation.
- **Verhuurder-profiel**: `LandlordProfile` is stored via Supabase RPC (`get_landlord_profile`/`save_landlord_profile`) when configured, else `localStorage` (key `kotstart_landlord_profile`), falling back to `MOCK_LANDLORD_PROFILE`. Editable via `/account`. `isLandlordProfileComplete()` blocks new-contract creation until required fields are filled.
- **Framer Motion** handles page and step transition animations.
- **Known limitation — signature persistence**: The verhuurder's signature (`landlordSignatureDataUrl`) lives only in React state on `ContractDetailPage`. If the page is reloaded after signing but before sending, the email will be sent without the signature image. The contract status in Supabase remains correct (`signed`). Fix (future): save the signature data URL to Supabase Storage immediately after signing and load it back from there.

---

## Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Without these, the app runs entirely on mock data (read-only, no persistence, no photo uploads). Copy `.env.example` to `.env.local` for local development.

---

## Deployment

- **Railway** is the live host. Project: `kotstart-demo`, URL: `https://kotstart.up.railway.app`
- **Build**: `npm run build` (requires Node 20+)
- **Start**: `node server.js` — a custom static file server that binds to `0.0.0.0:$PORT` and serves the `dist/` folder with SPA fallback (all unknown paths → `index.html`)
- **railway.toml** controls build/start commands on Railway
- **Node 20 required**: Node 18 breaks the PWA build plugin. Local Node 20 path: `/opt/homebrew/opt/node@20/bin/node`
- See `HANDOVER.md` for full Railway, GitHub, and Supabase setup status.

---

## Database (Supabase)

Migrations: `supabase/migrations/` — started with `20260521000000_initial.sql` and has grown to 25+ incremental migrations (security hardening, student residence/institution fields, guardian fields, inspection templates, property address split, landlord profiles, contract rent snapshot, school years, concept_sent_at, inspection tokens, health index/indexation, cascade deletes). Apply new ones in order via the Supabase SQL Editor.

Tables: `properties`, `rooms`, `students`, `contracts`, `inspections`, `inspection_items`, `inspection_templates`, `inspection_tokens`, `school_years`, `health_index`, `landlord_profiles`

Storage buckets: `student-photos`, `inspection-photos`

To apply: run new migration SQL in the Supabase SQL Editor (in filename order), then add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Railway env vars.

**Email domain (Resend)**: Currently using `cloudcast-analytics.com` (domain of a separate company, Cloudcast). SPF + MX are verified. DKIM was added at one.com on 2026-05-24 — propagation may take 24–48h, check Resend dashboard for green status. **Before official launch, KotStart needs its own domain** (e.g. `kotstart.be`) with fresh SPF/DKIM/MX records configured in Resend.

---

## Testing

```bash
npm run test:run   # single run (CI)
npm test           # watch mode
```

- **Framework**: Vitest + Testing Library + jest-dom
- **31 test files** in `src/__tests__/`, **226 tests** — all passing
- `src/test-setup.ts` registers jest-dom matchers globally

---

## Development

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

If Node 20 is not globally linked, prefix commands with:
```bash
env PATH=/opt/homebrew/opt/node@20/bin:$PATH npm run build
```
