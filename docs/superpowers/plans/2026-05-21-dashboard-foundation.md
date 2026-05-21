# Student Onboarding PWA — Foundation & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React + Vite PWA and build a fully working Dashboard screen with liquid glass UI, responsive layout (telefoon / tablet / desktop), inklapbare sidebar, en mock data.

**Architecture:** AppShell levert de responsive omhulling — permanent inklapbare sidebar op ≥768px, Framer Motion drawer op mobiel. DashboardPage assembleert FilterBar, ActionBar, StudentRow, en EmptyState. Alle data komt uit `mockData.ts` (geen Supabase wiring in Phase 1).

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS v3, Framer Motion, React Router v6, Lucide React, clsx, Vitest + @testing-library/react, vite-plugin-pwa, @supabase/supabase-js (stub)

**Scope:** Phase 1 — Foundation + Dashboard. Contract wizard, inspectie, pandenbeheer krijgen elk een eigen plan.

---

## File Map

```
/
├── src/
│   ├── __tests__/
│   │   ├── Chip.test.tsx
│   │   ├── Sidebar.test.tsx
│   │   ├── Drawer.test.tsx
│   │   ├── StudentRow.test.tsx
│   │   ├── ActionBar.test.tsx
│   │   ├── EmptyState.test.tsx
│   │   └── DashboardPage.test.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   └── Chip.tsx              — filter dropdown chip (schooljaar/pand)
│   │   └── layout/
│   │       ├── AppShell.tsx          — responsive wrapper (sidebar vs drawer)
│   │       ├── Sidebar.tsx           — inklapbare sidebar tablet/desktop
│   │       ├── Drawer.tsx            — mobiele slide-in drawer
│   │       └── TopBar.tsx            — chips + hamburger knop
│   ├── pages/
│   │   ├── DashboardPage.tsx         — volledig gebouwd
│   │   ├── ContractNewPage.tsx       — stub
│   │   ├── ContractDetailPage.tsx    — stub
│   │   ├── InspectionNewPage.tsx     — stub
│   │   ├── PropertiesPage.tsx        — stub
│   │   ├── AccountPage.tsx           — stub
│   │   └── SettingsPage.tsx          — stub
│   ├── lib/
│   │   ├── mockData.ts               — realistische Belgische testdata
│   │   ├── supabase.ts               — client stub (geen queries)
│   │   └── cn.ts                     — clsx utility
│   ├── types/
│   │   └── index.ts                  — TS interfaces voor alle DB-entiteiten
│   ├── test-setup.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/
│       └── 20260521000000_initial.sql
├── public/
│   └── icons/                        — PWA icons (placeholder PNGs)
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── README.md
```

---

### Task 1: Project scaffolden + dependencies installeren

**Files:**
- Create: `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `src/test-setup.ts`

- [ ] **Stap 1: Vite project aanmaken in huidige map**

```bash
cd /Users/arryawillems/Desktop/Projects/StudentOnboarding
npm create vite@latest . -- --template react-ts
# Bevestig overschrijven als gevraagd
```

- [ ] **Stap 2: Dependencies installeren**

```bash
npm install react-router-dom framer-motion lucide-react clsx @supabase/supabase-js
npm install -D tailwindcss@3 autoprefixer postcss vite-plugin-pwa
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
npx tailwindcss init -p --ts
```

- [ ] **Stap 3: Vitest config schrijven**

Schrijf `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Stap 4: Test setup schrijven**

Schrijf `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Stap 5: Vite config schrijven (met PWA plugin)**

Schrijf `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KotBeheer',
        short_name: 'KotBeheer',
        description: 'Student onboarding voor verhuurders',
        theme_color: '#6366f1',
        background_color: '#dbeafe',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Stap 6: Tailwind config schrijven**

Schrijf `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: { DEFAULT: '#6366f1', dark: '#4f46e5' },
        'start-green': '#16a34a',
        'renew-blue': '#3b82f6',
        'end-purple': '#9333ea',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Stap 7: test script toevoegen aan package.json**

In `package.json`, voeg toe onder `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Stap 8: Verifieer scaffolding**

```bash
npm run dev
```

Verwacht: Vite dev server draait op `http://localhost:5173`. Druk `q` om te stoppen.

```bash
npm run test:run
```

Verwacht: `No test files found` (geen tests nog — dat is OK).

- [ ] **Stap 9: Git init + eerste commit**

```bash
git init
echo "node_modules\ndist\n.env\n.env.local\n.superpowers/" > .gitignore
git add -A
git commit -m "chore: scaffold Vite React TS project met Tailwind, Framer Motion, Vitest"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Stap 1: Types schrijven**

Schrijf `src/types/index.ts`:

```ts
export interface Property {
  id: string
  name: string
  address: string
  createdAt: string
}

export interface Room {
  id: string
  propertyId: string
  roomNumber: string
  roomType: 'studio' | 'single' | 'double'
  monthlyRent: number
  studentTax: number
  fixedCosts: number
  deposit: number
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl?: string
  createdAt: string
}

export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  secondLandlordName?: string
  secondLandlordEmail?: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
}

export interface Inspection {
  id: string
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrl?: string
  createdAt: string
}

export interface InspectionItem {
  id: string
  inspectionId: string
  category: string
  itemName: string
  condition: 'good' | 'moderate' | 'bad' | 'unusable'
  photoUrl?: string
  notes?: string
}

export interface StudentDashboardRow {
  studentId: string
  firstName: string
  lastName: string
  roomNumber: string
  contractId: string
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit
```

Verwacht: geen errors.

- [ ] **Stap 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: TypeScript interfaces voor alle DB-entiteiten"
```

---

### Task 3: Mock data + utilities

**Files:**
- Create: `src/lib/mockData.ts`, `src/lib/supabase.ts`, `src/lib/cn.ts`

- [ ] **Stap 1: cn utility schrijven**

Schrijf `src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
```

- [ ] **Stap 2: Supabase client stub schrijven**

Schrijf `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Stap 3: Mock data schrijven**

Schrijf `src/lib/mockData.ts`:

```ts
import type { Property, Room, Student, Contract, StudentDashboardRow } from '../types'

export const SCHOOL_YEARS = ['2024–2025', '2025–2026']

export const PROPERTIES: Property[] = [
  { id: 'p1', name: 'Residentie De Linde', address: 'Lindestraat 12, 9000 Gent', createdAt: '2024-08-01' },
  { id: 'p2', name: 'Kot Guldensporenstraat', address: 'Guldensporenstraat 45, 9000 Gent', createdAt: '2024-08-01' },
]

export const ROOMS: Room[] = [
  { id: 'r1', propertyId: 'p1', roomNumber: '01', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
  { id: 'r2', propertyId: 'p1', roomNumber: '02', roomType: 'single', monthlyRent: 470, studentTax: 12, fixedCosts: 60, deposit: 940 },
  { id: 'r3', propertyId: 'p1', roomNumber: '03', roomType: 'studio', monthlyRent: 550, studentTax: 12, fixedCosts: 80, deposit: 1100 },
  { id: 'r4', propertyId: 'p1', roomNumber: '04', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
  { id: 'r5', propertyId: 'p1', roomNumber: '05', roomType: 'single', monthlyRent: 460, studentTax: 12, fixedCosts: 60, deposit: 920 },
  { id: 'r6', propertyId: 'p1', roomNumber: '06', roomType: 'double', monthlyRent: 600, studentTax: 24, fixedCosts: 80, deposit: 1200 },
  { id: 'r7', propertyId: 'p1', roomNumber: '07', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
]

export const STUDENTS: Student[] = [
  { id: 's1', firstName: 'Emma', lastName: 'Janssen', email: 'emma.janssen@student.ugent.be', phone: '0470 11 22 33', dateOfBirth: '2005-03-14', createdAt: '2025-08-15' },
  { id: 's2', firstName: 'Liam', lastName: 'Pieters', email: 'liam.pieters@student.ugent.be', phone: '0471 44 55 66', dateOfBirth: '2004-07-22', createdAt: '2025-08-16' },
  { id: 's3', firstName: 'Sara', lastName: 'Bogaert', email: 'sara.bogaert@student.ugent.be', phone: '0472 77 88 99', dateOfBirth: '2005-11-03', createdAt: '2025-08-17' },
  { id: 's4', firstName: 'Noah', lastName: 'De Smedt', email: 'noah.desmedt@student.ugent.be', phone: '0473 00 11 22', dateOfBirth: '2004-05-18', createdAt: '2025-08-18' },
  { id: 's5', firstName: 'Fien', lastName: 'Vandenberghe', email: 'fien.vandenberghe@student.ugent.be', phone: '0474 33 44 55', dateOfBirth: '2005-09-27', createdAt: '2025-08-19' },
]

export const CONTRACTS: Contract[] = [
  { id: 'c1', roomId: 'r1', schoolYear: '2025–2026', studentId: 's1', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c2', roomId: 'r2', schoolYear: '2025–2026', studentId: 's2', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c3', roomId: 'r4', schoolYear: '2025–2026', studentId: 's3', status: 'sent', createdAt: '2025-08-21' },
  { id: 'c4', roomId: 'r5', schoolYear: '2025–2026', studentId: 's4', status: 'draft', createdAt: '2025-08-22' },
  { id: 'c5', roomId: 'r7', schoolYear: '2025–2026', studentId: 's5', status: 'signed', createdAt: '2025-08-22' },
]

export function getDashboardRows(propertyId: string, schoolYear: string): StudentDashboardRow[] {
  const propertyRooms = ROOMS.filter(r => r.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(r => r.id))
  const activeContracts = CONTRACTS.filter(c => roomIds.has(c.roomId) && c.schoolYear === schoolYear)

  return activeContracts.map(contract => {
    const student = STUDENTS.find(s => s.id === contract.studentId)!
    const room = ROOMS.find(r => r.id === contract.roomId)!
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      roomNumber: room.roomNumber,
      contractId: contract.id,
    }
  }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}
```

- [ ] **Stap 4: TypeScript check**

```bash
npx tsc --noEmit
```

Verwacht: geen errors.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/
git commit -m "feat: mock data, Supabase stub en cn utility"
```

---

### Task 4: Global styles + Tailwind

**Files:**
- Modify: `src/index.css`, `index.html`

- [ ] **Stap 1: index.css schrijven**

Vervang de inhoud van `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  }

  body {
    @apply min-h-screen;
    background: linear-gradient(135deg, #dbeafe 0%, #ede9fe 35%, #fce7f3 65%, #d1fae5 100%);
    background-attachment: fixed;
  }
}

@layer components {
  .glass {
    @apply bg-white/55 backdrop-blur-2xl border border-white/75;
    box-shadow: 0 4px 28px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95);
  }

  .glass-chip {
    @apply bg-white/68 backdrop-blur-md border border-white/90 cursor-pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 white;
  }

  .glass-row-even {
    @apply bg-white/30;
  }

  .btn-primary {
    @apply font-bold rounded-xl text-white;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    box-shadow: 0 3px 12px rgba(79,70,229,0.32), inset 0 1px 0 rgba(255,255,255,0.18);
  }

  .btn-action {
    @apply w-9 h-9 rounded-xl flex items-center justify-center relative cursor-pointer transition-transform duration-100 active:scale-95;
    box-shadow: 0 1px 6px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.85);
  }

  .btn-action-start {
    @apply bg-green-50/80 border border-green-300/55;
  }

  .btn-action-renew {
    @apply bg-blue-50/80 border border-blue-300/55;
  }

  .btn-action-end {
    @apply bg-purple-50/80 border border-purple-300/55;
  }
}
```

- [ ] **Stap 2: Bricolage Grotesque preconnect toevoegen aan index.html**

In `index.html`, voeg toe in de `<head>` vóór de andere links:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

- [ ] **Stap 3: Verifieer visueel**

```bash
npm run dev
```

Open `http://localhost:5173`. De achtergrond moet de blauw-paars-roze-groen gradient tonen met het Bricolage Grotesque font. Stop server.

- [ ] **Stap 4: Commit**

```bash
git add src/index.css index.html tailwind.config.ts
git commit -m "feat: global styles met liquid glass achtergrond en Bricolage Grotesque font"
```

---

### Task 5: Routing skeleton

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/pages/ContractNewPage.tsx`, `src/pages/ContractDetailPage.tsx`, `src/pages/InspectionNewPage.tsx`, `src/pages/PropertiesPage.tsx`, `src/pages/AccountPage.tsx`, `src/pages/SettingsPage.tsx`

- [ ] **Stap 1: main.tsx schrijven**

Vervang `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Stap 2: Stub pagina's aanmaken**

Schrijf `src/pages/ContractNewPage.tsx`:

```tsx
export default function ContractNewPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Nieuw contract</h1>
      <p className="mt-2 text-sm">Wizard — wordt gebouwd in Phase 2.</p>
    </div>
  )
}
```

Herhaal dit patroon (aanpassing van title en ondertitel) voor de overige stubs:

Schrijf `src/pages/ContractDetailPage.tsx`:
```tsx
export default function ContractDetailPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Contractdetail</h1>
      <p className="mt-2 text-sm">Wordt gebouwd in Phase 3.</p>
    </div>
  )
}
```

Schrijf `src/pages/InspectionNewPage.tsx`:
```tsx
export default function InspectionNewPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Plaatsbeschrijving</h1>
      <p className="mt-2 text-sm">Wordt gebouwd in Phase 4.</p>
    </div>
  )
}
```

Schrijf `src/pages/PropertiesPage.tsx`:
```tsx
export default function PropertiesPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Panden</h1>
      <p className="mt-2 text-sm">Wordt gebouwd in Phase 5.</p>
    </div>
  )
}
```

Schrijf `src/pages/AccountPage.tsx`:
```tsx
export default function AccountPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-2 text-sm">Komt later.</p>
    </div>
  )
}
```

Schrijf `src/pages/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return (
    <div className="p-8 text-slate-600">
      <h1 className="text-2xl font-bold">Instellingen</h1>
      <p className="mt-2 text-sm">Komt later.</p>
    </div>
  )
}
```

- [ ] **Stap 3: App.tsx schrijven**

Schrijf `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import ContractNewPage from './pages/ContractNewPage'
import ContractDetailPage from './pages/ContractDetailPage'
import InspectionNewPage from './pages/InspectionNewPage'
import PropertiesPage from './pages/PropertiesPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/contracts/new" element={<ContractNewPage />} />
      <Route path="/contracts/:id" element={<ContractDetailPage />} />
      <Route path="/inspections/new" element={<InspectionNewPage />} />
      <Route path="/properties" element={<PropertiesPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

- [ ] **Stap 4: Tijdelijke DashboardPage als placeholder zodat App compileert**

Schrijf `src/pages/DashboardPage.tsx` als tijdelijke placeholder:

```tsx
export default function DashboardPage() {
  return <div className="p-8 text-slate-600">Dashboard — wordt gebouwd in Task 11.</div>
}
```

- [ ] **Stap 5: Verifieer alle routes**

```bash
npm run dev
```

Ga naar `http://localhost:5173/contracts/new` — toont "Nieuw contract". Ga naar `http://localhost:5173/properties` — toont "Panden". Stop server.

- [ ] **Stap 6: Commit**

```bash
git add src/
git commit -m "feat: routing skeleton met alle routes en stub pagina's"
```

---

### Task 6: Chip component

**Files:**
- Create: `src/components/ui/Chip.tsx`, `src/__tests__/Chip.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/Chip.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Chip from '../components/ui/Chip'

describe('Chip', () => {
  it('toont het label', () => {
    render(<Chip label="2025–2026" onClick={() => {}} />)
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
  })

  it('roept onClick aan bij klik', () => {
    const onClick = vi.fn()
    render(<Chip label="Residentie De Linde" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('toont het chevron-icoon', () => {
    render(<Chip label="Test" onClick={() => {}} />)
    expect(document.querySelector('svg')).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../components/ui/Chip"`.

- [ ] **Stap 3: Chip implementeren**

Schrijf `src/components/ui/Chip.tsx`:

```tsx
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ChipProps {
  label: string
  onClick: () => void
  className?: string
}

export default function Chip({ label, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass-chip flex items-center gap-1.5 px-2.5 py-2 rounded-xl',
        'text-slate-800 text-xs font-semibold',
        'hover:bg-white/80 transition-colors duration-150',
        'min-h-[36px]',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
    </button>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `✓ Chip > toont het label`, `✓ Chip > roept onClick aan bij klik`, `✓ Chip > toont het chevron-icoon`.

- [ ] **Stap 5: Commit**

```bash
git add src/components/ui/Chip.tsx src/__tests__/Chip.test.tsx
git commit -m "feat: Chip component (filter dropdown chip)"
```

---

### Task 7: Sidebar component

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/__tests__/Sidebar.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/Sidebar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter>
      <Sidebar {...props} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('toont navigatie-items', () => {
    renderSidebar()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(screen.getByText('Panden')).toBeInTheDocument()
    expect(screen.getByText('Instellingen')).toBeInTheDocument()
  })

  it('begint uitgebreid', () => {
    renderSidebar()
    expect(screen.getByText('Overzicht')).toBeVisible()
  })

  it('verbergt labels na inklappen', () => {
    renderSidebar()
    const toggleBtn = screen.getByRole('button', { name: /inklappen/i })
    fireEvent.click(toggleBtn)
    expect(screen.getByText('Overzicht')).toHaveClass('opacity-0')
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../components/layout/Sidebar"`.

- [ ] **Stap 3: Sidebar implementeren**

Schrijf `src/components/layout/Sidebar.tsx`:

```tsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Building2, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Overzicht', iconColor: 'text-accent' },
  { to: '/properties', icon: Building2, label: 'Panden', iconColor: 'text-teal-500' },
  { to: '/settings', icon: Settings, label: 'Instellingen', iconColor: 'text-slate-500' },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true)

  return (
    <aside
      className={cn(
        'flex-shrink-0 flex flex-col',
        'bg-white/42 backdrop-blur-xl border-r border-white/70',
        'transition-[width] duration-250 ease-in-out overflow-hidden',
        expanded ? 'w-[200px]' : 'w-14',
      )}
    >
      <div className="flex justify-end px-2.5 py-3 border-b border-white/60">
        <button
          type="button"
          aria-label={expanded ? 'Inklappen' : 'Uitklappen'}
          onClick={() => setExpanded(e => !e)}
          className="w-7 h-7 rounded-lg bg-white/65 border border-white/90 flex items-center justify-center hover:bg-white/90 transition-colors"
        >
          {expanded
            ? <ChevronLeft size={14} className="text-slate-500" />
            : <ChevronRight size={14} className="text-slate-500" />
          }
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label, iconColor }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2 py-2.5 rounded-xl',
                'text-sm font-medium text-slate-600 transition-colors duration-130',
                'overflow-hidden whitespace-nowrap',
                isActive
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'hover:bg-white/60',
              )
            }
          >
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', iconColor === 'text-accent' ? 'bg-accent/12' : iconColor === 'text-teal-500' ? 'bg-teal-50' : 'bg-slate-100')}>
              <Icon size={15} className={iconColor} />
            </div>
            <span className={cn('transition-opacity duration-200', expanded ? 'opacity-100' : 'opacity-0')}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: 3 tests slagen voor `Sidebar`.

- [ ] **Stap 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/__tests__/Sidebar.test.tsx
git commit -m "feat: Sidebar component met inklapbare navigatie"
```

---

### Task 8: Drawer component (mobiel)

**Files:**
- Create: `src/components/layout/Drawer.tsx`, `src/__tests__/Drawer.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/Drawer.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Drawer from '../components/layout/Drawer'

function renderDrawer(isOpen: boolean, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <Drawer isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  )
}

describe('Drawer', () => {
  it('toont navigatie-items als open', () => {
    renderDrawer(true)
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(screen.getByText('Panden')).toBeInTheDocument()
    expect(screen.getByText('Instellingen')).toBeInTheDocument()
  })

  it('roept onClose aan bij klik op backdrop', () => {
    const onClose = vi.fn()
    renderDrawer(true, onClose)
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toont app logo', () => {
    renderDrawer(true)
    expect(screen.getByText('KotBeheer')).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../components/layout/Drawer"`.

- [ ] **Stap 3: Drawer implementeren**

Schrijf `src/components/layout/Drawer.tsx`:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Home, Building2, Settings, User } from 'lucide-react'
import { cn } from '../../lib/cn'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Overzicht' },
  { to: '/properties', icon: Building2, label: 'Panden' },
  { to: '/account', icon: User, label: 'Account' },
  { to: '/settings', icon: Settings, label: 'Instellingen' },
]

export default function Drawer({ isOpen, onClose }: DrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            data-testid="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-[75vw] max-w-[280px] h-full flex flex-col bg-white/72 backdrop-blur-3xl border-r border-white/95"
            style={{ boxShadow: '4px 0 40px rgba(0,0,0,0.15)' }}
          >
            <div className="pt-14 px-5 pb-4 border-b border-white/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                  <Home size={16} className="text-white" />
                </div>
                <span className="text-lg font-extrabold text-slate-800 tracking-tight">KotBeheer</span>
              </div>
            </div>

            <nav className="flex-1 flex flex-col gap-1 p-4">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-2xl',
                      'text-sm font-semibold transition-colors duration-130',
                      isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-slate-700 hover:bg-white/60',
                    )
                  }
                >
                  <div className="w-8 h-8 rounded-xl bg-white/70 border border-white/90 flex items-center justify-center">
                    <Icon size={16} className="text-slate-600" />
                  </div>
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: 3 tests slagen voor `Drawer`.

- [ ] **Stap 5: Commit**

```bash
git add src/components/layout/Drawer.tsx src/__tests__/Drawer.test.tsx
git commit -m "feat: Drawer component met Framer Motion slide-in animatie"
```

---

### Task 9: TopBar component

**Files:**
- Create: `src/components/layout/TopBar.tsx`

- [ ] **Stap 1: TopBar implementeren**

Schrijf `src/components/layout/TopBar.tsx`:

```tsx
import { Menu } from 'lucide-react'
import Chip from '../ui/Chip'

interface TopBarProps {
  schoolYear: string
  propertyName: string
  schoolYears: string[]
  propertyNames: string[]
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (name: string) => void
  onMenuClick: () => void
  showMenuButton: boolean
}

export default function TopBar({
  schoolYear,
  propertyName,
  onSchoolYearChange,
  onPropertyChange,
  onMenuClick,
  showMenuButton,
}: TopBarProps) {
  return (
    <div className="bg-white/38 backdrop-blur-xl border-b border-white/65 px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 min-w-0">
          <Chip
            label={schoolYear}
            onClick={() => {
              const next = schoolYear === '2025–2026' ? '2024–2025' : '2025–2026'
              onSchoolYearChange(next)
            }}
            className="flex-1 max-w-[130px]"
          />
          <Chip
            label={propertyName}
            onClick={() => {
              const next = propertyName === 'Residentie De Linde'
                ? 'Kot Guldensporenstraat'
                : 'Residentie De Linde'
              onPropertyChange(next)
            }}
            className="flex-1"
          />
        </div>
        {showMenuButton && (
          <button
            type="button"
            aria-label="Menu openen"
            onClick={onMenuClick}
            className="glass-chip w-9 h-9 flex-shrink-0 rounded-xl flex flex-col items-center justify-center gap-[4.5px]"
          >
            <Menu size={16} className="text-slate-500" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit
```

Verwacht: geen errors.

- [ ] **Stap 3: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: TopBar component met filter chips en hamburger knop"
```

---

### Task 10: AppShell (responsive layout wrapper)

**Files:**
- Create: `src/components/layout/AppShell.tsx`

- [ ] **Stap 1: AppShell implementeren**

Schrijf `src/components/layout/AppShell.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Drawer from './Drawer'
import TopBar from './TopBar'
import { PROPERTIES, SCHOOL_YEARS } from '../../lib/mockData'

interface AppShellProps {
  children: ReactNode
  schoolYear: string
  propertyId: string
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (id: string) => void
}

export default function AppShell({
  children,
  schoolYear,
  propertyId,
  onSchoolYearChange,
  onPropertyChange,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedProperty = PROPERTIES.find(p => p.id === propertyId) ?? PROPERTIES[0]

  function handlePropertyChange(name: string) {
    const found = PROPERTIES.find(p => p.name === name)
    if (found) onPropertyChange(found.id)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: verborgen op mobiel, zichtbaar op md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobiele drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Hoofd inhoud */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          schoolYear={schoolYear}
          propertyName={selectedProperty.name}
          schoolYears={SCHOOL_YEARS}
          propertyNames={PROPERTIES.map(p => p.name)}
          onSchoolYearChange={onSchoolYearChange}
          onPropertyChange={handlePropertyChange}
          onMenuClick={() => setDrawerOpen(true)}
          showMenuButton={true}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit
```

Verwacht: geen errors.

- [ ] **Stap 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: AppShell responsive layout (sidebar md+, drawer mobiel)"
```

---

### Task 11: StudentRow component

**Files:**
- Create: `src/pages/components/StudentRow.tsx`, `src/__tests__/StudentRow.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/StudentRow.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StudentRow from '../pages/components/StudentRow'
import type { StudentDashboardRow } from '../types'

const mockRow: StudentDashboardRow = {
  studentId: 's1',
  firstName: 'Emma',
  lastName: 'Janssen',
  roomNumber: '01',
  contractId: 'c1',
}

describe('StudentRow', () => {
  it('toont de studentnaam', () => {
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont enkel het kamernummer (geen "Kamer" prefix)', () => {
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    expect(screen.queryByText(/kamer/i)).not.toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('roept onRenew aan bij klik op verlengknop', () => {
    const onRenew = vi.fn()
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={onRenew} onEndInspection={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /verlengen/i }))
    expect(onRenew).toHaveBeenCalledWith('c1')
  })

  it('roept onStartInspection aan bij klik op startplaatsbeschrijving', () => {
    const onStartInspection = vi.fn()
    render(<StudentRow row={mockRow} onStartInspection={onStartInspection} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /startplaatsbeschrijving/i }))
    expect(onStartInspection).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../pages/components/StudentRow"`.

- [ ] **Stap 3: StudentRow implementeren**

Maak de directory aan en schrijf `src/pages/components/StudentRow.tsx`:

```tsx
import { ClipboardList, CalendarPlus, ClipboardCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { StudentDashboardRow } from '../../types'

interface StudentRowProps {
  row: StudentDashboardRow
  isEven?: boolean
  onStartInspection: (contractId: string) => void
  onRenew: (contractId: string) => void
  onEndInspection: (contractId: string) => void
}

export default function StudentRow({
  row,
  isEven = false,
  onStartInspection,
  onRenew,
  onEndInspection,
}: StudentRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        'border-b border-slate-200/55',
        isEven ? 'bg-white/30' : '',
        'hover:bg-white/50 transition-colors duration-130',
      )}
    >
      {/* Naam + kamer */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {row.firstName} {row.lastName}
        </p>
        {/* Op mobiel: kamernummer klein eronder */}
        <p className="text-xs text-slate-400 font-medium mt-0.5 md:hidden">{row.roomNumber}</p>
      </div>

      {/* Kamer kolom (verborgen op mobiel, zichtbaar op md+) */}
      <div className="hidden md:block w-[72px] flex-shrink-0">
        <span className="text-sm font-medium text-slate-500">{row.roomNumber}</span>
      </div>

      {/* Actieknoppen */}
      <div className="flex items-center gap-1.5 w-[136px] justify-end flex-shrink-0">
        <button
          type="button"
          aria-label="Startplaatsbeschrijving"
          onClick={() => onStartInspection(row.contractId)}
          className="btn-action btn-action-start group"
        >
          <ClipboardList size={15} className="text-start-green" />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white text-[7px] font-black flex items-center justify-center border-[1.5px] border-white">
            S
          </span>
        </button>

        <button
          type="button"
          aria-label="Contract verlengen"
          onClick={() => onRenew(row.contractId)}
          className="btn-action btn-action-renew"
        >
          <CalendarPlus size={15} className="text-renew-blue" />
        </button>

        <button
          type="button"
          aria-label="Eindplaatsbeschrijving"
          onClick={() => onEndInspection(row.contractId)}
          className="btn-action btn-action-end group"
        >
          <ClipboardCheck size={15} className="text-end-purple" />
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-400 to-purple-700 text-white text-[7px] font-black flex items-center justify-center border-[1.5px] border-white">
            E
          </span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: 4 tests slagen voor `StudentRow`.

- [ ] **Stap 5: Commit**

```bash
git add src/pages/components/StudentRow.tsx src/__tests__/StudentRow.test.tsx
git commit -m "feat: StudentRow component met drie actieknoppen"
```

---

### Task 12: ActionBar component

**Files:**
- Create: `src/pages/components/ActionBar.tsx`, `src/__tests__/ActionBar.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/ActionBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ActionBar from '../pages/components/ActionBar'

describe('ActionBar', () => {
  it('toont "+ Nieuw Contract" knop', () => {
    render(<ActionBar sortKey="room" sortDir="asc" onSort={vi.fn()} onNewContract={vi.fn()} />)
    expect(screen.getByRole('button', { name: /nieuw contract/i })).toBeInTheDocument()
  })

  it('roept onNewContract aan bij klik', () => {
    const onNewContract = vi.fn()
    render(<ActionBar sortKey="room" sortDir="asc" onSort={vi.fn()} onNewContract={onNewContract} />)
    fireEvent.click(screen.getByRole('button', { name: /nieuw contract/i }))
    expect(onNewContract).toHaveBeenCalledTimes(1)
  })

  it('roept onSort("student") aan bij klik op Student header', () => {
    const onSort = vi.fn()
    render(<ActionBar sortKey="room" sortDir="asc" onSort={onSort} onNewContract={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /student/i }))
    expect(onSort).toHaveBeenCalledWith('student')
  })

  it('toont pijl-omhoog indicator bij asc sortering op actieve kolom', () => {
    render(<ActionBar sortKey="student" sortDir="asc" onSort={vi.fn()} onNewContract={vi.fn()} />)
    expect(screen.getByTestId('sort-arrow')).toHaveTextContent('↑')
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../pages/components/ActionBar"`.

- [ ] **Stap 3: ActionBar implementeren**

Schrijf `src/pages/components/ActionBar.tsx`:

```tsx
import { cn } from '../../lib/cn'

type SortKey = 'student' | 'room'
type SortDir = 'asc' | 'desc'

interface ActionBarProps {
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onNewContract: () => void
}

export default function ActionBar({ sortKey, sortDir, onSort, onNewContract }: ActionBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white/22 border-b border-slate-200/45">
      <div className="flex gap-4">
        {(['student', 'room'] as SortKey[]).map(key => (
          <button
            key={key}
            type="button"
            aria-label={key === 'student' ? 'Student' : 'Kamer'}
            onClick={() => onSort(key)}
            className={cn(
              'flex items-center gap-1 text-[10.5px] font-bold tracking-[0.05em] uppercase transition-colors',
              sortKey === key ? 'text-accent' : 'text-slate-400 hover:text-slate-600',
              key === 'room' && 'hidden md:flex',
            )}
          >
            {key === 'student' ? 'Student' : 'Kamer'}
            {sortKey === key && (
              <span data-testid="sort-arrow" className="text-accent text-[10px]">
                {sortDir === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNewContract}
        className="btn-primary text-xs font-bold px-3 py-2 min-h-[32px]"
        aria-label="Nieuw Contract aanmaken"
      >
        + Nieuw Contract
      </button>
    </div>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: 4 tests slagen voor `ActionBar`.

- [ ] **Stap 5: Commit**

```bash
git add src/pages/components/ActionBar.tsx src/__tests__/ActionBar.test.tsx
git commit -m "feat: ActionBar component met sorteerfunctie en nieuw contract knop"
```

---

### Task 13: EmptyState component

**Files:**
- Create: `src/pages/components/EmptyState.tsx`, `src/__tests__/EmptyState.test.tsx`

- [ ] **Stap 1: Failing test schrijven**

Schrijf `src/__tests__/EmptyState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyState from '../pages/components/EmptyState'

describe('EmptyState', () => {
  it('toont de koptekst', () => {
    render(<EmptyState />)
    expect(screen.getByText('Nog geen studenten')).toBeInTheDocument()
  })

  it('toont de CTA instructie', () => {
    render(<EmptyState />)
    expect(screen.getByText(/nieuw contract/i)).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Test laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: `Error: Failed to resolve import "../pages/components/EmptyState"`.

- [ ] **Stap 3: EmptyState implementeren**

Schrijf `src/pages/components/EmptyState.tsx`:

```tsx
import { FileText } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/55 backdrop-blur-xl border border-white/75 flex items-center justify-center mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.07)]">
        <FileText size={36} className="text-slate-300" />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1.5">Nog geen studenten</h3>
      <p className="text-sm text-slate-400 max-w-[240px] leading-relaxed">
        Klik op <span className="font-semibold text-accent">+ Nieuw Contract</span> om de eerste student aan dit pand toe te voegen.
      </p>
    </div>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: 2 tests slagen voor `EmptyState`.

- [ ] **Stap 5: Commit**

```bash
git add src/pages/components/EmptyState.tsx src/__tests__/EmptyState.test.tsx
git commit -m "feat: EmptyState component met illustratie en CTA"
```

---

### Task 14: DashboardPage — volledige implementatie

**Files:**
- Modify: `src/pages/DashboardPage.tsx`
- Create: `src/__tests__/DashboardPage.test.tsx`

- [ ] **Stap 1: Failing tests schrijven**

Schrijf `src/__tests__/DashboardPage.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  it('toont studentennamen', () => {
    renderDashboard()
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByText('Liam Pieters')).toBeInTheDocument()
    expect(screen.getByText('Sara Bogaert')).toBeInTheDocument()
  })

  it('sorteert standaard op kamernummer oplopend', () => {
    renderDashboard()
    const names = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe/).map(el => el.textContent)
    expect(names[0]).toContain('Janssen') // kamer 01 eerst
  })

  it('wisselt naar studentsortering bij klik op Student header', () => {
    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: /student/i }))
    const firstRow = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe/)[0]
    expect(firstRow.textContent).toContain('Bogaert') // B komt eerst alfabetisch
  })

  it('toont lege staat als er geen data is voor de selectie', () => {
    renderDashboard()
    // Wissel naar een pand zonder studenten door twee keer te klikken op de property chip
    // (Kot Guldensporenstraat heeft geen contracten in mockData)
    const propertyChip = screen.getByText('Residentie De Linde')
    fireEvent.click(propertyChip)
    expect(screen.getByText('Nog geen studenten')).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Tests laten falen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: tests falen omdat `DashboardPage` de placeholder is.

- [ ] **Stap 3: DashboardPage volledig implementeren**

Vervang `src/pages/DashboardPage.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import ActionBar from './components/ActionBar'
import StudentRow from './components/StudentRow'
import EmptyState from './components/EmptyState'
import { getDashboardRows, PROPERTIES } from '../lib/mockData'
import type { StudentDashboardRow } from '../types'

type SortKey = 'student' | 'room'
type SortDir = 'asc' | 'desc'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [sortKey, setSortKey] = useState<SortKey>('room')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const baseRows = useMemo(
    () => getDashboardRows(propertyId, schoolYear),
    [propertyId, schoolYear],
  )

  const rows = useMemo((): StudentDashboardRow[] => {
    return [...baseRows].sort((a, b) => {
      const valA = sortKey === 'student' ? `${a.lastName} ${a.firstName}` : a.roomNumber
      const valB = sortKey === 'student' ? `${b.lastName} ${b.firstName}` : b.roomNumber
      const cmp = valA.localeCompare(valB, 'nl')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [baseRows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <AppShell
      schoolYear={schoolYear}
      propertyId={propertyId}
      onSchoolYearChange={setSchoolYear}
      onPropertyChange={setPropertyId}
    >
      <div className="flex flex-col h-full">
        <ActionBar
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onNewContract={() => navigate('/contracts/new')}
        />

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            rows.map((row, idx) => (
              <StudentRow
                key={row.studentId}
                row={row}
                isEven={idx % 2 === 1}
                onStartInspection={(contractId) =>
                  console.log('Start inspectie:', contractId)
                }
                onRenew={(contractId) =>
                  navigate(`/contracts/${contractId}/renew`)
                }
                onEndInspection={(contractId) =>
                  console.log('Eind inspectie:', contractId)
                }
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Stap 4: Tests laten slagen**

```bash
npm run test:run -- --reporter=verbose 2>&1 | tail -20
```

Verwacht: alle 4 DashboardPage tests slagen.

- [ ] **Stap 5: Alle tests draaien**

```bash
npm run test:run
```

Verwacht: alle tests slagen.

- [ ] **Stap 6: Visueel testen in de browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Controleer:
- Liquid glass achtergrond zichtbaar
- Vijf studentrijen tonen (Janssen, Pieters, Bogaert, De Smedt, Vandenberghe)
- Klik "Student" header → sortering wisselt naar alfabetisch (Bogaert eerst)
- Klik "+ Nieuw Contract" → navigeert naar `/contracts/new`
- Op schermbreedte < 768px (DevTools → mobiel): hamburger zichtbaar, klik opent drawer
- Op schermbreedte ≥ 768px: sidebar met "Overzicht / Panden / Instellingen", inklap-knop werkt

Stop server.

- [ ] **Stap 7: Commit**

```bash
git add src/pages/DashboardPage.tsx src/__tests__/DashboardPage.test.tsx
git commit -m "feat: volledig werkend Dashboard met sortering, lege staat en responsieve layout"
```

---

### Task 15: SQL migratie + README

**Files:**
- Create: `supabase/migrations/20260521000000_initial.sql`, `README.md`

- [ ] **Stap 1: Supabase migrations map aanmaken en SQL schrijven**

```bash
mkdir -p supabase/migrations
```

Schrijf `supabase/migrations/20260521000000_initial.sql`:

```sql
-- KotBeheer: initieel databaseschema

create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  room_number text not null,
  room_type text check (room_type in ('studio','single','double')) not null,
  monthly_rent numeric(10,2),
  student_tax numeric(10,2),
  fixed_costs numeric(10,2),
  deposit numeric(10,2)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  photo_url text,
  created_at timestamptz default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  school_year text not null,
  student_id uuid references students(id),
  second_student_id uuid references students(id),
  second_landlord_name text,
  second_landlord_email text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  status text check (status in ('draft','sent','signed')) default 'draft',
  created_at timestamptz default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id),
  type text check (type in ('start','end')) not null,
  overview_photo_url text,
  created_at timestamptz default now()
);

create table inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  category text not null,
  item_name text not null,
  condition text check (condition in ('good','moderate','bad','unusable')),
  photo_url text,
  notes text
);
```

- [ ] **Stap 2: README schrijven**

Schrijf `README.md`:

```markdown
# KotBeheer — Student Onboarding PWA

Digitale onboarding voor verhuurders: contracten opstellen, ondertekenen en plaatsbeschrijvingen opmaken.

## Vereisten

- Node.js 20+
- npm 10+

## Installatie

```bash
npm install
```

## Ontwikkeling

```bash
npm run dev
```

Opent op `http://localhost:5173`.

## Tests

```bash
npm run test:run   # eenmalig
npm test           # watch mode
```

## Bouwen voor productie

```bash
npm run build
npm run preview
```

## Omgevingsvariabelen

Kopieer `.env.example` naar `.env.local` (voor Supabase wiring in Phase 2):

```
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key
```

## Databasemigratie

```bash
supabase db push
# of manueel via Supabase Studio: supabase/migrations/20260521000000_initial.sql
```

## Fasen

- **Phase 1 (huidig):** Foundation + Dashboard — volledig met mock data
- **Phase 2:** Contract Wizard (nieuw contract + verlenging)
- **Phase 3:** Plaatsbeschrijving (inspectieflow)
- **Phase 4:** Pandenbeheer
```

- [ ] **Stap 3: .env.example aanmaken**

```bash
echo "VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=" > .env.example
```

- [ ] **Stap 4: Commit**

```bash
git add supabase/ README.md .env.example
git commit -m "docs: SQL migratie, README en .env.example"
```

---

### Task 16: Eindverificatie

- [ ] **Stap 1: Alle tests draaien**

```bash
npm run test:run
```

Verwacht: alle tests slagen, 0 failures.

- [ ] **Stap 2: TypeScript check**

```bash
npx tsc --noEmit
```

Verwacht: geen errors.

- [ ] **Stap 3: Production build**

```bash
npm run build
```

Verwacht: build slaagt, geen errors. `dist/` wordt aangemaakt.

- [ ] **Stap 4: PWA icons aanmaken (placeholder)**

```bash
mkdir -p public/icons
# Maak tijdelijke placeholder icons (192x192 en 512x512)
# Vervang door echte icons vóór productie
node -e "
const fs = require('fs');
// SVG placeholder als base64 PNG substitute — gebruik een echte icon generator voor productie
console.log('Icon placeholders: plaats icon-192.png en icon-512.png in public/icons/');
"
```

Maak `public/icons/icon-192.png` en `public/icons/icon-512.png` aan met een icon tool (bijv. https://favicon.io) of gebruik tijdelijk de Vite default. De app werkt ook zonder icons in dev mode.

- [ ] **Stap 5: Finale commit**

```bash
git add -A
git commit -m "chore: eindverificatie — alle tests slagen, TypeScript clean, build succesvol"
```

---

## Spec dekking check

| Spec vereiste | Task |
|---|---|
| React + Vite + TypeScript | Task 1 |
| Tailwind CSS | Task 1, 4 |
| Framer Motion (drawer animatie) | Task 8 |
| React Router v6 | Task 5 |
| Lucide React iconen (geen emoji's) | Task 11 |
| Bricolage Grotesque font | Task 4 |
| Liquid glass esthetiek | Task 4 |
| TypeScript interfaces alle entiteiten | Task 2 |
| Mock data (Belgische data) | Task 3 |
| Supabase client stub | Task 3 |
| Responsief (telefoon/tablet/desktop) | Task 10 |
| Inklapbare sidebar (tablet/desktop) | Task 7 |
| Mobiele drawer (hamburger) | Task 8 |
| Filter chips (schooljaar + pand) | Task 6, 9 |
| Kolomheaders uitgelijnd boven data | Task 12 |
| Enkel kamernummer (geen "Kamer" prefix) | Task 11 |
| Sorteerbare kolommen met pijl-indicator | Task 12, 14 |
| Drie actieknoppen per rij (S/renew/E) | Task 11 |
| Lege staat met CTA | Task 13 |
| "+ Nieuw Contract" navigeert naar /contracts/new | Task 14 |
| SQL migratie (met voogd-velden) | Task 15 |
| PWA manifest | Task 1 (vite.config.ts) |
| README met setup instructies | Task 15 |
| Alle routes navigeerbaar (stub pagina's) | Task 5 |
| vite-plugin-pwa | Task 1 |
