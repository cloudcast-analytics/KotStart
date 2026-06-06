# Cluster B — Studentdata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the student domicile address into structured fields (Straat/Huisnummer/Bus/Postcode/Gemeente) and replace the free-text institution field with a searchable dropdown of recognised Flemish institutions plus a separate optional faculty field.

**Architecture:** Add structured fields to the `Student`/`StudentFormData` types and the Supabase `students` table (non-destructive migration; old `primary_residence` stays unused). A bundled curated institution list (`institutions.ts`) feeds a lightweight searchable combobox (`InstitutionSelect`) with an "Andere…" free-text fallback. A standalone Node script can regenerate the list from the official Hoger Onderwijsregister. Pure helpers (`residence.ts`) compose the address for display and validate Belgian postal codes.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind, Vitest + Testing Library, Supabase.

**Reference spec:** `docs/superpowers/specs/2026-06-06-cluster-b-studentdata-design.md`

**Conventions for this codebase:**
- Run a single test file: `npm run test:run -- <path>`
- Run the whole suite: `npm run test:run`
- Type-check + build: `npm run build`
- Node 20+ required.
- Tests live in `src/__tests__/`. `src/test-setup.ts` already registers jest-dom.
- Commit after every task. Each task leaves the build green.
- The transition keeps `primaryResidence` in the types as an optional field until the final cleanup task, so every intermediate commit compiles.

---

## File Structure

| File | Responsibility | Created/Modified |
|------|----------------|------------------|
| `src/lib/residence.ts` | `formatResidence()` + `isValidBelgianPostalCode()` pure helpers | Create |
| `src/lib/institutions.ts` | Bundled curated list `VLAAMSE_INSTELLINGEN` | Create |
| `src/components/InstitutionSelect.tsx` | Searchable institution combobox + "Andere…" fallback | Create |
| `src/types/index.ts` | `Student`: add residence fields + `faculty`; remove `primaryResidence` (final task) | Modify |
| `src/pages/wizard/types.ts` | `StudentFormData`: same field changes | Modify |
| `src/pages/wizard/Step2Student.tsx` | Three-block layout: Persoonlijk / Studie / Hoofdverblijf | Modify |
| `src/pages/ContractNewPage.tsx` | `emptyStudent()` + `studentIsComplete()` | Modify |
| `src/lib/data.ts` | `StudentRow`, `mapStudent`, `ContractDraftStudent`, `createContractDraft` | Modify |
| `src/lib/mockData.ts` | `STUDENTS` converted to new fields | Modify |
| `src/lib/pdfDocuments.ts` | Use `formatResidence` + faculty row | Modify |
| `supabase/migrations/<ts>_student_residence_institution.sql` | Add columns | Create |
| `scripts/generate-institutions.mjs` | Regenerate `institutions.ts` from official source | Create |
| `package.json` | `institutions:update` script | Modify |
| `src/__tests__/residence.test.ts` | Helper tests | Create |
| `src/__tests__/institutions.test.ts` | List tests | Create |
| `src/__tests__/InstitutionSelect.test.tsx` | Combobox tests | Create |
| `src/__tests__/Step2Student.test.tsx` | Wizard step tests | Create |

---

## Task 1: Residence helpers (`residence.ts`)

**Files:**
- Create: `src/lib/residence.ts`
- Test: `src/__tests__/residence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/residence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatResidence, isValidBelgianPostalCode } from '../lib/residence'

describe('formatResidence', () => {
  it('composes street, number, postal code and city', () => {
    expect(
      formatResidence({
        residenceStreet: 'Kerkstraat',
        residenceNumber: '22',
        residencePostalCode: '9200',
        residenceCity: 'Dendermonde',
      }),
    ).toBe('Kerkstraat 22, 9200 Dendermonde')
  })

  it('includes the bus number when present', () => {
    expect(
      formatResidence({
        residenceStreet: 'Kerkstraat',
        residenceNumber: '22',
        residenceBox: '3',
        residencePostalCode: '9200',
        residenceCity: 'Dendermonde',
      }),
    ).toBe('Kerkstraat 22 bus 3, 9200 Dendermonde')
  })

  it('omits missing parts gracefully', () => {
    expect(formatResidence({ residenceStreet: 'Kerkstraat', residenceNumber: '22' })).toBe(
      'Kerkstraat 22',
    )
  })

  it('returns an empty string when nothing is provided', () => {
    expect(formatResidence({})).toBe('')
  })
})

describe('isValidBelgianPostalCode', () => {
  it('accepts a 4-digit code between 1000 and 9999', () => {
    expect(isValidBelgianPostalCode('9000')).toBe(true)
    expect(isValidBelgianPostalCode('1000')).toBe(true)
  })

  it('rejects anything that is not 4 digits starting 1-9', () => {
    expect(isValidBelgianPostalCode('900')).toBe(false)
    expect(isValidBelgianPostalCode('90000')).toBe(false)
    expect(isValidBelgianPostalCode('0999')).toBe(false)
    expect(isValidBelgianPostalCode('9a00')).toBe(false)
    expect(isValidBelgianPostalCode('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/residence.test.ts`
Expected: FAIL — cannot resolve `../lib/residence`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/residence.ts`:

```ts
interface ResidenceParts {
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
}

export function formatResidence(parts: ResidenceParts): string {
  const streetLine = [parts.residenceStreet, parts.residenceNumber]
    .filter(value => value && value.trim())
    .join(' ')
    .trim()
  const withBox =
    streetLine && parts.residenceBox && parts.residenceBox.trim()
      ? `${streetLine} bus ${parts.residenceBox.trim()}`
      : streetLine
  const cityLine = [parts.residencePostalCode, parts.residenceCity]
    .filter(value => value && value.trim())
    .join(' ')
    .trim()
  return [withBox, cityLine].filter(Boolean).join(', ')
}

export function isValidBelgianPostalCode(value: string): boolean {
  return /^[1-9]\d{3}$/.test(value.trim())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/residence.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/residence.ts src/__tests__/residence.test.ts
git commit -m "feat(studentdata): add residence formatting and postal code helpers"
```

---

## Task 2: Curated institution list (`institutions.ts`)

**Files:**
- Create: `src/lib/institutions.ts`
- Test: `src/__tests__/institutions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/institutions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { VLAAMSE_INSTELLINGEN } from '../lib/institutions'

describe('VLAAMSE_INSTELLINGEN', () => {
  it('is a non-empty list', () => {
    expect(VLAAMSE_INSTELLINGEN.length).toBeGreaterThan(0)
  })

  it('contains the major Flemish universities', () => {
    expect(VLAAMSE_INSTELLINGEN).toContain('KU Leuven')
    expect(VLAAMSE_INSTELLINGEN).toContain('Universiteit Gent')
    expect(VLAAMSE_INSTELLINGEN).toContain('Vrije Universiteit Brussel')
  })

  it('has no duplicates', () => {
    expect(new Set(VLAAMSE_INSTELLINGEN).size).toBe(VLAAMSE_INSTELLINGEN.length)
  })

  it('is sorted alphabetically (nl locale)', () => {
    const sorted = [...VLAAMSE_INSTELLINGEN].sort((a, b) => a.localeCompare(b, 'nl'))
    expect(VLAAMSE_INSTELLINGEN).toEqual(sorted)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/institutions.test.ts`
Expected: FAIL — cannot resolve `../lib/institutions`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/institutions.ts`. This is the provisional curated list of recognised
Flemish higher-education institutions (universities + university colleges, incl.
Dutch-language Brussels institutions). It can later be regenerated by
`scripts/generate-institutions.mjs` (Task 9). Keep the array sorted alphabetically.

```ts
// Erkende Vlaamse hogeronderwijsinstellingen (universiteiten + hogescholen).
// Voorlopige gecureerde lijst — hergenereerbaar via `npm run institutions:update`.
// Bron: https://www.hogeronderwijsregister.be/instellingen
export const VLAAMSE_INSTELLINGEN: string[] = [
  'AP Hogeschool Antwerpen',
  'Arteveldehogeschool',
  'Erasmushogeschool Brussel',
  'Evangelische Theologische Faculteit Leuven',
  'Hogere Zeevaartschool Antwerpen',
  'Hogeschool Gent',
  'Hogeschool PXL',
  'Hogeschool West-Vlaanderen (Howest)',
  'Instituut voor Tropische Geneeskunde',
  'KU Leuven',
  'Karel de Grote Hogeschool',
  'LUCA School of Arts',
  'Odisee',
  'Thomas More',
  'UC Leuven-Limburg (UCLL)',
  'Universiteit Antwerpen',
  'Universiteit Gent',
  'Universiteit Hasselt',
  'VIVES Hogeschool',
  'Vrije Universiteit Brussel',
]
```

> Note: if the "sorted alphabetically" test fails, re-sort the array with the same
> `localeCompare(a, b, 'nl')` comparison the test uses and paste the result back.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/institutions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/institutions.ts src/__tests__/institutions.test.ts
git commit -m "feat(studentdata): add curated Flemish institution list"
```

---

## Task 3: InstitutionSelect combobox

**Files:**
- Create: `src/components/InstitutionSelect.tsx`
- Test: `src/__tests__/InstitutionSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/InstitutionSelect.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstitutionSelect from '../components/InstitutionSelect'

describe('InstitutionSelect', () => {
  it('filters the options as you type', () => {
    render(<InstitutionSelect value="" onChange={() => {}} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Universiteit G' } })
    expect(screen.getByText('Universiteit Gent')).toBeInTheDocument()
    expect(screen.queryByText('KU Leuven')).not.toBeInTheDocument()
  })

  it('calls onChange with the canonical name when an option is picked', () => {
    const onChange = vi.fn()
    render(<InstitutionSelect value="" onChange={onChange} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'KU' } })
    fireEvent.click(screen.getByText('KU Leuven'))
    expect(onChange).toHaveBeenCalledWith('KU Leuven')
  })

  it('lets you enter a free-text institution via Andere…', () => {
    const onChange = vi.fn()
    render(<InstitutionSelect value="" onChange={onChange} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.click(screen.getByText('Andere…'))
    const free = screen.getByLabelText('Andere onderwijsinstelling')
    fireEvent.change(free, { target: { value: 'University of Amsterdam' } })
    expect(onChange).toHaveBeenCalledWith('University of Amsterdam')
  })

  it('starts in free-text mode when the value is not in the list', () => {
    render(
      <InstitutionSelect value="University of Amsterdam" onChange={() => {}} ariaLabel="Onderwijsinstelling" />,
    )
    expect(screen.getByLabelText('Andere onderwijsinstelling')).toHaveValue('University of Amsterdam')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/InstitutionSelect.test.tsx`
Expected: FAIL — cannot resolve `../components/InstitutionSelect`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/InstitutionSelect.tsx`:

```tsx
import { useState } from 'react'
import { VLAAMSE_INSTELLINGEN } from '../lib/institutions'

interface InstitutionSelectProps {
  value: string
  onChange: (value: string) => void
  id?: string
  ariaLabel?: string
}

const inputClass =
  'w-full rounded-xl border border-white/90 bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20'

export default function InstitutionSelect({ value, onChange, id, ariaLabel }: InstitutionSelectProps) {
  const [mode, setMode] = useState<'list' | 'other'>(
    value && !VLAAMSE_INSTELLINGEN.includes(value) ? 'other' : 'list',
  )
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  if (mode === 'other') {
    return (
      <div className="flex flex-col gap-1">
        <input
          id={id}
          aria-label="Andere onderwijsinstelling"
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Naam onderwijsinstelling"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => {
            setMode('list')
            setQuery('')
            onChange('')
          }}
          className="self-start text-xs font-semibold text-accent"
        >
          &larr; Kies uit lijst
        </button>
      </div>
    )
  }

  const filtered = query
    ? VLAAMSE_INSTELLINGEN.filter(name => name.toLowerCase().includes(query.toLowerCase()))
    : VLAAMSE_INSTELLINGEN

  return (
    <div className="relative">
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        value={open ? query : value}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Zoek je onderwijsinstelling"
        className={inputClass}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/90 bg-white shadow-xl">
          {filtered.map(name => (
            <li key={name}>
              <button
                type="button"
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                  setQuery('')
                }}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-accent/10"
              >
                {name}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => {
                setMode('other')
                setOpen(false)
                onChange('')
              }}
              className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent/10"
            >
              Andere&hellip;
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
```

> Note: the "Andere…" label uses the `&hellip;` entity, which renders as the single
> character `…` — matching `screen.getByText('Andere…')` in the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/__tests__/InstitutionSelect.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/InstitutionSelect.tsx src/__tests__/InstitutionSelect.test.tsx
git commit -m "feat(studentdata): add searchable InstitutionSelect combobox"
```

---

## Task 4: Extend types (additive)

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/wizard/types.ts`

This task only *adds* fields. `primaryResidence` stays for now so every consumer still
compiles. It is removed in Task 8.

- [ ] **Step 1: Add fields to `Student`**

In `src/types/index.ts`, change the `Student` interface to add the new fields
(keep `primaryResidence?` for now):

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
  primaryResidence?: string
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
  createdAt: string
}
```

- [ ] **Step 2: Add fields to `StudentFormData`**

In `src/pages/wizard/types.ts`, change `StudentFormData`:

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
  primaryResidence: string
  residenceStreet: string
  residenceNumber: string
  residenceBox: string
  residencePostalCode: string
  residenceCity: string
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: PASS (additive change; nothing references the new fields yet, `primaryResidence` still present).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/pages/wizard/types.ts
git commit -m "feat(studentdata): add residence + faculty fields to student types"
```

---

## Task 5: Wizard Step 2 — three-block layout

**Files:**
- Modify: `src/pages/wizard/Step2Student.tsx` (full rewrite)
- Modify: `src/pages/ContractNewPage.tsx` (`emptyStudent`, `studentIsComplete`)
- Test: `src/__tests__/Step2Student.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/Step2Student.test.tsx`. Note the `Harness` wrapper: `Step2Student`
is fully controlled, so the postcode-validation test needs real state to update the field
value on change.

```tsx
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Step2Student from '../pages/wizard/Step2Student'
import type { StudentFormData } from '../pages/wizard/types'

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
    primaryResidence: '',
    residenceStreet: '',
    residenceNumber: '',
    residenceBox: '',
    residencePostalCode: '',
    residenceCity: '',
  }
}

function Harness() {
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  return (
    <Step2Student
      students={students}
      onChange={(index, field, value) =>
        setStudents(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
      }
    />
  )
}

describe('Step2Student', () => {
  it('renders the institution selector and split residence fields', () => {
    render(<Step2Student students={[emptyStudent()]} onChange={() => {}} />)
    expect(screen.getByLabelText('Onderwijsinstelling')).toBeInTheDocument()
    expect(screen.getByLabelText('Straat')).toBeInTheDocument()
    expect(screen.getByLabelText('Huisnummer')).toBeInTheDocument()
    expect(screen.getByLabelText('Bus')).toBeInTheDocument()
    expect(screen.getByLabelText('Postcode')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemeente')).toBeInTheDocument()
  })

  it('shows an error for an invalid postal code after blur', () => {
    render(<Harness />)
    const postcode = screen.getByLabelText('Postcode')
    fireEvent.change(postcode, { target: { value: '12' } })
    fireEvent.blur(postcode)
    expect(screen.getByText('Gebruik 4 cijfers (bijv. 9000)')).toBeInTheDocument()
  })

  it('reports residence field changes to the parent', () => {
    const onChange = vi.fn()
    render(<Step2Student students={[emptyStudent()]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Straat'), { target: { value: 'Kerkstraat' } })
    expect(onChange).toHaveBeenCalledWith(0, 'residenceStreet', 'Kerkstraat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/__tests__/Step2Student.test.tsx`
Expected: FAIL — current Step2Student has no "Straat"/"Onderwijsinstelling" combobox label.

- [ ] **Step 3: Rewrite `Step2Student.tsx`**

Replace the entire contents of `src/pages/wizard/Step2Student.tsx` with:

```tsx
import { type ChangeEvent, useState } from 'react'
import { AlertCircle, Camera } from 'lucide-react'
import { cn } from '../../lib/cn'
import InstitutionSelect from '../../components/InstitutionSelect'
import { isValidBelgianPostalCode } from '../../lib/residence'
import {
  formatDateOfBirthForInput,
  isMinor,
  isValidDateOfBirth,
  isValidEmail,
  toIsoDateOfBirth,
  type StudentFormData,
} from './types'

interface Step2StudentProps {
  students: StudentFormData[]
  onChange: (index: number, field: keyof StudentFormData, value: string | null) => void
}

type TouchedState = Partial<Record<keyof StudentFormData, boolean>>

interface TextField {
  field: keyof StudentFormData
  label: string
  type: string
  required: boolean
}

const PERSONAL_FIELDS: TextField[] = [
  { field: 'firstName', label: 'Voornaam', type: 'text', required: true },
  { field: 'lastName', label: 'Achternaam', type: 'text', required: true },
  { field: 'email', label: 'E-mail', type: 'email', required: true },
  { field: 'phone', label: 'Telefoon', type: 'tel', required: false },
  { field: 'dateOfBirth', label: 'Geboortedatum', type: 'text', required: true },
]

const STUDY_FIELDS: TextField[] = [
  { field: 'faculty', label: 'Faculteit / opleiding', type: 'text', required: false },
  { field: 'studentNumber', label: 'Studentennummer', type: 'text', required: true },
]

const RESIDENCE_FIELDS: TextField[] = [
  { field: 'residenceStreet', label: 'Straat', type: 'text', required: true },
  { field: 'residenceNumber', label: 'Huisnummer', type: 'text', required: true },
  { field: 'residenceBox', label: 'Bus', type: 'text', required: false },
  { field: 'residencePostalCode', label: 'Postcode', type: 'text', required: true },
  { field: 'residenceCity', label: 'Gemeente', type: 'text', required: true },
]

function fieldError(student: StudentFormData, field: keyof StudentFormData, required: boolean): string | null {
  if (field === 'email' && student.email && !isValidEmail(student.email)) return 'Vul een geldig e-mailadres in'
  if (field === 'dateOfBirth' && student.dateOfBirth && !isValidDateOfBirth(student.dateOfBirth)) {
    return 'Gebruik formaat dd-mm-jjjj'
  }
  if (field === 'residencePostalCode' && student.residencePostalCode && !isValidBelgianPostalCode(student.residencePostalCode)) {
    return 'Gebruik 4 cijfers (bijv. 9000)'
  }
  if (required && !student[field]) return 'Dit veld is verplicht'
  return null
}

function formatDateTyping(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

function normalizeDateChange(value: string): string {
  const formatted = formatDateTyping(value)
  return isValidDateOfBirth(formatted) ? toIsoDateOfBirth(formatted) : formatted
}

function TextInput({
  student,
  index,
  config,
  touched,
  onTouch,
  onChange,
}: {
  student: StudentFormData
  index: number
  config: TextField
  touched: boolean
  onTouch: () => void
  onChange: (field: keyof StudentFormData, value: string | null) => void
}) {
  const { field, label, type, required } = config
  const error = touched ? fieldError(student, field, required) : null
  const isDate = field === 'dateOfBirth'

  return (
    <div>
      <label
        htmlFor={`student-${index}-${field}`}
        className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500"
      >
        {label}
        {required && ' *'}
      </label>
      <input
        id={`student-${index}-${field}`}
        aria-label={label}
        aria-invalid={error ? 'true' : 'false'}
        type={type}
        inputMode={isDate ? 'numeric' : field === 'residencePostalCode' ? 'numeric' : undefined}
        autoComplete={isDate ? 'bday' : undefined}
        maxLength={isDate ? 10 : undefined}
        value={isDate ? formatDateOfBirthForInput(student.dateOfBirth) : (student[field] as string) ?? ''}
        onBlur={onTouch}
        onChange={event =>
          onChange(field, isDate ? normalizeDateChange(event.target.value) : event.target.value)
        }
        className={cn(
          'w-full rounded-xl border bg-white/60 px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2',
          error
            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
            : 'border-white/90 focus:border-accent/50 focus:ring-accent/20',
        )}
        placeholder={isDate ? 'dd-mm-jjjj' : label}
      />
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function StudentForm({
  student,
  index,
  showTitle,
  touched,
  onTouch,
  onChange,
}: {
  student: StudentFormData
  index: number
  showTitle: boolean
  touched: TouchedState
  onTouch: (field: keyof StudentFormData) => void
  onChange: (field: keyof StudentFormData, value: string | null) => void
}) {
  const minor = isMinor(student.dateOfBirth)

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange('photoUrl', reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/40 p-4 backdrop-blur-xl">
      {showTitle && (
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Student {index + 1}</p>
      )}

      <div className="flex items-center gap-4">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt="Foto student"
            className="h-16 w-16 rounded-2xl border-2 border-accent/30 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100">
            <Camera size={20} className="text-slate-400" />
          </div>
        )}
        <div>
          <label
            aria-label="Foto toevoegen"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent"
          >
            <Camera size={13} />
            {student.photoUrl ? 'Foto wijzigen' : 'Foto toevoegen'}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
          </label>
          <p className="mt-1 text-[10px] text-slate-400">Selfie of portretfoto</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {PERSONAL_FIELDS.map(config => (
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

      {minor && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-xs font-semibold text-amber-700">
          <AlertCircle size={13} />
          Minderjarig, voogd wordt vereist in de volgende stap
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-white/60 pt-3">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Studie</p>
        <div>
          <label
            htmlFor={`student-${index}-institution`}
            className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-500"
          >
            Onderwijsinstelling *
          </label>
          <InstitutionSelect
            id={`student-${index}-institution`}
            ariaLabel="Onderwijsinstelling"
            value={student.institution}
            onChange={value => onChange('institution', value)}
          />
        </div>
        {STUDY_FIELDS.map(config => (
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

      <div className="flex flex-col gap-3 border-t border-white/60 pt-3">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          Hoofdverblijf (domicilie)
        </p>
        {RESIDENCE_FIELDS.map(config => (
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
    </div>
  )
}

export default function Step2Student({ students, onChange }: Step2StudentProps) {
  const [touched, setTouched] = useState<TouchedState[]>(students.map(() => ({})))
  const showTitles = students.length > 1

  return (
    <div className="flex flex-col gap-4 p-4">
      {students.map((student, index) => (
        <StudentForm
          key={index}
          student={student}
          index={index}
          showTitle={showTitles}
          touched={touched[index] ?? {}}
          onTouch={field =>
            setTouched(prev => {
              const next = [...prev]
              next[index] = { ...(next[index] ?? {}), [field]: true }
              return next
            })
          }
          onChange={(field, value) => onChange(index, field, value)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Update `ContractNewPage.tsx`**

In `src/pages/ContractNewPage.tsx`, replace `emptyStudent()`:

```ts
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
    primaryResidence: '',
    residenceStreet: '',
    residenceNumber: '',
    residenceBox: '',
    residencePostalCode: '',
    residenceCity: '',
  }
}
```

And replace `studentIsComplete()`:

```ts
function studentIsComplete(student: StudentFormData): boolean {
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
      student.residenceCity.trim(),
  )
}
```

Add the import at the top of `ContractNewPage.tsx` (next to the other `./wizard/types` import group):

```ts
import { isValidBelgianPostalCode } from '../lib/residence'
```

- [ ] **Step 5: Run tests + build**

Run: `npm run test:run -- src/__tests__/Step2Student.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: PASS (`primaryResidence` still present in types and unused references compile).

- [ ] **Step 6: Commit**

```bash
git add src/pages/wizard/Step2Student.tsx src/pages/ContractNewPage.tsx src/__tests__/Step2Student.test.tsx
git commit -m "feat(studentdata): split residence + institution selector in wizard step 2"
```

---

## Task 6: Data layer + mock data

**Files:**
- Modify: `src/lib/data.ts` (`StudentRow`, `mapStudent`, `ContractDraftStudent`, `createContractDraft`)
- Modify: `src/lib/mockData.ts` (`STUDENTS`)

- [ ] **Step 1: Extend `StudentRow` and `mapStudent`**

In `src/lib/data.ts`, add the new columns to `StudentRow`:

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
  primary_residence: string | null
  residence_street: string | null
  residence_number: string | null
  residence_box: string | null
  residence_postal_code: string | null
  residence_city: string | null
  created_at: string
}
```

Update `mapStudent` to map them:

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
    createdAt: row.created_at,
  }
}
```

- [ ] **Step 2: Extend `ContractDraftStudent` and the insert in `createContractDraft`**

In `src/lib/data.ts`, update the `ContractDraftStudent` interface:

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
}
```

In `createContractDraft`, update the `students.insert(...)` mapping object to write the new
columns (replace the `primary_residence` line):

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
      })),
```

- [ ] **Step 3: Convert `STUDENTS` in `mockData.ts`**

In `src/lib/mockData.ts`, replace the `STUDENTS` array with structured fields (institution
canonical + faculty split out + address split). Use these exact records:

```ts
export const STUDENTS: Student[] = [
  { id: 's1', firstName: 'Emma', lastName: 'Janssen', email: 'emma.janssen@student.ugent.be', phone: '0470 11 22 33', dateOfBirth: '2005-03-14', institution: 'Universiteit Gent', faculty: 'Faculteit Ingenieurswetenschappen', studentNumber: '202401234', residenceStreet: 'Kerkstraat', residenceNumber: '22', residencePostalCode: '9200', residenceCity: 'Dendermonde', createdAt: '2025-08-15' },
  { id: 's2', firstName: 'Liam', lastName: 'Pieters', email: 'liam.pieters@student.ugent.be', phone: '0471 44 55 66', dateOfBirth: '2004-07-22', institution: 'Universiteit Gent', faculty: 'Faculteit Economie', studentNumber: '202401235', residenceStreet: 'Molenstraat', residenceNumber: '5', residencePostalCode: '9000', residenceCity: 'Gent', createdAt: '2025-08-16' },
  { id: 's3', firstName: 'Sara', lastName: 'Bogaert', email: 'sara.bogaert@student.ugent.be', phone: '0472 77 88 99', dateOfBirth: '2005-11-03', institution: 'Hogeschool Gent', faculty: 'Faculteit Gezondheid', studentNumber: '202401236', residenceStreet: 'Gentstraat', residenceNumber: '88', residencePostalCode: '9800', residenceCity: 'Deinze', createdAt: '2025-08-17' },
  { id: 's4', firstName: 'Noah', lastName: 'De Smedt', email: 'noah.desmedt@student.ugent.be', phone: '0473 00 11 22', dateOfBirth: '2004-05-18', institution: 'Universiteit Gent', faculty: 'Faculteit Recht', studentNumber: '202401237', residenceStreet: 'Stationslaan', residenceNumber: '12', residencePostalCode: '9300', residenceCity: 'Aalst', createdAt: '2025-08-18' },
  { id: 's5', firstName: 'Fien', lastName: 'Vandenberghe', email: 'fien.vandenberghe@student.ugent.be', phone: '0474 33 44 55', dateOfBirth: '2005-09-27', institution: 'Universiteit Gent', faculty: 'Faculteit Wetenschappen', studentNumber: '202401238', residenceStreet: 'Dorpsstraat', residenceNumber: '3', residencePostalCode: '9830', residenceCity: 'Sint-Martens-Latem', createdAt: '2025-08-19' },
  { id: 's-demo-student', firstName: 'Vincent', lastName: 'Grobben', email: 'vincent.grobben@example.com', phone: '0470 00 00 00', dateOfBirth: '2005-01-01', institution: 'Hogeschool Gent', faculty: '', studentNumber: 'DEMO-001', residenceStreet: 'Teststraat', residenceNumber: '1', residencePostalCode: '9000', residenceCity: 'Gent', createdAt: '2025-08-23' },
]
```

- [ ] **Step 4: Run the full suite + build**

Run: `npm run test:run`
Expected: PASS (existing tests unaffected; `primaryResidence` still optional in the type).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/lib/mockData.ts
git commit -m "feat(studentdata): map residence + faculty columns and update mock data"
```

---

## Task 7: Contract display (minimal)

**Files:**
- Modify: `src/lib/pdfDocuments.ts`

- [ ] **Step 1: Import the helper**

At the top of `src/lib/pdfDocuments.ts`, add to the existing imports:

```ts
import { formatResidence } from './residence'
```

- [ ] **Step 2: Replace the institution + hoofdverblijf rows**

In `generateContractHtml`, find the HUURDER field rows and replace the institution and
`primaryResidence` lines so they read:

```ts
${student.institution ? `<div class="field-row"><span class="field-label">Onderwijsinstelling:</span><span>${escapeHtml(student.institution)}</span></div>` : ''}
${student.faculty ? `<div class="field-row"><span class="field-label">Faculteit:</span><span>${escapeHtml(student.faculty)}</span></div>` : ''}
${student.studentNumber ? `<div class="field-row"><span class="field-label">Studentennummer:</span><span>${escapeHtml(student.studentNumber)}</span></div>` : ''}
${formatResidence(student) ? `<div class="field-row"><span class="field-label">Hoofdverblijf:</span><span>${escapeHtml(formatResidence(student))}</span></div>` : ''}
```

(The previous `student.primaryResidence ? ... : ''` line is removed; `formatResidence(student)`
replaces it.)

- [ ] **Step 3: Build to confirm types**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdfDocuments.ts
git commit -m "feat(studentdata): show composed residence + faculty in contract"
```

---

## Task 8: Remove `primaryResidence` + add migration

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/pages/wizard/types.ts`
- Modify: `src/pages/ContractNewPage.tsx`
- Modify: `src/lib/data.ts`
- Create: `supabase/migrations/20260606120000_student_residence_institution.sql`

- [ ] **Step 1: Find every remaining reference**

Run: `npm run test:run` first to confirm green baseline, then search:

Run (PowerShell): `Select-String -Path src -Pattern "primaryResidence|primary_residence" -Recurse`
Expected: matches in `src/types/index.ts`, `src/pages/wizard/types.ts`, `src/pages/ContractNewPage.tsx` (`emptyStudent`), `src/lib/data.ts` (`StudentRow`), and `src/__tests__/Step2Student.test.tsx` (`emptyStudent`).

- [ ] **Step 2: Remove the field everywhere**

- In `src/types/index.ts`: delete the `primaryResidence?: string` line from `Student`.
- In `src/pages/wizard/types.ts`: delete the `primaryResidence: string` line from `StudentFormData`.
- In `src/pages/ContractNewPage.tsx`: delete the `primaryResidence: '',` line from `emptyStudent()`.
- In `src/lib/data.ts`: delete the `primary_residence: string | null` line from `StudentRow`.
- In `src/__tests__/Step2Student.test.tsx`: delete the `primaryResidence: '',` line from the test's `emptyStudent()` (otherwise `tsc -b` reports an excess property).

(The `students` table keeps its `primary_residence` column in the DB; we simply stop
selecting it into a typed field. `select('*')` still returns it harmlessly.)

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/20260606120000_student_residence_institution.sql`:

```sql
-- Cluster B: gesplitst domicilieadres + losse faculteit voor studenten.
alter table students
  add column if not exists residence_street      text,
  add column if not exists residence_number      text,
  add column if not exists residence_box         text,
  add column if not exists residence_postal_code text,
  add column if not exists residence_city        text,
  add column if not exists faculty               text;

-- De oude kolom primary_residence blijft bestaan (niet-destructief) maar wordt
-- door de applicatie niet langer geschreven of gelezen.
```

- [ ] **Step 4: Verify nothing references the removed field**

Run (PowerShell): `Select-String -Path src -Pattern "primaryResidence" -Recurse`
Expected: no matches.

- [ ] **Step 5: Full suite + build**

Run: `npm run test:run`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/pages/wizard/types.ts src/pages/ContractNewPage.tsx src/lib/data.ts supabase/migrations/20260606120000_student_residence_institution.sql
git commit -m "feat(studentdata): drop primaryResidence field and add residence/faculty migration"
```

---

## Task 9: Regeneration script

**Files:**
- Create: `scripts/generate-institutions.mjs`
- Modify: `package.json`

The Hoger Onderwijsregister page is a single-page app that loads its data from a JSON
endpoint. This script fetches that endpoint, extracts institution names, dedupes, sorts,
and rewrites `src/lib/institutions.ts`. The endpoint constant must be confirmed once (see
Step 1) because it cannot be read from the rendered HTML.

- [ ] **Step 1: Confirm the data endpoint (one-time manual step)**

Open `https://www.hogeronderwijsregister.be/instellingen` in a browser, open DevTools →
Network tab, reload, and look for the XHR/fetch request that returns the institution list
as JSON. Copy its full URL. If you cannot find one, leave the default below and run the
script later — the curated list from Task 2 remains the fallback in the meantime.

- [ ] **Step 2: Create the script**

Create `scripts/generate-institutions.mjs`:

```js
// Hergenereert src/lib/institutions.ts uit het Hoger Onderwijsregister.
// Draaien: npm run institutions:update
// Bevestig SOURCE_URL via de Network-tab op
// https://www.hogeronderwijsregister.be/instellingen (zoek de JSON-fetch).
import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://www.hogeronderwijsregister.be/instellingen'
const OUTPUT = new URL('../src/lib/institutions.ts', import.meta.url)

// Haal de namen uit de JSON-respons. De HOR-respons is een lijst van objecten;
// we proberen de gangbare naam-velden in volgorde van voorkeur.
function extractNames(json) {
  const rows = Array.isArray(json) ? json : json.data ?? json.instellingen ?? json.results ?? []
  return rows
    .map(row => row.naam ?? row.name ?? row.instellingsnaam ?? row.label ?? '')
    .map(name => String(name).trim())
    .filter(Boolean)
}

async function main() {
  const response = await fetch(SOURCE_URL, { headers: { accept: 'application/json' } })
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('json')) {
    console.error(
      `Bron gaf geen JSON terug (status ${response.status}, type "${contentType}").\n` +
        'Bevestig de JSON-endpoint-URL via de Network-tab en zet die in SOURCE_URL.',
    )
    process.exit(1)
  }

  const json = await response.json()
  const names = [...new Set(extractNames(json))].sort((a, b) => a.localeCompare(b, 'nl'))
  if (names.length === 0) {
    console.error('Geen instellingsnamen gevonden — controleer extractNames() tegen de JSON-vorm.')
    process.exit(1)
  }

  const body =
    '// Erkende Vlaamse hogeronderwijsinstellingen.\n' +
    '// AUTOGEGENEREERD via `npm run institutions:update` — niet handmatig bewerken.\n' +
    '// Bron: https://www.hogeronderwijsregister.be/instellingen\n' +
    'export const VLAAMSE_INSTELLINGEN: string[] = [\n' +
    names.map(name => `  ${JSON.stringify(name)},`).join('\n') +
    '\n]\n'

  await writeFile(OUTPUT, body, 'utf8')
  console.log(`institutions.ts bijgewerkt met ${names.length} instellingen.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 3: Add the npm script**

In `package.json`, add to `"scripts"`:

```json
    "institutions:update": "node scripts/generate-institutions.mjs"
```

- [ ] **Step 4: Smoke-test the script wiring (non-fatal)**

Run: `npm run institutions:update`
Expected: either it prints "institutions.ts bijgewerkt met N instellingen." (endpoint
returned JSON), or it prints the "Bron gaf geen JSON terug" guidance and exits 1. Both are
acceptable outcomes for this commit — the curated list stays in place if the endpoint
isn't confirmed yet. If it rewrote the file, run `npm run test:run -- src/__tests__/institutions.test.ts`
and confirm PASS (re-sort handled by the script).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-institutions.mjs package.json src/lib/institutions.ts
git commit -m "chore(studentdata): add institution list regeneration script"
```

---

## Final verification

- [ ] Run the whole suite: `npm run test:run` → all green.
- [ ] Type-check + build: `npm run build` → succeeds.
- [ ] Confirm no `primaryResidence` references remain: `Select-String -Path src -Pattern "primaryResidence" -Recurse` → no matches.
- [ ] Manual smoke (optional): `npm run dev`, open the contract wizard → step 2 shows the
  institution combobox, the "Andere…" fallback, and the split residence fields; an invalid
  postcode blocks "Volgende".

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| #9 split residence into 5 fields | 4, 5, 6, 8 |
| #9 separate DB columns (non-destructive) | 8 |
| #9 `formatResidence` for display | 1, 7 |
| #9 Belgian postcode validation | 1, 5 |
| #11 bundled curated list | 2 |
| #11 regeneration script + npm script | 9 |
| #11 institution = dropdown, faculty separate | 3, 4, 5 |
| #11 Flanders coverage | 2 |
| #11 "Andere…" free-text fallback | 3, 5 |
| Minimal contract display update | 7 |
| Mock data converted | 6 |
| Tests | 1, 2, 3, 5 |
