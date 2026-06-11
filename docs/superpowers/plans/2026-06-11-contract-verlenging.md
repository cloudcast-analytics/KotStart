# Contractverlenging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Verlenging versturen" button on `ContractRenewPage` actually create a real renewal contract for the next school year — with a price snapshot per contract, room-capacity-aware room selection, and price changes propagating to the room for future contracts.

**Architecture:** Extend the `Contract` domain type with optional `monthlyRent`/`fixedCosts`/`studentTax` snapshot fields (fallback `contract.X ?? room.X` everywhere they're displayed). Add `nextSchoolYear` (exported), `getAvailableRoomsForRenewal` (capacity-aware room list), and `createContractRenewal` (creates a `draft` contract reusing the previous contract's student(s), optionally updating the room's rates) to `src/lib/data.ts`. Rewrite `ContractRenewPage.tsx` to use these: read-only "Nieuw schooljaar", a "Kamer" `<select>` of available rooms, and a real submit. Apply a Supabase migration adding the three columns + backfill, and mirror it in `staging-bootstrap.sql`.

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind, Supabase (Postgres), Vitest + Testing Library.

**Testing approach note:** This codebase has no Supabase-client mocking anywhere (`vi.mock` is only ever used on `'../lib/data'` itself, never on `'../lib/supabase'`). For the Supabase-only insert/update code paths inside `createContractDraft` and `createContractRenewal` (and the `mapContract`/`ContractRow` Supabase row mapping), there is no way to write a genuinely failing→passing unit test without introducing new mocking infrastructure (out of scope here). For those specific steps, the plan substitutes `npx tsc -b` (type-check) plus the full `npm run test:run` regression suite as the verification step, and says so explicitly. All demo-mode logic (which is what mock data exercises) gets real TDD tests.

---

## File Structure

- `src/types/index.ts` — `Contract` interface gets 3 new optional fields (`monthlyRent`, `fixedCosts`, `studentTax`).
- `src/lib/mockData.ts` — `SCHOOL_YEARS` extended with 2 future years; `CONTRACTS` get the 3 snapshot fields (frozen at current room rates).
- `src/lib/data.ts` —
  - `ContractRow` gets 3 new optional row fields; `mapContract` maps them.
  - `nextSchoolYear` becomes `export`ed (was private).
  - New `ROOM_CAPACITY`, `isRoomAvailable`, `getAvailableRoomsForRenewal`.
  - `CreateContractDraftInput` gets 3 new required fields; `createContractDraft` insert includes them with a fallback.
  - New `CreateContractRenewalInput` + `createContractRenewal`.
- `src/pages/ContractNewPage.tsx` — `createContractDraft` call passes the new rate fields from `selectedRoom`.
- `src/pages/ContractRenewPage.tsx` — full rewrite: read-only "Nieuw schooljaar", new "Kamer" select, real submit via `createContractRenewal`.
- `src/pages/ContractDetailPage.tsx` — "Contract" `InfoCard` uses `effectiveMonthlyRent/effectiveFixedCosts/effectiveStudentTax`.
- `src/lib/pdfDocuments.ts` — `generateContractHtml` uses the same effective values.
- `src/__tests__/data.test.ts`, `src/__tests__/ContractRenewPage.test.tsx`, `src/__tests__/ContractDetailPage.test.tsx`, `src/__tests__/pdfDocuments.test.ts` — new/updated tests.
- `supabase/migrations/20260611020000_contract_rent_snapshot.sql` — new migration (3 columns + backfill).
- `supabase/staging-bootstrap.sql` — `contracts` table definition gets the 3 new columns.

---

### Task 1: Contract price snapshot — types + mock data

**Files:**
- Modify: `src/types/index.ts:57-67`
- Modify: `src/lib/mockData.ts:3` and `src/lib/mockData.ts:108-115`
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/data.test.ts` (add `getContracts` to the existing import on line 2):

```ts
import { getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, saveInspectionCategories } from '../lib/data'
```

Add a new describe block:

```ts
describe('getContracts', () => {
  it('geeft de prijssnapshot van elk contract door', async () => {
    const contracts = await getContracts()
    const c1 = contracts.find(c => c.id === 'c1')

    expect(c1?.monthlyRent).toBe(450)
    expect(c1?.fixedCosts).toBe(60)
    expect(c1?.studentTax).toBe(12)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- data.test.ts`
Expected: FAIL — `expect(undefined).toBe(450)` for `c1?.monthlyRent`.

- [ ] **Step 3: Add the 3 optional fields to `Contract`**

In `src/types/index.ts`, replace lines 57-67:

```ts
export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
  signedAt?: string
  sentAt?: string
}
```

with:

```ts
export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
  signedAt?: string
  sentAt?: string
  monthlyRent?: number
  fixedCosts?: number
  studentTax?: number
}
```

- [ ] **Step 4: Extend `SCHOOL_YEARS` and add the snapshot fields to `CONTRACTS`**

In `src/lib/mockData.ts`, replace line 3:

```ts
export const SCHOOL_YEARS = ['2024–2025', '2025–2026']
```

with:

```ts
export const SCHOOL_YEARS = ['2024–2025', '2025–2026', '2026–2027', '2027–2028']
```

Replace lines 108-115 (`export const CONTRACTS: Contract[] = [...]`) with:

```ts
export const CONTRACTS: Contract[] = [
  { id: 'c1', roomId: 'r1', schoolYear: '2025–2026', studentId: 's1', status: 'signed', createdAt: '2025-08-20', signedAt: '2025-09-12T10:00:00.000Z', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c2', roomId: 'r2', schoolYear: '2025–2026', studentId: 's2', status: 'signed', createdAt: '2025-08-20', signedAt: '2025-09-12T10:00:00.000Z', monthlyRent: 470, fixedCosts: 60, studentTax: 12 },
  { id: 'c3', roomId: 'r4', schoolYear: '2025–2026', studentId: 's3', status: 'sent', createdAt: '2025-08-21', signedAt: '2025-09-13T10:00:00.000Z', sentAt: '2025-09-13T10:05:00.000Z', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c4', roomId: 'r5', schoolYear: '2025–2026', studentId: 's4', status: 'draft', createdAt: '2025-08-22', monthlyRent: 460, fixedCosts: 60, studentTax: 12 },
  { id: 'c5', roomId: 'r7', schoolYear: '2025–2026', studentId: 's5', status: 'signed', createdAt: '2025-08-22', monthlyRent: 450, fixedCosts: 60, studentTax: 12 },
  { id: 'c-demo-student', roomId: 'r6', schoolYear: '2025–2026', studentId: 's-demo-student', secondStudentId: 's-demo-second-student', status: 'sent', createdAt: '2025-08-23', signedAt: '2025-09-14T10:00:00.000Z', sentAt: '2025-09-14T10:05:00.000Z', monthlyRent: 600, fixedCosts: 80, studentTax: 24 },
]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:run -- data.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/mockData.ts src/__tests__/data.test.ts
git commit -m "feat(contracts): add price snapshot fields and extend SCHOOL_YEARS"
```

---

### Task 2: Export `nextSchoolYear` from `src/lib/data.ts`

**Files:**
- Modify: `src/lib/data.ts:369-376`
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/data.test.ts` (add `nextSchoolYear` to the import from `'../lib/data'`):

```ts
import { getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, nextSchoolYear, saveInspectionCategories } from '../lib/data'
```

```ts
describe('nextSchoolYear', () => {
  it('telt beide jaartallen op met 1', () => {
    expect(nextSchoolYear('2025–2026')).toBe('2026–2027')
  })

  it('geeft de input ongewijzigd terug bij een onverwacht formaat', () => {
    expect(nextSchoolYear('onbekend')).toBe('onbekend')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- data.test.ts`
Expected: FAIL — TypeScript/import error, `nextSchoolYear` is not exported from `'../lib/data'`.

- [ ] **Step 3: Export the function**

In `src/lib/data.ts`, replace line 369:

```ts
function nextSchoolYear(current: string): string {
```

with:

```ts
export function nextSchoolYear(current: string): string {
```

(Lines 370-376 stay unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(contracts): export nextSchoolYear from data layer"
```

---

### Task 3: `ContractRow`/`mapContract` Supabase mapping for the price snapshot

**Files:**
- Modify: `src/lib/data.ts:48-58` (`ContractRow`)
- Modify: `src/lib/data.ts:316-328` (`mapContract`)

This task only touches the Supabase row→domain mapping, which is exercised by no demo-mode test (see "Testing approach note" above). Verification is `npx tsc -b` + the full suite at the end of Task 11.

- [ ] **Step 1: Add the 3 row fields to `ContractRow`**

In `src/lib/data.ts`, replace lines 48-58:

```ts
interface ContractRow {
  id: string
  room_id: string
  school_year: string
  student_id: string
  second_student_id: string | null
  status: Contract['status']
  created_at: string
  signed_at?: string | null
  sent_at?: string | null
}
```

with:

```ts
interface ContractRow {
  id: string
  room_id: string
  school_year: string
  student_id: string
  second_student_id: string | null
  status: Contract['status']
  created_at: string
  signed_at?: string | null
  sent_at?: string | null
  monthly_rent?: number | string | null
  fixed_costs?: number | string | null
  student_tax?: number | string | null
}
```

- [ ] **Step 2: Map the 3 fields in `mapContract`**

In `src/lib/data.ts`, replace lines 316-328:

```ts
function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    roomId: row.room_id,
    schoolYear: row.school_year,
    studentId: row.student_id,
    secondStudentId: row.second_student_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    signedAt: row.signed_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
  }
}
```

with:

```ts
function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    roomId: row.room_id,
    schoolYear: row.school_year,
    studentId: row.student_id,
    secondStudentId: row.second_student_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    signedAt: row.signed_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    monthlyRent: row.monthly_rent != null ? asNumber(row.monthly_rent) : undefined,
    fixedCosts: row.fixed_costs != null ? asNumber(row.fixed_costs) : undefined,
    studentTax: row.student_tax != null ? asNumber(row.student_tax) : undefined,
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat(contracts): map price snapshot columns from Supabase contract rows"
```

---

### Task 4: Room-capacity check + `getAvailableRoomsForRenewal`

**Files:**
- Modify: `src/lib/data.ts` (insert after `getContracts()`, currently ending at line 479)
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `getAvailableRoomsForRenewal` to the import from `'../lib/data'` in `src/__tests__/data.test.ts`:

```ts
import { getAvailableRoomsForRenewal, getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, nextSchoolYear, saveInspectionCategories } from '../lib/data'
```

```ts
describe('getAvailableRoomsForRenewal', () => {
  it('geeft alle kamers van het pand terug voor een schooljaar zonder contracten', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2026–2027', 'c1')

    expect(rooms.map(r => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'])
  })

  it('sluit volle kamers uit, telt het te verlengen contract zelf niet mee', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2025–2026', 'c1')

    expect(rooms.map(r => r.id)).toEqual(['r1', 'r3', 'r5', 'r6'])
  })

  it('negeert draft-contracten en telt de eigen kamer van een ander contract niet mee', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2025–2026', 'c-demo-student')

    expect(rooms.map(r => r.id)).toEqual(['r3', 'r5', 'r6'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- data.test.ts`
Expected: FAIL — `getAvailableRoomsForRenewal` is not exported from `'../lib/data'`.

- [ ] **Step 3: Implement `ROOM_CAPACITY`, `isRoomAvailable`, `getAvailableRoomsForRenewal`**

In `src/lib/data.ts`, immediately after the closing brace of `getContracts()`:

```ts
export async function getContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured) return CONTRACTS

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as ContractRow[]).map(mapContract)
}
```

insert:

```ts

const ROOM_CAPACITY: Record<Room['roomType'], number> = {
  studio: 1,
  single: 1,
  double: 2,
}

function isRoomAvailable(
  room: Room,
  schoolYear: string,
  contracts: Contract[],
  excludeContractId: string,
): boolean {
  const occupants = contracts.filter(
    contract =>
      contract.roomId === room.id &&
      contract.schoolYear === schoolYear &&
      contract.id !== excludeContractId &&
      (contract.status === 'signed' || contract.status === 'sent'),
  ).length
  return occupants < ROOM_CAPACITY[room.roomType]
}

export async function getAvailableRoomsForRenewal(
  propertyId: string,
  schoolYear: string,
  currentContractId: string,
): Promise<Room[]> {
  const [rooms, contracts] = await Promise.all([getRooms(), getContracts()])
  return rooms
    .filter(room => room.propertyId === propertyId)
    .filter(room => isRoomAvailable(room, schoolYear, contracts, currentContractId))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(contracts): add room-capacity check and getAvailableRoomsForRenewal"
```

---

### Task 5: `createContractDraft` snapshot fields + `ContractNewPage` update

**Files:**
- Modify: `src/lib/data.ts:114-118` (`CreateContractDraftInput`)
- Modify: `src/lib/data.ts:891-905` (`createContractDraft` insert)
- Modify: `src/pages/ContractNewPage.tsx:145-149`
- Test: `src/__tests__/ContractNewPage.test.tsx` (regression — no new test needed, see Step 1)

- [ ] **Step 1: Run the existing ContractNewPage tests to confirm current green baseline**

Run: `npm run test:run -- ContractNewPage.test.tsx`
Expected: PASS (10/10) — this is the baseline; Step 5 must keep this green after the type changes.

- [ ] **Step 2: Add the 3 required fields to `CreateContractDraftInput`**

In `src/lib/data.ts`, replace lines 114-118:

```ts
interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
}
```

with:

```ts
interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}
```

- [ ] **Step 3: Pass the new fields from `ContractNewPage.tsx`**

In `src/pages/ContractNewPage.tsx`, replace lines 145-149:

```ts
      const contractId = await createContractDraft({
        roomId: selectedRoom.id,
        schoolYear: '2025–2026',
        students,
      })
```

with:

```ts
      const contractId = await createContractDraft({
        roomId: selectedRoom.id,
        schoolYear: '2025–2026',
        students,
        monthlyRent: selectedRoom.monthlyRent,
        fixedCosts: selectedRoom.fixedCosts,
        studentTax: selectedRoom.studentTax,
      })
```

- [ ] **Step 4: Add the snapshot fields to the Supabase insert with a fallback**

In `src/lib/data.ts`, replace lines 891-905:

```ts
  const { data: insertedContract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: primaryStudent.id,
      second_student_id: students[1]?.id ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (contractError) throw contractError
  return (insertedContract as ContractRow).id
}
```

with:

```ts
  const { data: insertedContract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: primaryStudent.id,
      second_student_id: students[1]?.id ?? null,
      status: 'draft',
      monthly_rent: input.monthlyRent,
      fixed_costs: input.fixedCosts,
      student_tax: input.studentTax,
    })
    .select()
    .single()

  if (isMissingColumnError(contractError)) {
    const { data: fallbackContract, error: fallbackError } = await supabase
      .from('contracts')
      .insert({
        room_id: input.roomId,
        school_year: input.schoolYear,
        student_id: primaryStudent.id,
        second_student_id: students[1]?.id ?? null,
        status: 'draft',
      })
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return (fallbackContract as ContractRow).id
  }

  if (contractError) throw contractError
  return (insertedContract as ContractRow).id
}
```

- [ ] **Step 5: Run tests to verify the baseline is still green**

Run: `npm run test:run -- ContractNewPage.test.tsx`
Expected: PASS (10/10)

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data.ts src/pages/ContractNewPage.tsx
git commit -m "feat(contracts): snapshot room rates onto new contracts at creation time"
```

---

### Task 6: `createContractRenewal`

**Files:**
- Modify: `src/lib/data.ts` (insert after `updateContractStatus`, currently ending at line 930)
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

Add `createContractRenewal` to the import from `'../lib/data'` in `src/__tests__/data.test.ts`:

```ts
import { createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, nextSchoolYear, saveInspectionCategories } from '../lib/data'
```

```ts
describe('createContractRenewal', () => {
  it('doet niets en geeft null terug in demo-modus', async () => {
    await expect(createContractRenewal({
      previousContractId: 'c1',
      roomId: 'r1',
      schoolYear: '2026–2027',
      monthlyRent: 450,
      fixedCosts: 60,
      studentTax: 12,
    })).resolves.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- data.test.ts`
Expected: FAIL — `createContractRenewal` is not exported from `'../lib/data'`.

- [ ] **Step 3: Implement `CreateContractRenewalInput` and `createContractRenewal`**

In `src/lib/data.ts`, immediately after the closing brace of `updateContractStatus` (currently line 930):

```ts
export async function updateContractStatus(contractId: string, status: Contract['status']): Promise<void> {
  // ... existing body ...
  if (error) throw error
}
```

insert:

```ts

export interface CreateContractRenewalInput {
  previousContractId: string
  roomId: string
  schoolYear: string
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}

export async function createContractRenewal(input: CreateContractRenewalInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const [contracts, rooms] = await Promise.all([getContracts(), getRooms()])

  const previous = contracts.find(c => c.id === input.previousContractId)
  if (!previous) throw new Error('Vorig contract niet gevonden')

  const room = rooms.find(r => r.id === input.roomId)
  if (!room) throw new Error('Kamer niet gevonden')

  if (
    room.monthlyRent !== input.monthlyRent ||
    room.fixedCosts !== input.fixedCosts ||
    room.studentTax !== input.studentTax
  ) {
    await updateRoomData({
      ...room,
      monthlyRent: input.monthlyRent,
      fixedCosts: input.fixedCosts,
      studentTax: input.studentTax,
    })
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: previous.studentId,
      second_student_id: previous.secondStudentId ?? null,
      status: 'draft',
      monthly_rent: input.monthlyRent,
      fixed_costs: input.fixedCosts,
      student_tax: input.studentTax,
    })
    .select()
    .single()

  if (isMissingColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('contracts')
      .insert({
        room_id: input.roomId,
        school_year: input.schoolYear,
        student_id: previous.studentId,
        second_student_id: previous.secondStudentId ?? null,
        status: 'draft',
      })
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return (fallbackData as ContractRow).id
  }

  if (error) throw error
  return (data as ContractRow).id
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- data.test.ts`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: no errors. (`updateRoomData`, `isMissingColumnError`, `getRooms`, `getContracts`, `ContractRow` are all already defined earlier in `data.ts`.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(contracts): add createContractRenewal"
```

---

### Task 7: Rewrite `ContractRenewPage.tsx`

**Files:**
- Modify: `src/pages/ContractRenewPage.tsx` (full rewrite)
- Test: `src/__tests__/ContractRenewPage.test.tsx` (full rewrite)

- [ ] **Step 1: Run the existing tests to confirm current green baseline**

Run: `npm run test:run -- ContractRenewPage.test.tsx`
Expected: PASS (4/4) — this is the baseline before the rewrite.

- [ ] **Step 2: Replace `src/__tests__/ContractRenewPage.test.tsx` with the new test file**

Write the full file content:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractRenewPage from '../pages/ContractRenewPage'
import { createContractRenewal, getAvailableRoomsForRenewal } from '../lib/data'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    getAvailableRoomsForRenewal: vi.fn(actual.getAvailableRoomsForRenewal),
    createContractRenewal: vi.fn(actual.createContractRenewal),
  }
})

function renderPage(initialPath = '/contracts/c1/renew') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/contracts/:id/renew" element={<ContractRenewPage />} />
        <Route path="/contracts/:id" element={<div>Contract detail</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContractRenewPage', () => {
  it('toont vooraf ingevulde contractgegevens', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Emma Janssen' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('450')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
  })

  it('toont het automatisch berekende volgende schooljaar als alleen-lezen veld', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Nieuw schooljaar')).toBeInTheDocument()
    expect(screen.getByText('2026–2027')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nieuw schooljaar')).not.toBeInTheDocument()
  })

  it('toont een kamer-select met de huidige kamer als standaard, wijzigen herlaadt de bedragvelden', async () => {
    renderPage()

    const roomSelect = (await screen.findByLabelText('Kamer')) as HTMLSelectElement
    expect(roomSelect.value).toBe('r1')

    fireEvent.change(roomSelect, { target: { value: 'r3' } })

    expect(screen.getByLabelText('Huurprijs')).toHaveValue(550)
    expect(screen.getByLabelText('Vaste kosten')).toHaveValue(80)
    expect(screen.getByLabelText('Studentenbelasting')).toHaveValue(12)
  })

  it('gaat naar overzicht na Volgende', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))

    expect(screen.getByRole('heading', { name: 'Nieuwe verlenging' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verlenging versturen/i })).toBeInTheDocument()
  })

  it('neemt gewijzigde huurprijs mee naar overzicht', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Huurprijs'), { target: { value: '499' } })
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(screen.getByText('€ 499/maand')).toBeInTheDocument()
  })

  it('blokkeert Volgende als verplicht bedrag leeg is', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Huurprijs'), { target: { value: '' } })

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('toont een melding en blokkeert Volgende wanneer er geen beschikbare kamers zijn', async () => {
    vi.mocked(getAvailableRoomsForRenewal).mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText('Geen beschikbare kamers voor het volgende schooljaar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('roept createContractRenewal aan met de verwachte payload en navigeert naar het nieuwe contract', async () => {
    vi.mocked(createContractRenewal).mockResolvedValueOnce('c-new-99')

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /verlenging versturen/i }))

    expect(await screen.findByText('Contract detail')).toBeInTheDocument()
    expect(createContractRenewal).toHaveBeenCalledWith({
      previousContractId: 'c1',
      roomId: 'r1',
      schoolYear: '2026–2027',
      monthlyRent: 450,
      fixedCosts: 60,
      studentTax: 12,
    })
  })

  it('toont een laadstatus wanneer createContractRenewal null teruggeeft (demo-modus)', async () => {
    vi.mocked(createContractRenewal).mockResolvedValueOnce(null)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /verlenging versturen/i }))

    expect(await screen.findByText('Wordt verstuurd...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:run -- ContractRenewPage.test.tsx`
Expected: FAIL — multiple failures (no `aria-label="Kamer"` element, no "Nieuw schooljaar" readonly text, `createContractRenewal`/`getAvailableRoomsForRenewal` not called by the current page, etc.)

- [ ] **Step 4: Replace `src/pages/ContractRenewPage.tsx` with the new implementation**

Write the full file content:

```tsx
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react'
import StepIndicator from './wizard/StepIndicator'
import { createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, nextSchoolYear } from '../lib/data'
import { cn } from '../lib/cn'
import type { Contract, Property, Room, Student } from '../types'

interface RenewForm {
  roomId: string
  monthlyRent: string
  fixedCosts: string
  studentTax: string
}

const STEPS = ['Gegevens', 'Overzicht']

export default function ContractRenewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<{
    contract: Contract
    room: Room
    student: Student
    property: Property
  } | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [isSending, setIsSending] = useState(false)
  const [form, setForm] = useState<RenewForm>({
    roomId: '',
    monthlyRent: '',
    fixedCosts: '',
    studentTax: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadContract() {
      setLoading(true)
      setError(null)
      try {
        const nextBundle = await getContractBundleData(id)
        if (cancelled) return
        setBundle(nextBundle)
        if (nextBundle) {
          const upcomingSchoolYear = nextSchoolYear(nextBundle.contract.schoolYear)
          const rooms = await getAvailableRoomsForRenewal(nextBundle.property.id, upcomingSchoolYear, nextBundle.contract.id)
          if (cancelled) return
          setAvailableRooms(rooms)
          const defaultRoom = rooms.find(room => room.id === nextBundle.room.id) ?? rooms[0]
          setForm({
            roomId: defaultRoom?.id ?? '',
            monthlyRent: String(defaultRoom?.monthlyRent ?? nextBundle.room.monthlyRent),
            fixedCosts: String(defaultRoom?.fixedCosts ?? nextBundle.room.fixedCosts),
            studentTax: String(defaultRoom?.studentTax ?? nextBundle.room.studentTax),
          })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Contract kon niet geladen worden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContract()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Contract laden...</div>
  }

  if (error) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error}</div>
  }

  if (!bundle) return <Navigate to="/" replace />

  const { contract, room, student, property } = bundle
  const upcomingSchoolYear = nextSchoolYear(contract.schoolYear)
  const selectedRoom = availableRooms.find(availableRoom => availableRoom.id === form.roomId)

  function updateField<K extends keyof RenewForm>(field: K, value: RenewForm[K]) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleRoomChange(roomId: string) {
    const selected = availableRooms.find(availableRoom => availableRoom.id === roomId)
    if (!selected) return
    setForm({
      roomId: selected.id,
      monthlyRent: String(selected.monthlyRent),
      fixedCosts: String(selected.fixedCosts),
      studentTax: String(selected.studentTax),
    })
  }

  function canProceed() {
    return Boolean(form.roomId && form.monthlyRent && form.fixedCosts && form.studentTax)
  }

  async function handleNext() {
    if (!canProceed()) return
    if (step === 1) {
      setStep(2)
      return
    }

    setIsSending(true)
    try {
      const newContractId = await createContractRenewal({
        previousContractId: contract.id,
        roomId: form.roomId,
        schoolYear: upcomingSchoolYear,
        monthlyRent: Number(form.monthlyRent),
        fixedCosts: Number(form.fixedCosts),
        studentTax: Number(form.studentTax),
      })
      if (newContractId) {
        navigate(`/contracts/${newContractId}`, { state: { savedDraft: true } })
      } else {
        window.setTimeout(() => navigate('/'), 1200)
      }
    } catch (err) {
      setIsSending(false)
      setError(err instanceof Error ? err.message : 'Verlenging opslaan mislukt')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 backdrop-blur-xl">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contract verlengen</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Kamer {room.roomNumber}, {property.name}
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Alleen verlenggegevens zijn bewerkbaar
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <ReadonlyField label="Student" value={`${student.firstName} ${student.lastName}`} />
                  <ReadonlyField label="Huidig schooljaar" value={contract.schoolYear} />
                </div>
                <ReadonlyField label="Nieuw schooljaar" value={upcomingSchoolYear} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <div className="grid gap-3">
                {availableRooms.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    Geen beschikbare kamers voor het volgende schooljaar.
                  </p>
                ) : (
                  <label className="grid gap-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Kamer</span>
                    <select
                      aria-label="Kamer"
                      value={form.roomId}
                      onChange={event => handleRoomChange(event.target.value)}
                      className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {availableRooms.map(availableRoom => (
                        <option key={availableRoom.id} value={availableRoom.id}>
                          Kamer {availableRoom.roomNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MoneyField
                    label="Huurprijs"
                    value={form.monthlyRent}
                    onChange={value => updateField('monthlyRent', value)}
                  />
                  <MoneyField
                    label="Vaste kosten"
                    value={form.fixedCosts}
                    onChange={value => updateField('fixedCosts', value)}
                  />
                  <MoneyField
                    label="Studentenbelasting"
                    value={form.studentTax}
                    onChange={value => updateField('studentTax', value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overzicht</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Nieuwe verlenging</h1>
            </div>

            <SummaryCard
              rows={[
                ['Student', `${student.firstName} ${student.lastName}`],
                ['Pand', property.name],
                ['Kamer', selectedRoom?.roomNumber ?? room.roomNumber],
                ['Schooljaar', upcomingSchoolYear],
                ['Huurprijs', `€ ${form.monthlyRent}/maand`],
                ['Vaste kosten', `€ ${form.fixedCosts}/maand`],
                ['Studentenbelasting', `€ ${form.studentTax}/maand`],
              ]}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Terug"
          onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
          disabled={isSending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/60 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={15} />
          Terug
        </button>
        <button
          type="button"
          aria-label={step === 2 ? 'Verlenging versturen' : 'Volgende'}
          onClick={handleNext}
          disabled={!canProceed() || isSending}
          className={cn(
            'btn-primary flex flex-[2] items-center justify-center gap-2 py-3 text-sm transition-opacity',
            (!canProceed() || isSending) && 'cursor-not-allowed opacity-50',
          )}
        >
          {isSending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt verstuurd...
            </>
          ) : step === 2 ? (
            <>
              Verlenging versturen
              <Send size={15} />
            </>
          ) : (
            <>
              Volgende
              <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/45 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        aria-label={label}
        type="number"
        min="0"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  )
}

function SummaryCard({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-slate-100/70 py-2 last:border-0">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <span className="text-right text-sm font-bold text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- ContractRenewPage.test.tsx`
Expected: PASS (9/9)

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ContractRenewPage.tsx src/__tests__/ContractRenewPage.test.tsx
git commit -m "feat(contracts): real contract renewal flow with room selection"
```

---

### Task 8: `ContractDetailPage.tsx` — effective price values

**Files:**
- Modify: `src/pages/ContractDetailPage.tsx:89` and `:348-358`
- Test: `src/__tests__/ContractDetailPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/ContractDetailPage.test.tsx`, add `getContractBundleData` to the import from `'../lib/data'` and add a `vi.mock` block right after the imports:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractDetailPage from '../pages/ContractDetailPage'
import { getContractBundleData } from '../lib/data'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    getContractBundleData: vi.fn(actual.getContractBundleData),
  }
})
```

Add two new tests at the end of the `describe('ContractDetailPage', ...)` block (before the final closing `})`):

```tsx
  it('valt terug op de huidige kamerprijzen wanneer het contract geen eigen snapshot heeft', async () => {
    const base = await getContractBundleData('c1')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      contract: { ...base!.contract, monthlyRent: undefined, fixedCosts: undefined, studentTax: undefined },
    })

    renderPage()

    expect(await screen.findByText('€ 450/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 60/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 12/maand')).toBeInTheDocument()
  })

  it('toont de eigen snapshotwaarden van het contract i.p.v. de huidige kamerprijzen', async () => {
    const base = await getContractBundleData('c1')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      contract: { ...base!.contract, monthlyRent: 500, fixedCosts: 75, studentTax: 15 },
    })

    renderPage()

    expect(await screen.findByText('€ 500/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 75/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 15/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 900')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- ContractDetailPage.test.tsx`
Expected: FAIL on the second new test — `screen.findByText('€ 500/maand')` not found, because the page currently always renders `room.monthlyRent` (450), ignoring `contract.monthlyRent`.

- [ ] **Step 3: Compute and use the effective values**

In `src/pages/ContractDetailPage.tsx`, replace line 89:

```tsx
  const { contract, room, student, secondStudent, property, startInspection, startInspectionItems, endInspection, landlord } = bundle
```

with:

```tsx
  const { contract, room, student, secondStudent, property, startInspection, startInspectionItems, endInspection, landlord } = bundle
  const effectiveMonthlyRent = contract.monthlyRent ?? room.monthlyRent
  const effectiveFixedCosts = contract.fixedCosts ?? room.fixedCosts
  const effectiveStudentTax = contract.studentTax ?? room.studentTax
```

Then replace lines 348-358:

```tsx
            <InfoCard
              icon={Home}
              title="Contract"
              rows={[
                ['Schooljaar', contract.schoolYear],
                ['Huurprijs', `€ ${room.monthlyRent}/maand`],
                ['Vaste kosten', `€ ${room.fixedCosts}/maand`],
                ['Studentenbelasting', `€ ${room.studentTax}/maand`],
                ['Waarborg', `€ ${room.deposit}`],
              ]}
            />
```

with:

```tsx
            <InfoCard
              icon={Home}
              title="Contract"
              rows={[
                ['Schooljaar', contract.schoolYear],
                ['Huurprijs', `€ ${effectiveMonthlyRent}/maand`],
                ['Vaste kosten', `€ ${effectiveFixedCosts}/maand`],
                ['Studentenbelasting', `€ ${effectiveStudentTax}/maand`],
                ['Waarborg', `€ ${room.deposit}`],
              ]}
            />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- ContractDetailPage.test.tsx`
Expected: PASS (all tests, including the existing `'toont student, kamer en contractgegevens'` which still expects `'€ 450/maand'` for `c1`)

- [ ] **Step 5: Commit**

```bash
git add src/pages/ContractDetailPage.tsx src/__tests__/ContractDetailPage.test.tsx
git commit -m "feat(contracts): show contract price snapshot on contract detail page"
```

---

### Task 9: `pdfDocuments.ts` — effective price values in the contract PDF

**Files:**
- Modify: `src/lib/pdfDocuments.ts:173`, `:268-270`, `:285`, `:335`
- Test: `src/__tests__/pdfDocuments.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/pdfDocuments.test.ts`, add a new describe block (e.g. after the existing `describe('generateContractHtml', ...)` block):

```ts
describe('generateContractHtml — prijssnapshot per contract', () => {
  it('gebruikt de eigen contractwaarden i.p.v. de huidige kamerprijzen wanneer aanwezig', () => {
    const html = generateContractHtml({
      ...mockBundle,
      contract: { ...CONTRACTS[0], monthlyRent: 500, fixedCosts: 75, studentTax: 15 },
    })

    expect(html).toContain('€ 500,00 per maand')
    expect(html).toContain('Vaste kosten per maand: € 75,00')
    expect(html).toContain('Studentenbelasting (Stad Gent): € 15,00 per maand')
    expect(html).toContain('2 × € 500,00')
    expect(html).toContain('€ 1000,00')
  })

  it('valt terug op de huidige kamerprijzen wanneer het contract geen snapshot heeft', () => {
    const html = generateContractHtml({
      ...mockBundle,
      contract: { ...CONTRACTS[0], monthlyRent: undefined, fixedCosts: undefined, studentTax: undefined },
    })

    expect(html).toContain(`€ ${ROOMS[0].monthlyRent},00 per maand`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- pdfDocuments.test.ts`
Expected: FAIL on the first new test — the generated HTML contains `'€ 450,00 per maand'` (from `room.monthlyRent`), not `'€ 500,00 per maand'`.

- [ ] **Step 3: Compute and use effective values in `generateContractHtml`**

In `src/lib/pdfDocuments.ts`, replace line 173:

```ts
  const totalMonthly = room.monthlyRent + room.fixedCosts
```

with:

```ts
  const effectiveMonthlyRent = contract.monthlyRent ?? room.monthlyRent
  const effectiveFixedCosts = contract.fixedCosts ?? room.fixedCosts
  const effectiveStudentTax = contract.studentTax ?? room.studentTax
  const totalMonthly = effectiveMonthlyRent + effectiveFixedCosts
```

Replace lines 268-270:

```ts
  De huurprijs bedraagt <strong>€ ${room.monthlyRent},00 per maand</strong>.<br/>
  Vaste kosten per maand: € ${room.fixedCosts},00 (water, elektriciteit, verwarming en internet).<br/>
  Studentenbelasting (${escapeHtml(studentTaxAuthority)}): € ${room.studentTax},00 per maand.<br/>
```

with:

```ts
  De huurprijs bedraagt <strong>€ ${effectiveMonthlyRent},00 per maand</strong>.<br/>
  Vaste kosten per maand: € ${effectiveFixedCosts},00 (water, elektriciteit, verwarming en internet).<br/>
  Studentenbelasting (${escapeHtml(studentTaxAuthority)}): € ${effectiveStudentTax},00 per maand.<br/>
```

Replace line 285:

```ts
  De huurwaarborg bedraagt <strong>€ ${room.deposit},00</strong> (twee maanden huurprijs: 2 × € ${room.monthlyRent},00)
```

with:

```ts
  De huurwaarborg bedraagt <strong>€ ${room.deposit},00</strong> (twee maanden huurprijs: 2 × € ${effectiveMonthlyRent},00)
```

Replace line 335:

```ts
  vergoeding van twee maanden huur (€ ${room.monthlyRent * 2},00) verschuldigd.
```

with:

```ts
  vergoeding van twee maanden huur (€ ${effectiveMonthlyRent * 2},00) verschuldigd.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- pdfDocuments.test.ts`
Expected: PASS (including the existing `'bevat de huurprijs'` test, which still finds `'450'` for `mockBundle` since `CONTRACTS[0].monthlyRent === ROOMS[0].monthlyRent === 450`)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdfDocuments.ts src/__tests__/pdfDocuments.test.ts
git commit -m "feat(contracts): use contract price snapshot in generated PDF"
```

---

### Task 10: Supabase migration + `staging-bootstrap.sql`

**Files:**
- Create: `supabase/migrations/20260611020000_contract_rent_snapshot.sql`
- Modify: `supabase/staging-bootstrap.sql:49-64`

- [ ] **Step 1: Create the migration file**

Write `supabase/migrations/20260611020000_contract_rent_snapshot.sql`:

```sql
alter table contracts
  add column if not exists monthly_rent numeric,
  add column if not exists fixed_costs numeric,
  add column if not exists student_tax numeric;

-- Bestaande contracten bevriezen op de huidige kamerprijzen, zodat ze vanaf nu
-- onveranderlijk zijn ook al wijzigen de kamerprijzen later.
update contracts c
set monthly_rent = r.monthly_rent,
    fixed_costs = r.fixed_costs,
    student_tax = r.student_tax
from rooms r
where c.room_id = r.id
  and c.monthly_rent is null;
```

- [ ] **Step 2: Mirror the new columns in `staging-bootstrap.sql`**

In `supabase/staging-bootstrap.sql`, replace lines 49-64:

```sql
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
  signed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);
```

with:

```sql
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
  monthly_rent numeric(10,2),
  fixed_costs numeric(10,2),
  student_tax numeric(10,2),
  status text check (status in ('draft','sent','signed')) default 'draft',
  signed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);
```

- [ ] **Step 3: Apply the migration to Supabase staging via MCP**

Use `mcp__supabase__apply_migration` with project ref `tsieqsxzjrfnevcrbswg`, name `contract_rent_snapshot`, and the SQL from Step 1.

- [ ] **Step 4: Verify**

Use `mcp__supabase__list_migrations` (project ref `tsieqsxzjrfnevcrbswg`) and confirm `contract_rent_snapshot` is listed. Optionally `mcp__supabase__execute_sql` with `select id, monthly_rent, fixed_costs, student_tax from contracts limit 5;` to confirm the backfill ran.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260611020000_contract_rent_snapshot.sql supabase/staging-bootstrap.sql
git commit -m "feat(contracts): add price snapshot columns to contracts table"
```

---

### Task 11: Final regression run + memory update

**Files:**
- None (verification + memory only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all test files pass (the previously-known flaky `InspectionNewPage.test.tsx` "toont een aantal-stepper voor Sleutels" timeout is environmental and unrelated — if it times out alone, re-run just that file to confirm it passes in isolation).

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Update the memory file**

Update `C:\Users\vince\.claude\projects\C--shit-bezig-kotklusser-kotstart-kotstartgit\memory\kotstart-aanpassingen-clusters.md`: mark contractverlenging (price snapshot, `getAvailableRoomsForRenewal`, `createContractRenewal`, `ContractRenewPage` rewrite) as ✅ done, and update the "Recommended order" / open-decisions notes accordingly.

- [ ] **Step 4: Final commit (if anything is left uncommitted)**

```bash
git status
```

If everything from Tasks 1-10 was already committed per-task, this step is just a confirmation — no new commit needed.

---

## Self-Review

**Spec coverage (design doc §1-9):**
- §1 datamodel snapshot (types, migration, `mapContract`, `createContractDraft`) → Tasks 1, 3, 5, 10 ✅
- §2 `SCHOOL_YEARS` extension → Task 1 ✅
- §3 `ROOM_CAPACITY`/`isRoomAvailable`/`getAvailableRoomsForRenewal` → Task 4 ✅
- §4 `ContractRenewPage` rewrite (read-only schoolyear, room select, reload rates on room change, empty-rooms message) → Task 7 ✅
- §5 `createContractRenewal` (room update side-effect, draft status, student carry-over, fallback) → Task 6 ✅
- §6 effective values in `ContractDetailPage` and `pdfDocuments` → Tasks 8, 9 ✅
- §7 mockData `CONTRACTS` snapshot values → Task 1 ✅
- §8 test coverage (data.test.ts, ContractRenewPage, ContractDetailPage, pdfDocuments) → Tasks 1, 2, 4, 6, 7, 8, 9 ✅
- §9 error handling (empty rooms list → blocking message; `createContractRenewal` throws on missing previous contract/room → caught by `setError`; demo mode returns `null` without mutation) → Tasks 6, 7 ✅

**Placeholder scan:** no "TBD"/"TODO"/"add error handling" placeholders — every step has full code.

**Type/signature consistency:**
- `RenewForm = { roomId: string; monthlyRent: string; fixedCosts: string; studentTax: string }` — defined in Task 7, used consistently throughout Task 7's component.
- `CreateContractRenewalInput = { previousContractId, roomId, schoolYear, monthlyRent, fixedCosts, studentTax }` (Task 6) — matches the call in Task 7's `handleNext`.
- `getAvailableRoomsForRenewal(propertyId, schoolYear, currentContractId): Promise<Room[]>` (Task 4) — matches the call in Task 7's `loadContract`.
- `nextSchoolYear(current: string): string`, exported in Task 2 — used in Tasks 4 (test only, indirectly) and 7.
- `Contract.monthlyRent?/fixedCosts?/studentTax?: number` (Task 1) — consumed via `?? room.X` fallback in Tasks 8 and 9 with identical variable names (`effectiveMonthlyRent`/`effectiveFixedCosts`/`effectiveStudentTax`).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-11-contract-verlenging.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
