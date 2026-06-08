# Cluster D — Tweede persoon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the second resident of a double room a full, visible participant in the contract — resolved end-to-end from data layer through dashboard, contract detail, PDF/HTML and email — and remove the misplaced/dead "Stap 3 — Partij" wizard step (second landlord, second tenant, generic guardian), relocating guardian data to per-student fields collected in Step 2.

**Architecture:** This is a vertical-slice change across the existing layers (types → wizard form/types → wizard steps → mock data → data access → presentation pages → PDF), following the existing mock/Supabase dual-mode pattern in `src/lib/data.ts`. No new architectural concepts are introduced — guardian fields move from a contract-level shared field to per-student fields (mirroring how `institution`/`faculty` already live on `Student`), and the wizard shrinks from 4 steps to 3.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS, Vitest + Testing Library, Supabase (Postgres) — but all tests run against in-memory mock data (`src/lib/mockData.ts`) since `isSupabaseConfigured` is forced `false` in test mode.

---

## File Structure

| File | Responsibility / change |
|------|-------------------------|
| `src/types/index.ts` | Domain types: drop `secondLandlord*`/`guardian*` from `Contract`, add `guardian*` to `Student`, add `secondFirstName`/`secondLastName` to `StudentDashboardRow` |
| `supabase/migrations/20260607130000_second_student_guardian.sql` | New migration: add `guardian_*` columns to `students`, drop `second_landlord_*`/`guardian_*` from `contracts` |
| `src/pages/wizard/types.ts` | `StudentFormData` gains `guardianName?`/`guardianEmail?`/`guardianPhone?`; `SecondPartyData`/`GuardianData` removed |
| `src/pages/wizard/Step2Student.tsx` | New "Voogd" subsection per minor student |
| `src/pages/wizard/Step4Review.tsx` | Embed guardian info in student card; remove second-landlord/second-tenant/guardian cards and props |
| `src/pages/wizard/Step3SecondParty.tsx` | **Deleted** (and its test) |
| `src/pages/ContractNewPage.tsx` | 3-step wizard, `emptyStudent`/`studentIsComplete` updated, `createContractDraft` payload simplified |
| `src/lib/mockData.ts` | `c-demo-student` gets a `secondStudentId` pointing to a new minor student with guardian data; `getDashboardRows` resolves combined names |
| `src/lib/data.ts` | `StudentRow`/`ContractRow`/`ContractDraftStudent`/`CreateContractDraftInput` updated; `mapStudent`/`mapContract`/`createContractDraft`/`getContractBundleData`/`buildDashboardRows` updated |
| `src/pages/components/StudentRow.tsx` | Show combined name when a second student is present |
| `src/lib/pdfDocuments.ts` | New `renderHuurderInfoBlock` helper; "HUURDER"/"HUURDERS" + one or two full info blocks |
| `src/pages/ContractDetailPage.tsx` | Two stacked student headers, `secondStudent` in send/print bundles, dual email send, combined status message |
| `src/__tests__/data.test.ts` | **New** — isolated tests for `getContractBundleData`/`getDashboardRowsData` second-student resolution |

---

## Task 1: Domain types & database migration

**Files:**
- Modify: `src/types/index.ts:53-66` (Contract), `:19-36` (Student), `:86-92` (StudentDashboardRow)
- Create: `supabase/migrations/20260607130000_second_student_guardian.sql`

This task is pure type/schema work with no test surface of its own (TypeScript type changes aren't checked by Vitest — `npm run build` runs `tsc -b` separately). We make the edits and verify the existing suite still passes (mock data does not yet populate the new fields, so nothing should break).

- [ ] **Step 1: Update `Contract`, `Student`, and `StudentDashboardRow` in `src/types/index.ts`**

Replace the `Student` interface (lines 19-36):

```ts
export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl?: string
  institution?: string
  faculty?: string
  studentNumber?: string
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  createdAt: string
}
```

Replace the `Contract` interface (lines 53-66):

```ts
export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
}
```

Replace the `StudentDashboardRow` interface (lines 86-92):

```ts
export interface StudentDashboardRow {
  studentId: string
  firstName: string
  lastName: string
  roomNumber: string
  contractId: string
  secondFirstName?: string
  secondLastName?: string
}
```

- [ ] **Step 2: Create the migration file**

Create `supabase/migrations/20260607130000_second_student_guardian.sql`:

```sql
alter table students
  add column guardian_name  text,
  add column guardian_email text,
  add column guardian_phone text;

alter table contracts
  drop column second_landlord_name,
  drop column second_landlord_email,
  drop column guardian_name,
  drop column guardian_email,
  drop column guardian_phone;
```

- [ ] **Step 3: Run the existing test suite to confirm nothing breaks yet**

Run: `npm run test:run`
Expected: All 104 existing tests still PASS (type-only changes aren't checked by Vitest's esbuild transpilation; later tasks will update the consumers).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts supabase/migrations/20260607130000_second_student_guardian.sql
git commit -m "feat(types): move guardian fields to Student, drop dead second-landlord/guardian contract fields"
```

---

## Task 2: Wizard form types — relocate guardian to per-student

**Files:**
- Modify: `src/pages/wizard/types.ts:1-27`

- [ ] **Step 1: Replace `StudentFormData` and remove `SecondPartyData`/`GuardianData`**

Replace lines 1-27 of `src/pages/wizard/types.ts`:

```ts
export interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
  institution: string
  faculty: string
  studentNumber: string
  residenceStreet: string
  residenceNumber: string
  residenceBox: string
  residencePostalCode: string
  residenceCity: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
}
```

(`SecondPartyData` and `GuardianData` are deleted entirely — the rest of the file, starting at `parseDateOfBirth`, is unchanged.)

- [ ] **Step 2: Run the test suite**

Run: `npm run test:run`
Expected: All tests still PASS. (`Step3SecondParty.test.tsx`, `Step4Review.test.tsx` and `ContractNewPage.tsx` still reference the now-removed `SecondPartyData`/`GuardianData` types via `import { type ... }`, but esbuild elides type-only imports without checking they exist, so nothing fails at runtime yet — Tasks 3-5 clean these up.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/wizard/types.ts
git commit -m "feat(wizard): move guardian fields onto StudentFormData, remove SecondPartyData/GuardianData"
```

---

## Task 3: Step 2 — guardian subsection for minors

**Files:**
- Modify: `src/pages/wizard/Step2Student.tsx`
- Test: `src/__tests__/Step2Student.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/Step2Student.test.tsx`, inside the `describe('Step2Student', ...)` block (after the existing tests, before the closing `})`):

```tsx
  it('toont voogd-subsectie enkel bij minderjarigheid', () => {
    const { rerender } = render(
      <Step2Student students={[{ ...emptyStudent, dateOfBirth: '2004-03-14' }]} onChange={vi.fn()} />,
    )
    expect(screen.queryByText('Voogd')).not.toBeInTheDocument()

    rerender(<Step2Student students={[{ ...emptyStudent, dateOfBirth: '2015-01-01' }]} onChange={vi.fn()} />)
    expect(screen.getByText('Voogd')).toBeInTheDocument()
    expect(screen.getByLabelText(/naam voogd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail voogd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/telefoon voogd/i)).toBeInTheDocument()
  })

  it('valideert het e-mailformaat van de voogd na blur', () => {
    render(
      <Step2Student
        students={[{ ...emptyStudent, dateOfBirth: '2015-01-01', guardianEmail: 'geen-email' }]}
        onChange={vi.fn()}
      />,
    )
    fireEvent.blur(screen.getByLabelText(/e-mail voogd/i))
    expect(screen.getByText(/geldig e-mailadres/i)).toBeInTheDocument()
  })

  it('markeert naam en e-mail van de voogd als verplicht bij minderjarigheid', () => {
    render(
      <Step2Student students={[{ ...emptyStudent, dateOfBirth: '2015-01-01' }]} onChange={vi.fn()} />,
    )
    fireEvent.blur(screen.getByLabelText(/naam voogd/i))
    fireEvent.blur(screen.getByLabelText(/e-mail voogd/i))
    expect(screen.getAllByText('Dit veld is verplicht')).toHaveLength(2)
  })
```

Add `fireEvent` to the existing import on line 2 (it's already imported — verify `import { fireEvent, render, screen } from '@testing-library/react'`; if not present, add `fireEvent`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/Step2Student.test.tsx`
Expected: FAIL — `screen.queryByText('Voogd')` / `getByLabelText(/naam voogd/i)` etc. cannot find the elements (the subsection doesn't exist yet).

- [ ] **Step 3: Add the `GUARDIAN_FIELDS` config and extend `fieldError`**

In `src/pages/wizard/Step2Student.tsx`, add a new field-config array after `RESIDENCE_FIELDS` (after line 48):

```ts
const GUARDIAN_FIELDS: TextField[] = [
  { field: 'guardianName', label: 'Naam voogd', type: 'text', required: true },
  { field: 'guardianEmail', label: 'E-mail voogd', type: 'email', required: true },
  { field: 'guardianPhone', label: 'Telefoon voogd', type: 'tel', required: false },
]
```

Replace the `fieldError` function (lines 50-60) to also validate `guardianEmail`'s format:

```ts
function fieldError(student: StudentFormData, field: keyof StudentFormData, required: boolean): string | null {
  if ((field === 'email' || field === 'guardianEmail') && student[field] && !isValidEmail(student[field] as string)) {
    return 'Vul een geldig e-mailadres in'
  }
  if (field === 'dateOfBirth' && student.dateOfBirth && !isValidDateOfBirth(student.dateOfBirth)) {
    return 'Gebruik formaat dd-mm-jjjj'
  }
  if (field === 'residencePostalCode' && student.residencePostalCode && !isValidBelgianPostalCode(student.residencePostalCode)) {
    return 'Gebruik 4 cijfers (bijv. 9000)'
  }
  if (required && !student[field]) return 'Dit veld is verplicht'
  return null
}
```

- [ ] **Step 4: Add the "Voogd" subsection to `StudentForm`**

In `StudentForm` (around line 198-203), the minor-warning text currently says "in de volgende stap" — that becomes incorrect once the guardian fields move into this same step, so update its wording too. Replace lines 198-203:

```tsx
      {minor && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-700">
          <AlertCircle size={13} />
          Minderjarig — voogdgegevens worden hieronder gevraagd
        </div>
      )}

      {minor && (
        <div className="flex flex-col gap-3 border-t border-white/60 pt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Voogd</p>
          {GUARDIAN_FIELDS.map(config => (
            <TextInput
              key={config.field}
              student={student}
              index={index}
              config={config}
              touched={Boolean(touched[config.field])}
              onTouch={() => onTouch(config.field)}
              onChange={onChange}
            />
          ))}
        </div>
      )}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/Step2Student.test.tsx`
Expected: PASS — all tests in the file green, including the three new ones.

- [ ] **Step 6: Run the full suite**

Run: `npm run test:run`
Expected: All tests PASS (no regressions elsewhere).

- [ ] **Step 7: Commit**

```bash
git add src/pages/wizard/Step2Student.tsx src/__tests__/Step2Student.test.tsx
git commit -m "feat(wizard): collect guardian data per minor student in Step 2"
```

---

## Task 4: Step 4 — embed guardian in student card, remove second-party sections

**Files:**
- Modify: `src/pages/wizard/Step4Review.tsx`
- Test: `src/__tests__/Step4Review.test.tsx`

- [ ] **Step 1: Rewrite the failing/changed tests**

Replace the entire content of `src/__tests__/Step4Review.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROOMS } from '../lib/mockData'
import Step4Review from '../pages/wizard/Step4Review'
import type { StudentFormData } from '../pages/wizard/types'

const room = ROOMS[0]
const student: StudentFormData = {
  firstName: 'Emma',
  lastName: 'Janssen',
  email: 'emma@ugent.be',
  phone: '0470 11 22 33',
  dateOfBirth: '2004-03-14',
  photoUrl: null,
  institution: 'Universiteit Gent',
  faculty: '',
  studentNumber: '202400001',
  residenceStreet: '',
  residenceNumber: '',
  residenceBox: '',
  residencePostalCode: '',
  residenceCity: '',
}

const minorStudent: StudentFormData = {
  ...student,
  dateOfBirth: '2015-01-01',
  guardianName: 'Sofie Janssen',
  guardianEmail: 'sofie@example.be',
  guardianPhone: '0470 00 00 00',
}

describe('Step4Review', () => {
  it('toont kamerdetails', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText(/€ 450/)).toBeInTheDocument()
  })

  it('toont studentnaam', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont voogdgegevens ingebed in de studentkaart bij minderjarigheid', () => {
    render(<Step4Review room={room} students={[minorStudent]} />)

    expect(screen.getByText('Voogd')).toBeInTheDocument()
    expect(screen.getByText('Sofie Janssen')).toBeInTheDocument()
    expect(screen.getByText('sofie@example.be')).toBeInTheDocument()
  })

  it('toont geen voogdsectie wanneer de student meerderjarig is', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.queryByText('Voogd')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/Step4Review.test.tsx`
Expected: FAIL — TypeScript prop mismatch is not checked by Vitest, but `screen.getByText('Voogd')` / `'Sofie Janssen'` cannot be found because the component doesn't render an embedded guardian section yet (and the old props `secondLandlord`/`secondTenant`/`guardian` are no longer passed, so those old cards don't render either — the new assertions simply find nothing).

- [ ] **Step 3: Rewrite `Step4Review.tsx`**

Replace the entire content of `src/pages/wizard/Step4Review.tsx`:

```tsx
import { Home, User } from 'lucide-react'
import type { Room } from '../../types'
import { isMinor, type StudentFormData } from './types'

interface Step4ReviewProps {
  room: Room
  students: StudentFormData[]
}

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
          <Icon size={14} className="text-accent" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100/60 py-1 last:border-0">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="break-words text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

export default function Step4Review({ room, students }: Step4ReviewProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <SectionCard icon={Home} title="Kamer">
        <InfoRow label="Kamer" value={`Kamer ${room.roomNumber}`} />
        <InfoRow label="Type" value={ROOM_TYPE_LABEL[room.roomType]} />
        <InfoRow label="Huurprijs" value={`€ ${room.monthlyRent}/maand`} />
        <InfoRow label="Vaste kosten" value={`€ ${room.fixedCosts}/maand`} />
        <InfoRow label="Studentenbelasting" value={`€ ${room.studentTax}/maand`} />
        <InfoRow label="Waarborg" value={`€ ${room.deposit}`} />
      </SectionCard>

      {students.map((student, index) => {
        const minor = isMinor(student.dateOfBirth)
        return (
          <SectionCard key={index} icon={User} title={students.length > 1 ? `Student ${index + 1}` : 'Student'}>
            {student.photoUrl && (
              <img
                src={student.photoUrl}
                alt="Foto student"
                className="mb-3 h-14 w-14 rounded-xl border-2 border-accent/20 object-cover"
              />
            )}
            <InfoRow label="Naam" value={`${student.firstName} ${student.lastName}`} />
            <InfoRow label="E-mail" value={student.email} />
            {student.phone && <InfoRow label="Telefoon" value={student.phone} />}
            <InfoRow label="Geboortedatum" value={student.dateOfBirth} />
            {minor && (
              <div className="mt-2 flex flex-col gap-1 border-t border-slate-100/60 pt-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Voogd</p>
                <InfoRow label="Naam" value={student.guardianName ?? ''} />
                <InfoRow label="E-mail" value={student.guardianEmail ?? ''} />
                {student.guardianPhone && <InfoRow label="Telefoon" value={student.guardianPhone} />}
              </div>
            )}
          </SectionCard>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/Step4Review.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/wizard/Step4Review.tsx src/__tests__/Step4Review.test.tsx
git commit -m "feat(wizard): embed guardian info per student card in Step 4, remove second-party sections"
```

---

## Task 5: Remove Step 3 from the wizard

**Files:**
- Delete: `src/pages/wizard/Step3SecondParty.tsx`, `src/__tests__/Step3SecondParty.test.tsx`
- Modify: `src/pages/ContractNewPage.tsx`
- Test: `src/__tests__/ContractNewPage.test.tsx`

- [ ] **Step 1: Update the changed/failing tests in `ContractNewPage.test.tsx`**

Replace the test `'toont de stapindicator met 4 stappen'` (lines 47-55) with:

```tsx
  it('toont de stapindicator met 3 stappen', async () => {
    renderNewContractPage()

    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(screen.queryByText('Partij')).not.toBeInTheDocument()
    expect(await screen.findByText(/kies een kamer/i)).toBeInTheDocument()
  })
```

Replace the test `'toont overzicht na geldige stappen'` (lines 90-99) — it now reaches the overview after a *single* "Volgende" click past Step 2 (the wizard has 3 steps, not 4):

```tsx
  it('toont overzicht na geldige stappen', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    await fillStudent()
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(await screen.findByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opslaan als concept/i })).toBeInTheDocument()
  })
```

Replace the test `'gaat na Opslaan als concept verder naar de volgende route'` (lines 101-111) — same one-click adjustment:

```tsx
  it('gaat na Opslaan als concept verder naar de volgende route', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    await fillStudent()
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    fireEvent.click(await screen.findByRole('button', { name: /opslaan als concept/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Delete the Step 3 component and its test**

```bash
git rm src/pages/wizard/Step3SecondParty.tsx src/__tests__/Step3SecondParty.test.tsx
```

- [ ] **Step 3: Run the `ContractNewPage` tests to verify they fail**

Run: `npx vitest run src/__tests__/ContractNewPage.test.tsx`
Expected: FAIL — `ContractNewPage.tsx` still imports the now-deleted `./wizard/Step3SecondParty`, so the module fails to resolve and every test in the file errors with a module-not-found failure.

- [ ] **Step 4: Rewrite `ContractNewPage.tsx`**

Replace the import block (lines 1-18):

```ts
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContractDraft, getRooms } from '../lib/data'
import { isValidBelgianPostalCode } from '../lib/residence'
import type { Room } from '../types'
import Step1Room from './wizard/Step1Room'
import Step2Student from './wizard/Step2Student'
import Step4Review from './wizard/Step4Review'
import WizardLayout from './wizard/WizardLayout'
import {
  isMinor,
  isValidDateOfBirth,
  isValidEmail,
  type StudentFormData,
} from './wizard/types'
```

Replace `WIZARD_STEPS`, `WizardStep`, `emptyStudent`, `studentIsComplete`, and remove `secondPartyIsComplete`/`guardianIsComplete` entirely (lines 20-66):

```ts
const WIZARD_STEPS = ['Kamer', 'Student', 'Overzicht']

type WizardStep = 1 | 2 | 3

function emptyStudent(): StudentFormData {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    photoUrl: null,
    institution: '',
    faculty: '',
    studentNumber: '',
    residenceStreet: '',
    residenceNumber: '',
    residenceBox: '',
    residencePostalCode: '',
    residenceCity: '',
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '',
  }
}

function studentIsComplete(student: StudentFormData): boolean {
  const minor = isMinor(student.dateOfBirth)
  return Boolean(
    student.firstName.trim() &&
      student.lastName.trim() &&
      isValidEmail(student.email) &&
      isValidDateOfBirth(student.dateOfBirth) &&
      student.institution.trim() &&
      student.studentNumber.trim() &&
      student.residenceStreet.trim() &&
      student.residenceNumber.trim() &&
      isValidBelgianPostalCode(student.residencePostalCode) &&
      student.residenceCity.trim() &&
      (!minor || (student.guardianName?.trim() && isValidEmail(student.guardianEmail ?? ''))),
  )
}
```

Remove the `secondLandlord`/`secondTenant`/`guardian` state lines (currently lines 73-75):

```ts
  const [secondLandlord, setSecondLandlord] = useState<SecondPartyData | null>(null)
  const [secondTenant, setSecondTenant] = useState<SecondPartyData | null>(null)
  const [guardian, setGuardian] = useState<GuardianData | null>(null)
```

— delete these three lines so the state block reads (lines 70-79 become):

```ts
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  const [isSending, setIsSending] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [error, setError] = useState<string | null>(null)
```

Remove the now-unused `hasMinor` line (line 103):

```ts
  const hasMinor = students.some(student => isMinor(student.dateOfBirth))
```

Replace `handleRoomSelect` (lines 105-112) — drop `setSecondTenant(null)`/`setGuardian(null)`:

```ts
  function handleRoomSelect(id: string) {
    setSelectedRoomId(id)

    const room = propertyRooms.find(item => item.id === id)
    setStudents(room?.roomType === 'double' ? [emptyStudent(), emptyStudent()] : [emptyStudent()])
  }
```

Replace `canProceed` (lines 122-134):

```ts
  function canProceed(): boolean {
    if (loadingRooms || error) return false
    if (currentStep === 1) return selectedRoomId !== null
    if (currentStep === 2) return students.every(studentIsComplete)
    return Boolean(selectedRoom)
  }
```

Replace `handleNext` (lines 136-161):

```ts
  async function handleNext() {
    if (!canProceed()) return

    if (currentStep < 3) {
      setCurrentStep(previous => (previous + 1) as WizardStep)
      return
    }

    if (!selectedRoom) return

    setIsSending(true)
    try {
      const contractId = await createContractDraft({
        roomId: selectedRoom.id,
        schoolYear: '2025–2026',
        students,
      })
      navigate(contractId ? `/contracts/${contractId}` : '/', { state: { savedDraft: true } })
    } catch (err) {
      console.error('Contract opslaan mislukt:', err)
      setError(err instanceof Error ? err.message : 'Contract opslaan mislukt')
      setIsSending(false)
    }
  }
```

Update `isLastStep` in the `WizardLayout` props (line 180) from `currentStep === 4` to `currentStep === 3`:

```tsx
        isLastStep={currentStep === 3}
```

Replace the step-rendering JSX (lines 201-224):

```tsx
        {currentStep === 2 && <Step2Student students={students} onChange={handleStudentChange} />}

        {currentStep === 3 && selectedRoom && (
          <Step4Review room={selectedRoom} students={students} />
        )}
```

- [ ] **Step 5: Run the `ContractNewPage` tests to verify they pass**

Run: `npx vitest run src/__tests__/ContractNewPage.test.tsx`
Expected: PASS — all tests green, including the rewritten "3 stappen" / "overzicht" / "opslaan als concept" tests.

- [ ] **Step 6: Run the full suite**

Run: `npm run test:run`
Expected: All tests PASS (the deleted `Step3SecondParty.test.tsx` no longer runs; no other file references it).

- [ ] **Step 7: Commit**

```bash
git add src/pages/ContractNewPage.tsx src/__tests__/ContractNewPage.test.tsx
git commit -m "feat(wizard): remove Step 3 'Partij', shrink wizard to 3 steps (Kamer, Student, Overzicht)"
```

---

## Task 6: Mock data — second student + guardian demo fixtures

**Files:**
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1: Add a minor second student and link it to `c-demo-student`**

In `src/lib/mockData.ts`, append a new student to the `STUDENTS` array (after `s-demo-student`, line 26):

```ts
  { id: 's-demo-second-student', firstName: 'Senne', lastName: 'Grobben', email: 'senne.grobben@example.com', phone: '0470 00 00 01', dateOfBirth: '2010-02-15', institution: 'Hogeschool Gent', faculty: '', studentNumber: 'DEMO-002', residenceStreet: 'Teststraat', residenceNumber: '1', residencePostalCode: '9000', residenceCity: 'Gent', guardianName: 'Inge Grobben', guardianEmail: 'inge.grobben@example.com', guardianPhone: '0470 00 00 02', createdAt: '2025-08-23' },
```

Update the `c-demo-student` contract entry (line 50) to add `secondStudentId`:

```ts
  { id: 'c-demo-student', roomId: 'r6', schoolYear: '2025–2026', studentId: 's-demo-student', secondStudentId: 's-demo-second-student', status: 'sent', createdAt: '2025-08-23' },
```

- [ ] **Step 2: Resolve the combined name in `getDashboardRows`**

Replace the body of `getDashboardRows` (lines 53-69):

```ts
export function getDashboardRows(propertyId: string, schoolYear: string): StudentDashboardRow[] {
  const propertyRooms = ROOMS.filter(r => r.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(r => r.id))
  const activeContracts = CONTRACTS.filter(c => roomIds.has(c.roomId) && c.schoolYear === schoolYear)

  return activeContracts.map(contract => {
    const student = STUDENTS.find(s => s.id === contract.studentId)!
    const secondStudent = contract.secondStudentId ? STUDENTS.find(s => s.id === contract.secondStudentId) : undefined
    const room = ROOMS.find(r => r.id === contract.roomId)!
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      roomNumber: room.roomNumber,
      contractId: contract.id,
      secondFirstName: secondStudent?.firstName,
      secondLastName: secondStudent?.lastName,
    }
  }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test:run`
Expected: All tests PASS — the new student/contract fixtures don't break any existing assertion (no existing test asserts on the *count* of students/contracts in mock data, only on specific named fixtures like `c1`/`c4`/`Emma Janssen`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(mockdata): give c-demo-student a minor second resident with guardian data"
```

---

## Task 7: Data layer — guardian fields move from contracts to students

**Files:**
- Modify: `src/lib/data.ts:23-40` (StudentRow), `:42-55` (ContractRow), `:75-98` (ContractDraftStudent/CreateContractDraftInput), `:226-245` (mapStudent), `:254-269` (mapContract), `:596-658` (createContractDraft)

This task has no isolated test of its own — `createContractDraft`/`mapStudent`/`mapContract` are exercised only through Supabase (no-ops in test mode) or indirectly through page tests that don't assert on these specific fields. We verify via the full suite that nothing regresses, and the type-correctness is verified by `npm run build` in the final review task.

- [ ] **Step 1: Add `guardian_*` to `StudentRow`, remove dead columns from `ContractRow`**

Replace the `StudentRow` interface (lines 23-40) — add three fields before `created_at`:

```ts
interface StudentRow {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  photo_url: string | null
  institution: string | null
  faculty: string | null
  student_number: string | null
  residence_street: string | null
  residence_number: string | null
  residence_box: string | null
  residence_postal_code: string | null
  residence_city: string | null
  guardian_name: string | null
  guardian_email: string | null
  guardian_phone: string | null
  created_at: string
}
```

Replace the `ContractRow` interface (lines 42-55) — remove the five dropped columns:

```ts
interface ContractRow {
  id: string
  room_id: string
  school_year: string
  student_id: string
  second_student_id: string | null
  status: Contract['status']
  created_at: string
}
```

- [ ] **Step 2: Update `ContractDraftStudent` and `CreateContractDraftInput`**

Replace lines 75-98:

```ts
interface ContractDraftStudent {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
  institution: string
  faculty: string
  studentNumber: string
  residenceStreet: string
  residenceNumber: string
  residenceBox: string
  residencePostalCode: string
  residenceCity: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
}

interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
}
```

- [ ] **Step 3: Read `guardian_*` in `mapStudent`, drop dead mappings in `mapContract`**

In `mapStudent` (lines 226-245), add the three guardian fields before `createdAt`:

```ts
function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    photoUrl: row.photo_url ?? undefined,
    institution: row.institution ?? undefined,
    faculty: row.faculty ?? undefined,
    studentNumber: row.student_number ?? undefined,
    residenceStreet: row.residence_street ?? undefined,
    residenceNumber: row.residence_number ?? undefined,
    residenceBox: row.residence_box ?? undefined,
    residencePostalCode: row.residence_postal_code ?? undefined,
    residenceCity: row.residence_city ?? undefined,
    guardianName: row.guardian_name ?? undefined,
    guardianEmail: row.guardian_email ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    createdAt: row.created_at,
  }
}
```

Replace `mapContract` (lines 254-269) — remove the five dropped-column mappings:

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
  }
}
```

- [ ] **Step 4: Write guardian fields to `students`, drop dead writes from `contracts` in `createContractDraft`**

Replace the `students` insert object (lines 613-629) — add the three guardian fields:

```ts
      studentsWithUploadedPhotos.map(student => ({
        owner_id: userData.user!.id,
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        phone: student.phone || null,
        date_of_birth: student.dateOfBirth,
        photo_url: student.photoUrl,
        institution: student.institution || null,
        faculty: student.faculty || null,
        student_number: student.studentNumber || null,
        residence_street: student.residenceStreet || null,
        residence_number: student.residenceNumber || null,
        residence_box: student.residenceBox || null,
        residence_postal_code: student.residencePostalCode || null,
        residence_city: student.residenceCity || null,
        guardian_name: student.guardianName || null,
        guardian_email: student.guardianEmail || null,
        guardian_phone: student.guardianPhone || null,
      })),
```

Replace the `contracts` insert object (lines 641-652) — remove the five dropped-column writes:

```ts
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: primaryStudent.id,
      second_student_id: students[1]?.id ?? null,
      status: 'draft',
    })
```

- [ ] **Step 5: Run the full test suite**

Run: `npm run test:run`
Expected: All tests PASS — `createContractDraft` is a no-op in test mode (`isSupabaseConfigured` is `false`), so these changes don't affect any test assertions; they only matter for the live Supabase path.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat(data): persist guardian fields on students instead of contracts"
```

---

## Task 8: Data layer — resolve second student in contract bundle

**Files:**
- Modify: `src/lib/data.ts:373-427` (`getContractBundleData`)
- Create: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getContractBundleData } from '../lib/data'

describe('getContractBundleData', () => {
  it('lost de tweede student op wanneer secondStudentId gezet is', async () => {
    const bundle = await getContractBundleData('c-demo-student')

    expect(bundle?.secondStudent?.firstName).toBe('Senne')
    expect(bundle?.secondStudent?.lastName).toBe('Grobben')
  })

  it('laat secondStudent ongedefinieerd wanneer er geen tweede student is', async () => {
    const bundle = await getContractBundleData('c1')

    expect(bundle?.secondStudent).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL — `bundle?.secondStudent` is `undefined` for `c-demo-student` too, because `getContractBundleData` does not resolve `secondStudentId` yet (the assertion `bundle?.secondStudent?.firstName).toBe('Senne')` fails with `undefined !== 'Senne'`).

- [ ] **Step 3: Resolve `secondStudent` in `getContractBundleData`**

In `src/lib/data.ts`, after the `if (!room || !student || !property) return null` guard (line 390), add:

```ts
  const secondStudent = contract.secondStudentId
    ? students.find(item => item.id === contract.secondStudentId)
    : undefined
```

Replace the final return statement (line 426):

```ts
  const landlord = getLandlordProfile()
  return { contract, room, student, secondStudent, property, startInspection, startInspectionItems, endInspection, endInspectionItems, landlord }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(data): resolve secondStudent in getContractBundleData"
```

---

## Task 9: Data layer — combined name in dashboard rows

**Files:**
- Modify: `src/lib/data.ts:307-334` (`buildDashboardRows`)
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/__tests__/data.test.ts` (new `describe` block, after the `getContractBundleData` block):

```ts
import { getDashboardRowsData } from '../lib/data'
```

(add this to the existing import line so it reads `import { getContractBundleData, getDashboardRowsData } from '../lib/data'`)

```ts
describe('getDashboardRowsData', () => {
  it('combineert de namen van beide studenten in de rij', async () => {
    const rows = await getDashboardRowsData('p1', '2025–2026')
    const row = rows.find(r => r.contractId === 'c-demo-student')

    expect(row?.secondFirstName).toBe('Senne')
    expect(row?.secondLastName).toBe('Grobben')
  })

  it('laat secondFirstName/secondLastName ongedefinieerd zonder tweede student', async () => {
    const rows = await getDashboardRowsData('p1', '2025–2026')
    const row = rows.find(r => r.contractId === 'c1')

    expect(row?.secondFirstName).toBeUndefined()
    expect(row?.secondLastName).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL — `row?.secondFirstName` is `undefined` for `c-demo-student` (expected `'Senne'`), because `buildDashboardRows` doesn't resolve `secondStudentId` yet.

- [ ] **Step 3: Resolve the second student in `buildDashboardRows`**

Replace the body of `buildDashboardRows` (lines 307-334):

```ts
function buildDashboardRows(
  propertyId: string,
  schoolYear: string,
  rooms: Room[],
  contracts: Contract[],
  students: Student[],
): StudentDashboardRow[] {
  const propertyRooms = rooms.filter(room => room.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(room => room.id))
  const activeContracts = contracts.filter(contract => roomIds.has(contract.roomId) && contract.schoolYear === schoolYear)

  return activeContracts
    .map(contract => {
      const student = students.find(item => item.id === contract.studentId)
      const room = rooms.find(item => item.id === contract.roomId)
      if (!student || !room) return null

      const secondStudent = contract.secondStudentId
        ? students.find(item => item.id === contract.secondStudentId)
        : undefined

      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        roomNumber: room.roomNumber,
        contractId: contract.id,
        secondFirstName: secondStudent?.firstName,
        secondLastName: secondStudent?.lastName,
      }
    })
    .filter((row): row is StudentDashboardRow => row !== null)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: PASS — all 4 tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(data): resolve combined second-student name in dashboard rows"
```

---

## Task 10: StudentRow — show combined name

**Files:**
- Modify: `src/pages/components/StudentRow.tsx:37-39`
- Test: `src/__tests__/StudentRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/StudentRow.test.tsx`, inside `describe('StudentRow', ...)` (after the existing `'toont de studentnaam'` test):

```tsx
  it('toont gecombineerde naam wanneer er een tweede student is', () => {
    render(
      <StudentRow
        {...defaultProps}
        row={{ ...mockRow, secondFirstName: 'Liam', secondLastName: 'Pieters' }}
      />,
    )
    expect(screen.getByText('Emma Janssen & Liam Pieters')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/StudentRow.test.tsx`
Expected: FAIL — `screen.getByText('Emma Janssen & Liam Pieters')` finds nothing; the row only renders `{row.firstName} {row.lastName}`.

- [ ] **Step 3: Render the combined name**

Replace lines 37-39 in `src/pages/components/StudentRow.tsx`:

```tsx
        <p className="text-sm font-semibold text-slate-900 truncate">
          {row.firstName} {row.lastName}
          {row.secondFirstName && row.secondLastName && ` & ${row.secondFirstName} ${row.secondLastName}`}
        </p>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/StudentRow.test.tsx`
Expected: PASS — all tests in the file green, including the new one.

- [ ] **Step 5: Commit**

```bash
git add src/pages/components/StudentRow.tsx src/__tests__/StudentRow.test.tsx
git commit -m "feat(dashboard): show combined name on StudentRow when a second student is present"
```

---

## Task 11: Contract document — HUURDERS (plural) + two info blocks

**Files:**
- Modify: `src/lib/pdfDocuments.ts:117-233`
- Test: `src/__tests__/pdfDocuments.test.ts`

**Note on `huurderNaam`:** The spec says the existing `huurderNaam` combined-name string "blijft bestaan voor plekken in het contract waar één samengevatte naam nodig is (bv. titel/aanhef)". A grep across `pdfDocuments.ts` confirms `huurderNaam` (declared at lines 136-138) is referenced in exactly **one** place — the very `<div class="field-row">...Naam en voornamen...` line this task replaces with `renderHuurderInfoBlock`. There is no other "title/aanhef" usage site in the document (the `<title>` tag uses `student.firstName`/`student.lastName` directly, not `huurderNaam`). Since `renderHuurderInfoBlock(student)` produces the exact same `${lastName}, ${firstName}` string for the single-student case, keeping `huurderNaam` around would leave it as dead, unused code (a lint violation and a YAGNI breach). This task therefore removes `huurderNaam` entirely — its sole purpose is fully subsumed by `renderHuurderInfoBlock`.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/pdfDocuments.test.ts`, inside `describe('generateContractHtml', ...)` (after the existing tests):

```ts
  it('toont "ANDERZIJDS, de HUURDER:" en één infoblok zonder tweede student', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('ANDERZIJDS, de HUURDER:')
    expect(html).not.toContain('ANDERZIJDS, de HUURDERS:')
    expect(html).not.toContain('Huurder 1')
  })

  it('toont "ANDERZIJDS, de HUURDERS:" en twee volledige infoblokken met tweede student', () => {
    const html = generateContractHtml({
      ...mockBundle,
      secondStudent: STUDENTS[1],
    })
    expect(html).toContain('ANDERZIJDS, de HUURDERS:')
    expect(html).toContain('Huurder 1')
    expect(html).toContain('Huurder 2')
    expect(html).toContain('Janssen, Emma')
    expect(html).toContain('Pieters, Liam')
    expect(html).toContain('liam.pieters@student.ugent.be')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/pdfDocuments.test.ts`
Expected: FAIL on the second new test — `html` contains `'ANDERZIJDS, de HUURDER:'` but not `'ANDERZIJDS, de HUURDERS:'` (the heading is never pluralized) and contains no `'Huurder 1'`/`'Huurder 2'` labels (the second student's info is never rendered).

- [ ] **Step 3: Add `renderHuurderInfoBlock` and replace the HUURDER section**

In `src/lib/pdfDocuments.ts`, add a new helper function directly after `escapeHtml` (after line 100):

```ts
function renderHuurderInfoBlock(person: Student, heading?: string): string {
  return `${heading ? `<p style="margin-top:8px;"><strong>${escapeHtml(heading)}</strong></p>` : ''}
<div class="field-row"><span class="field-label">Naam en voornamen:</span><span>${escapeHtml(person.lastName)}, ${escapeHtml(person.firstName)}</span></div>
<div class="field-row"><span class="field-label">Geboortedatum:</span><span>${escapeHtml(person.dateOfBirth)}</span></div>
${person.institution ? `<div class="field-row"><span class="field-label">Onderwijsinstelling:</span><span>${escapeHtml(person.institution)}</span></div>` : ''}
${person.faculty ? `<div class="field-row"><span class="field-label">Faculteit:</span><span>${escapeHtml(person.faculty)}</span></div>` : ''}
${person.studentNumber ? `<div class="field-row"><span class="field-label">Studentennummer:</span><span>${escapeHtml(person.studentNumber)}</span></div>` : ''}
${formatResidence(person) ? `<div class="field-row"><span class="field-label">Hoofdverblijf:</span><span>${escapeHtml(formatResidence(person))}</span></div>` : ''}
<div class="field-row"><span class="field-label">Telefoon / gsm:</span><span>${escapeHtml(person.phone)}</span></div>
<div class="field-row"><span class="field-label">E-mailadres:</span><span>${escapeHtml(person.email)}</span></div>`
}
```

This requires importing the `Student` type — check the top of `pdfDocuments.ts` for an existing `import type { ... } from '../types'` line and add `Student` to it if not already present (the `ContractBundle` interface already references `Student` for its `student`/`secondStudent` fields, so the import should already exist).

Remove the `huurderNaam` computation (lines 136-138):

```ts
  const huurderNaam = secondStudent
    ? `${student.lastName}, ${student.firstName} &amp; ${secondStudent.lastName}, ${secondStudent.firstName}`
    : `${student.lastName}, ${student.firstName}`
```

Replace the HUURDER section (lines 225-233):

```html
<p style="margin-top:12px;"><strong>ANDERZIJDS, de ${secondStudent ? 'HUURDERS' : 'HUURDER'}:</strong></p>
${secondStudent
  ? renderHuurderInfoBlock(student, 'Huurder 1') + renderHuurderInfoBlock(secondStudent, 'Huurder 2')
  : renderHuurderInfoBlock(student)}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/pdfDocuments.test.ts`
Expected: PASS — all tests in the file green, including the two new ones. (The existing test `'laat de verhuurdersnaam leeg wanneer die nog niet is ingevuld'` checks for `'<span></span>'`, which still occurs via the empty `landlord.name`/etc. fields — unaffected by this change.)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test:run`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdfDocuments.ts src/__tests__/pdfDocuments.test.ts
git commit -m "feat(pdf): render HUURDERS plural with two full info blocks when a second student exists"
```

---

## Task 12: Contract detail — dual student headers + send to both students

**Files:**
- Modify: `src/pages/ContractDetailPage.tsx`
- Test: `src/__tests__/ContractDetailPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/ContractDetailPage.test.tsx`, inside `describe('ContractDetailPage', ...)` (after the existing tests, before the closing `})`):

```tsx
  it('toont twee studentkoppen met voogdnotitie wanneer er een tweede (minderjarige) bewoner is', async () => {
    renderPage('/contracts/c-demo-student')

    expect(await screen.findByRole('heading', { name: 'Vincent Grobben' })).toBeInTheDocument()
    expect(screen.getByText('Senne Grobben')).toBeInTheDocument()
    expect(screen.getByText(/Minderjarig — voogd: Inge Grobben/)).toBeInTheDocument()
  })

  it('toont één studentkop zonder voogdnotitie wanneer er geen tweede bewoner is (c1)', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.queryByText(/Minderjarig — voogd:/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/ContractDetailPage.test.tsx`
Expected: FAIL on the first new test — `screen.getByText('Senne Grobben')` finds nothing because the page only renders the primary student's header; `screen.getByText(/Minderjarig — voogd: Inge Grobben/)` also finds nothing.

- [ ] **Step 3: Add `secondStudent` to the bundle state type and import `isMinor`**

Add the import (after the `SignatureModal` import, line 8):

```ts
import { isMinor } from './wizard/types'
```

Update the `bundle` state type (lines 20-30) — add `secondStudent?: Student` after `student: Student`:

```ts
  const [bundle, setBundle] = useState<{
    contract: Contract
    room: Room
    student: Student
    secondStudent?: Student
    property: Property
    startInspection?: Inspection
    startInspectionItems?: InspectionItem[]
    endInspection?: Inspection
    endInspectionItems?: InspectionItem[]
    landlord?: LandlordProfile
  } | null>(null)
```

Update the destructure (line 72) to include `secondStudent`:

```ts
  const { contract, room, student, secondStudent, property, startInspection, startInspectionItems, endInspection, landlord } = bundle
```

- [ ] **Step 4: Render the dual student headers**

Replace the inner content of the `<section className="glass rounded-2xl p-4">` block — specifically the `<div className="flex items-start gap-4">...</div>` for the student head (lines 163-187) plus the action-buttons grid that follows it (lines 189-210). Replace lines 163-210 with:

```tsx
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt="Student" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <User size={26} className="text-accent" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Kamer {room.roomNumber}, {property.name}
                </p>
                {isMinor(student.dateOfBirth) && student.guardianName && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    Minderjarig — voogd: {student.guardianName}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Student verwijderen"
                onClick={() => setShowDeleteConfirm(true)}
                className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              >
                <Trash2 size={15} className="text-red-500" />
              </button>
            </div>

            {secondStudent && (
              <div className="mt-4 flex items-start gap-4 border-t border-white/60 pt-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                  {secondStudent.photoUrl ? (
                    <img src={secondStudent.photoUrl} alt="Student" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    <User size={26} className="text-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {secondStudent.firstName} {secondStudent.lastName}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Kamer {room.roomNumber}, {property.name}
                  </p>
                  {isMinor(secondStudent.dateOfBirth) && secondStudent.guardianName && (
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Minderjarig — voogd: {secondStudent.guardianName}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton
                label="Verlengen"
                icon={CalendarPlus}
                onClick={() => navigate(`/contracts/${contract.id}/renew`)}
              />
              <ActionButton
                label="PDF maken"
                icon={Download}
                onClick={() => printContractDocument({
                  contract,
                  room,
                  student,
                  secondStudent,
                  property,
                  inspection: startInspection,
                  inspectionItems: startInspectionItems,
                  landlord,
                  landlordSignatureDataUrl,
                  studentSignatureDataUrl,
                })}
              />
            </div>
```

- [ ] **Step 5: Run the tests to verify the new ones pass**

Run: `npx vitest run src/__tests__/ContractDetailPage.test.tsx`
Expected: PASS on both new tests (the dual-header rendering is in place). The remaining steps (6-8 below) update `handleSend` — run the file again at the end to confirm everything stays green.

- [ ] **Step 6: Add `secondStudent` to the send bundle and send to both students**

Replace `handleSend` (lines 94-132):

```ts
  async function handleSend() {
    if (!student.email) {
      setSendStatus('error')
      setStatusMessage('Geen e-mailadres gevonden voor deze student.')
      return
    }
    setSendStatus('sending')
    setStatusMessage('PDF wordt gegenereerd...')
    try {
      const bundle = {
        contract,
        room,
        student,
        secondStudent,
        property,
        inspection: startInspection,
        inspectionItems: startInspectionItems,
        landlord,
        landlordSignatureDataUrl,
        studentSignatureDataUrl,
      }
      const html = generateContractHtml(bundle)
      setStatusMessage('PDF wordt gegenereerd...')
      let pdfBase64: string | undefined
      try {
        pdfBase64 = await generateContractPdfBase64(bundle)
      } catch (pdfError) {
        console.error('PDF-generatie mislukt, verstuur HTML fallback:', pdfError)
      }
      setStatusMessage('Contract wordt verstuurd...')
      const recipients = [student.email]
      await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html, pdfBase64)
      if (secondStudent?.email) {
        await sendContractEmail(secondStudent.email, `${secondStudent.firstName} ${secondStudent.lastName}`, html, pdfBase64)
        recipients.push(secondStudent.email)
      }
      await updateContractStatus(contract.id, 'sent')
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, status: 'sent' } } : null)
      setSendStatus('sent')
      setStatusMessage(`Contract is verstuurd naar ${recipients.join(' en ')}.`)
    } catch (err) {
      setSendStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Contract kon niet verstuurd worden.')
    }
  }
```

- [ ] **Step 7: Run the full `ContractDetailPage` test file**

Run: `npx vitest run src/__tests__/ContractDetailPage.test.tsx`
Expected: PASS — all tests in the file green, including the two new dual-header tests. (No existing test exercises `handleSend`'s email step directly — `sendContractEmail` is a no-op when `isSupabaseConfigured` is `false`, so the dual-send logic runs harmlessly in test mode; its correctness is verified by code review and by the literal match to the spec's prescribed snippet.)

- [ ] **Step 8: Run the full test suite**

Run: `npm run test:run`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ContractDetailPage.tsx src/__tests__/ContractDetailPage.test.tsx
git commit -m "feat(contract-detail): show dual student headers and send contract to both residents"
```

---

## Final Verification

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm run test:run`
Expected: All tests PASS (104 existing + ~13 new = ~117 tests).

- [ ] **Step 2: Run the TypeScript build to catch any type-level inconsistencies Vitest doesn't check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors (this is the first point where removed types like `SecondPartyData`/`GuardianData`/`Contract.guardianName` etc. would surface as compile errors if any reference was missed).

If `tsc -b` reports errors referencing `SecondPartyData`, `GuardianData`, `Contract.secondLandlordName`, `Contract.guardianName`, `Contract.guardianEmail`, `Contract.guardianPhone`, or `Contract.secondLandlordEmail`, search for the remaining reference with `grep -rn "SecondPartyData\|GuardianData\|secondLandlord\|guardianName\|guardianEmail\|guardianPhone" src/ --include="*.tsx" --include="*.ts"` and remove/update it — likely candidates are stale imports left in already-modified files.

- [ ] **Step 3: Commit any final fixes (only if Step 2 required changes)**

```bash
git add -A
git commit -m "fix: resolve remaining type references after Cluster D refactor"
```

---

## Self-Review

**Spec coverage** — every row of the spec's "Beslissingen" and "Bestanden geraakt" tables maps to a task:

| Spec requirement | Task |
|---|---|
| Stap 3 volledig verwijderen | Task 5 |
| Tweede verhuurder volledig schrappen (wizard + datamodel + DB) | Tasks 1, 2, 5, 7 |
| Tweede bewoner (`secondTenant`) volledig schrappen | Tasks 2, 4, 5 |
| Voogd-veld verplaatsen naar Stap 2, per student | Tasks 2, 3 |
| Eén voogd per minderjarige student (naam, e-mail, telefoon) | Task 3 |
| Wie ondertekent bij minderjarigheid → cluster A (NOT implemented here) | Explicitly out of scope — no task implements signing logic |
| Dashboardweergave: gecombineerde naam | Tasks 6, 9, 10 |
| Verzending naar beide studenten | Task 12 |
| Studentinfo in contractdocument: beide bewoners volledig vermeld | Task 11 |
| `Contract`: drop `secondLandlord*`/`guardian*`; `Student`: add `guardian*`; `StudentDashboardRow`: add `secondFirstName`/`secondLastName` | Task 1 |
| Database migratie (kolomwijzigingen) | Task 1 |
| `mapStudent`/`StudentRow`/`createContractDraft` lezen/schrijven `guardian_*` op `students` | Task 7 |
| `Step3SecondParty.tsx` verwijderen | Task 5 |
| `wizard/types.ts`: `SecondPartyData`/`GuardianData` weg, `StudentFormData` krijgt `guardian*` | Task 2 |
| `Step2Student.tsx`: voogd-subsectie na minderjarigheidsbericht | Task 3 |
| `Step4Review.tsx`: props weg, voogd ingebed per studentkaart | Task 4 |
| `ContractNewPage.tsx`: state opruimen, 4→3 stappen, `emptyStudent`/`studentIsComplete` | Task 5 |
| `data.ts`: `CreateContractDraftInput`/`ContractDraftStudent`, `createContractDraft`, `getContractBundleData` (`secondStudent`), dashboard-rijen | Tasks 7, 8, 9 |
| `StudentRow.tsx`: gecombineerde naam | Task 10 |
| `ContractDetailPage.tsx`: twee koppen, `secondStudent` in send/print, dubbele e-mail, statusboodschap | Task 12 |
| `pdfDocuments.ts`: "HUURDERS" + twee infoblokken | Task 11 |
| `mockData.ts`: demo-contract met tweede minderjarige student + voogd | Task 6 |
| Tests: `getContractBundleData`, `getDashboardRowsData`, `StudentRow`, `Step2Student`, `Step4Review`, `generateContractHtml`, `handleSend`/e-mail | Tasks 8, 9, 10, 3, 4, 11, 12 |

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate error handling"/"similar to Task N" found — every step shows complete, copy-pasteable code and exact commands with expected output.

**Type consistency:** Verified across tasks — `secondStudent?: Student` (Task 1's `Contract.secondStudentId` plus `ContractBundle.secondStudent`, already present in `pdfDocuments.ts`), `guardianName?/guardianEmail?/guardianPhone?: string` (consistent on `Student` in Task 1, `StudentFormData` in Task 2, `ContractDraftStudent` in Task 7), `secondFirstName?/secondLastName?: string` (consistent on `StudentDashboardRow` in Task 1, used identically in Tasks 6, 9, 10), `renderHuurderInfoBlock(person: Student, heading?: string)` (Task 11, called consistently with `(student, 'Huurder 1')`/`(secondStudent, 'Huurder 2')`/`(student)`), `WizardStep = 1 | 2 | 3` (Task 5, used consistently in `currentStep < 3`/`isLastStep={currentStep === 3}`/JSX step checks).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-07-cluster-d-tweede-persoon.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
