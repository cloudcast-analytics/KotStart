# CLAUDE.md

## Project Overview

**KotStart** is a mobile-ready PWA for Belgian student landlords. It digitizes three workflows: creating rental contracts, recording move-in/move-out inspections (plaatsbeschrijving), and managing properties and rooms.

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (optional — app falls back to mock data when env vars are absent)
- **Hosting**: Railway via a custom Node.js static server (`server.js`)
- **PWA**: `vite-plugin-pwa` with auto-update, installable on mobile
- **Node requirement**: Node 20+ (Node 18 breaks the PWA build step)

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
    AuthContext.tsx          # Supabase Auth state (user, signIn, signUp, signInWithGoogle, signOut); DEMO_USER auto-login when Supabase absent
  components/layout/
    AppShell.tsx             # Wraps every page: sidebar + topbar + content area
    Sidebar.tsx              # Desktop nav sidebar
    TopBar.tsx               # Mobile top bar
    Drawer.tsx               # Mobile slide-out nav drawer
  components/ui/
    Chip.tsx                 # Status/filter badge component
  components/
    ProtectedRoute.tsx       # Redirects to /login when user is null; shows spinner while loading
    SignatureModal.tsx        # Canvas handtekeningpad (signature_pad); geeft data URL terug via onConfirm
  pages/
    DashboardPage.tsx        # Student list filtered by property + school year
    ContractNewPage.tsx      # Entry point for the 4-step contract wizard
    ContractDetailPage.tsx   # Contract status, room/student/finance info, PDF action
    ContractRenewPage.tsx    # Contract renewal flow
    InspectionNewPage.tsx    # Multi-category inspection wizard with photo upload
    PropertiesPage.tsx       # Property cards → room list with occupancy status
    AccountPage.tsx          # Account info page
    SettingsPage.tsx         # Settings page
  pages/wizard/
    WizardLayout.tsx         # Shared wizard chrome (progress bar, next/back buttons)
    StepIndicator.tsx        # Step dots/labels at top of wizard
    Step1Room.tsx            # Step 1: pick property + room, set school year
    Step2Student.tsx         # Step 2: student details + photo (camera/gallery)
    Step3SecondParty.tsx     # Step 3: optional second student, co-landlord, guardian
    Step4Review.tsx          # Step 4: review summary → save/submit
    types.ts                 # Wizard-internal form state types
  pages/components/
    ActionBar.tsx            # Sticky bottom action bar (used in detail pages)
    EmptyState.tsx           # Empty list placeholder component
    StudentRow.tsx           # Single row in the dashboard student list
    InspectionDetailPage.tsx  # Inspection detail: items by category, condition chips, PDF print
  __tests__/                 # Vitest + Testing Library tests (21 files, 94 tests)
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
| `Property` | id, name, address | A building with multiple rooms |
| `Room` | propertyId, roomNumber, roomType, monthlyRent, studentTax, fixedCosts, deposit | roomType: `studio \| single \| double` |
| `Student` | firstName, lastName, email, phone, dateOfBirth, photoUrl, nationalRegistryNumber?, institution?, studentNumber?, primaryResidence? | Photo stored in Supabase Storage |
| `LandlordProfile` | name, dateOfBirth, nationalRegistryNumber, address, phone, email, iban, bic, bank, insuranceCompany, policyNumber, epcLabel, epcNumber | Stored in localStorage; editable via SettingsPage |
| `Contract` | roomId, schoolYear, studentId, secondStudentId?, status | status: `draft \| sent \| signed` |
| `Inspection` | contractId, type, overviewPhotoUrl | type: `start \| end` |
| `InspectionItem` | inspectionId, category, itemName, condition, photoUrl? | condition: `good \| moderate \| bad \| unusable` |
| `StudentDashboardRow` | studentId, firstName, lastName, roomNumber, contractId | Computed join for dashboard display |

---

## Data Layer (`src/lib/data.ts`)

Single point of contact between pages and persistence. Switches between mock data and Supabase based on `isSupabaseConfigured` (evaluated at module load from env vars).

**Read functions** (all return typed domain objects):
- `getProperties()`, `getRooms()`, `getStudents()`, `getContracts()`
- `getDashboardRowsData(propertyId, schoolYear)` — joins rooms + contracts + students into `StudentDashboardRow[]`
- `getContractBundleData(contractId)` — returns `{ contract, room, student, property, inspection?, inspectionItems?, landlord }` or `null`
- `getLandlordProfile()` — reads `LandlordProfile` from localStorage (falls back to `MOCK_LANDLORD_PROFILE`)

**Write functions** (no-ops when Supabase is not configured):
- `createContractDraft(input)` — inserts student(s) + contract, uploads student photos
- `saveInspectionData(input)` — inserts inspection + items, uploads inspection photos
- `updateRoomData(room)` — updates a room record
- `saveLandlordProfile(profile)` — writes `LandlordProfile` to localStorage
- `sendContractEmail(to, name, html)` — calls Supabase Edge Function `send-contract-email` (no-op in demo mode)

**Photo uploads**: `uploadDataUrl(bucket, folder, dataUrl)` converts a base64 data URL to a Blob and uploads to Supabase Storage. Student photos → `student-photos` bucket; inspection photos → `inspection-photos` bucket.

**Mock data**: `src/lib/mockData.ts` exports `PROPERTIES`, `ROOMS`, `STUDENTS`, `CONTRACTS` used when Supabase is absent.

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `DashboardPage` | Student list; filter by property + school year |
| `/contracts/new` | `ContractNewPage` | 4-step contract creation wizard |
| `/contracts/:id` | `ContractDetailPage` | Contract info + PDF action |
| `/contracts/:id/renew` | `ContractRenewPage` | Contract renewal |
| `/inspections/new` | `InspectionNewPage` | Inspection wizard (linked from contract detail) |
| `/inspections/:id` | `InspectionDetailPage` | Inspection detail: items grouped by category + PDF print |
| `/properties` | `PropertiesPage` | Property + room management |
| `/account` | `AccountPage` | Account page |
| `/settings` | `SettingsPage` | Verhuurder-profielformulier (naam, RR-nr., IBAN, verzekering, EPC) |
| `*` | → `/` | Catch-all redirect |

---

## Key Patterns

- **AppShell wraps every page.** Pages do not render their own layout chrome (nav, topbar).
- **Wizard state is local React state** in `ContractNewPage` and `InspectionNewPage`. Step components receive props + callbacks; no global state manager.
- **`cn()` from `src/lib/cn.ts`** is the project-wide utility for conditional Tailwind classes (wraps `clsx`).
- **PDF/print** is triggered browser-side via `pdfDocuments.ts` using `window.print()`. `generateContractHtml(ContractBundle)` produces a full A4 HTML contract (Art. 1–19 + Bijlage A plaatsbeschrijving) conform het Vlaams Woninghuurdecreet. `ContractBundle` = `{ contract, room, property, student, secondStudent?, inspection?, inspectionItems?, landlord?, signatureDataUrl? }`. `landlord` defaults to `MOCK_LANDLORD` when absent. `signatureDataUrl` embeds the verhuurder's handtekening as a `<img>` in het handtekeningblok.
- **Handtekening + e-mail**: `ContractDetailPage` toont een "Ondertekenen" knop die `SignatureModal` opent (canvas via `signature_pad`). Na bevestigen wordt `generateContractHtml` aangeroepen met de handtekening en het ondertekend contract verstuurd via `sendContractEmail`.
- **Verhuurder-profiel**: `LandlordProfile` wordt opgeslagen in `localStorage` via `saveLandlordProfile`. `getLandlordProfile` valt terug op `MOCK_LANDLORD_PROFILE` (uit `mockData.ts`). Editable via `/settings`.
- **Framer Motion** handles page and step transition animations.

---

## Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Without these, the app runs entirely on mock data (read-only, no persistence, no photo uploads). Copy `.env.example` to `.env.local` for local development.

---

## Deployment

- **Railway** is the live host. Project: `kotstart-demo`, URL: `https://kotstart-demo-production.up.railway.app`
- **Build**: `npm run build` (requires Node 20+)
- **Start**: `node server.js` — a custom static file server that binds to `0.0.0.0:$PORT` and serves the `dist/` folder with SPA fallback (all unknown paths → `index.html`)
- **railway.toml** controls build/start commands on Railway
- **Node 20 required**: Node 18 breaks the PWA build plugin. Local Node 20 path: `/opt/homebrew/opt/node@20/bin/node`
- See `HANDOVER.md` for full Railway, GitHub, and Supabase setup status.

---

## Database (Supabase)

Migration file: `supabase/migrations/20260521000000_initial.sql`

Tables: `properties`, `rooms`, `students`, `contracts`, `inspections`, `inspection_items`

Storage buckets: `student-photos`, `inspection-photos`

To apply: run the SQL in Supabase SQL Editor, then add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Railway env vars.

---

## Testing

```bash
npm run test:run   # single run (CI)
npm test           # watch mode
```

- **Framework**: Vitest + Testing Library + jest-dom
- **21 test files** in `src/__tests__/`, **88 tests** — all passing
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
