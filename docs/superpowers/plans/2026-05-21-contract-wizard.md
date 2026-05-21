# KotStart — Contract Wizard Implementation Plan (Phase 2)

> **For agentic workers:** Execute this plan task-by-task using TDD. Steps use checkbox (`- [ ]`) syntax. Work from `/Users/arryawillems/Desktop/Projects/StudentOnboarding`.

**Goal:** Vervang de stub ContractNewPage door een volledig werkende 4-stappen wizard met StepIndicator, kamer selectie, studentformulier(en) met foto, tweede partij sectie en overzicht.

**Architecture:** ContractNewPage beheert alle wizard state. WizardLayout verzorgt de StepIndicator + navigatieknoppen + swipe animaties. Elke stap is een losstaand component. Alle data uit mockData.ts (geen Supabase).

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Framer Motion, Lucide React, Vitest + @testing-library/react. Bestaande `cn()`, `mockData`, `types` en glass CSS-classes zijn al aanwezig.

**Taal:** Alle tekst in het Nederlands (nl-BE).

---

## Bestaande context (belangrijk voor Codex)

De volgende bestanden bestaan al en moeten NIET worden gewijzigd tenzij vermeld:
- `src/lib/mockData.ts` — bevat ROOMS, PROPERTIES, SCHOOL_YEARS
- `src/lib/cn.ts` — cn() utility
- `src/types/index.ts` — Room, Property, Student, Contract interfaces
- `src/index.css` — glass, glass-chip, btn-primary, btn-action-* classes
- `src/pages/ContractNewPage.tsx` — huidige STUB, wordt vervangen in Task 7

---

## File Map

```
src/pages/wizard/
  StepIndicator.tsx           — cirkels + lijn stapindicator
  WizardLayout.tsx            — wrapper met navigatieknoppen + swipe
  Step1Room.tsx               — kamer selectie
  Step2Student.tsx            — student formulier + foto capture
  Step3SecondParty.tsx        — tweede partij toggles + voogd auto-detect
  Step4Review.tsx             — samenvatting + versturen

src/pages/
  ContractNewPage.tsx         — orchestreert alle wizard state (VERVANGT stub)

src/__tests__/
  StepIndicator.test.tsx
  WizardLayout.test.tsx
  Step1Room.test.tsx
  Step2Student.test.tsx
  Step3SecondParty.test.tsx
  Step4Review.test.tsx
  ContractNewPage.test.tsx
```

---

## Wizard State Types (definieer in ContractNewPage.tsx)

```ts
interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
}

interface SecondPartyData {
  name: string
  email: string
}

interface GuardianData {
  name: string
  email: string
  phone: string
}

interface WizardState {
  currentStep: 1 | 2 | 3 | 4
  selectedRoomId: string | null
  students: StudentFormData[]
  secondLandlord: SecondPartyData | null
  secondTenant: SecondPartyData | null
  guardian: GuardianData | null
}
```

Helper function (definieer in ContractNewPage.tsx):
```ts
function isMinor(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false
  const dob = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  return age < 18 || (age === 18 && m < 0) || (age === 18 && m === 0 && today.getDate() < dob.getDate())
}
```

---

### Task 1: StepIndicator component (TDD)

**Files:**
- Create: `src/pages/wizard/StepIndicator.tsx`
- Create: `src/__tests__/StepIndicator.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/StepIndicator.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StepIndicator from '../pages/wizard/StepIndicator'

const STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

describe('StepIndicator', () => {
  it('toont alle staplabels', () => {
    render(<StepIndicator steps={STEPS} currentStep={1} />)
    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Partij')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
  })

  it('markeert stap 2 als actief bij currentStep=2', () => {
    render(<StepIndicator steps={STEPS} currentStep={2} />)
    expect(screen.getByTestId('step-2')).toHaveAttribute('data-active', 'true')
  })

  it('markeert stap 1 als voltooid bij currentStep=2', () => {
    render(<StepIndicator steps={STEPS} currentStep={2} />)
    expect(screen.getByTestId('step-1')).toHaveAttribute('data-done', 'true')
  })

  it('toont vinkje voor voltooide stappen', () => {
    render(<StepIndicator steps={STEPS} currentStep={3} />)
    const step1 = screen.getByTestId('step-1')
    expect(step1.textContent).toContain('✓')
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**
```bash
npm run test:run 2>&1 | grep -A5 "StepIndicator"
```

- [ ] **Stap 3: Implementeer StepIndicator**

Maak `src/pages/wizard/` directory aan en schrijf `src/pages/wizard/StepIndicator.tsx`:

```tsx
import { cn } from '../../lib/cn'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start gap-0 px-4 py-4">
      {steps.map((label, idx) => {
        const stepNum = idx + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={label} className="flex-1 flex flex-col items-center relative">
            {/* Verbindingslijn naar volgende stap */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'absolute top-3.5 left-1/2 w-full h-0.5 transition-colors duration-300',
                  isDone ? 'bg-accent' : 'bg-slate-200/80',
                )}
              />
            )}

            {/* Cirkel */}
            <div
              data-testid={`step-${stepNum}`}
              data-active={isActive ? 'true' : 'false'}
              data-done={isDone ? 'true' : 'false'}
              className={cn(
                'relative z-10 w-7 h-7 rounded-full flex items-center justify-center',
                'text-xs font-bold transition-all duration-300',
                isDone && 'bg-accent text-white border-2 border-accent',
                isActive && 'bg-gradient-to-br from-accent to-accent-dark text-white border-2 border-accent-dark shadow-[0_0_0_3px_rgba(99,102,241,0.2)]',
                !isDone && !isActive && 'bg-slate-100 text-slate-400 border-2 border-slate-200',
              )}
            >
              {isDone ? '✓' : stepNum}
            </div>

            {/* Label */}
            <span
              className={cn(
                'mt-1.5 text-[9.5px] font-semibold text-center leading-tight',
                isActive ? 'text-accent' : isDone ? 'text-accent/70' : 'text-slate-400',
              )}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```
Verwacht: alle tests slagen (incl. 4 nieuwe StepIndicator tests).

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/StepIndicator.tsx src/__tests__/StepIndicator.test.tsx
git commit -m "feat: StepIndicator component (cirkels + verbindingslijn)"
```

---

### Task 2: WizardLayout component (TDD)

**Files:**
- Create: `src/pages/wizard/WizardLayout.tsx`
- Create: `src/__tests__/WizardLayout.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/WizardLayout.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import WizardLayout from '../pages/wizard/WizardLayout'

const STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

function renderWizard(props = {}) {
  return render(
    <MemoryRouter>
      <WizardLayout
        steps={STEPS}
        currentStep={2}
        onBack={vi.fn()}
        onNext={vi.fn()}
        canProceed={true}
        isLastStep={false}
        isSending={false}
        {...props}
      >
        <div>Stap inhoud</div>
      </WizardLayout>
    </MemoryRouter>
  )
}

describe('WizardLayout', () => {
  it('toont de stapindicator', () => {
    renderWizard()
    expect(screen.getByText('Kamer')).toBeInTheDocument()
  })

  it('toont de inhoud van de huidige stap', () => {
    renderWizard()
    expect(screen.getByText('Stap inhoud')).toBeInTheDocument()
  })

  it('roept onNext aan bij klik op Volgende', () => {
    const onNext = vi.fn()
    renderWizard({ onNext })
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('roept onBack aan bij klik op Terug', () => {
    const onBack = vi.fn()
    renderWizard({ onBack })
    fireEvent.click(screen.getByRole('button', { name: /terug/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('toont "Contract versturen" op de laatste stap', () => {
    renderWizard({ isLastStep: true })
    expect(screen.getByRole('button', { name: /contract versturen/i })).toBeInTheDocument()
  })

  it('disablet Volgende knop als canProceed false is', () => {
    renderWizard({ canProceed: false })
    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Implementeer WizardLayout**

```tsx
// src/pages/wizard/WizardLayout.tsx
import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import StepIndicator from './StepIndicator'
import { cn } from '../../lib/cn'

interface WizardLayoutProps {
  steps: string[]
  currentStep: number
  onBack: () => void
  onNext: () => void
  canProceed: boolean
  isLastStep: boolean
  isSending: boolean
  children: ReactNode
}

export default function WizardLayout({
  steps,
  currentStep,
  onBack,
  onNext,
  canProceed,
  isLastStep,
  isSending,
  children,
}: WizardLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Stap indicator */}
      <div className="bg-white/38 backdrop-blur-xl border-b border-white/65">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {/* Stap inhoud */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigatie */}
      <div className="bg-white/38 backdrop-blur-xl border-t border-white/65 px-4 py-3 flex gap-3">
        <button
          type="button"
          aria-label="Terug"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-white/60 border border-white/90"
        >
          ← Terug
        </button>

        <button
          type="button"
          aria-label={isLastStep ? 'Contract versturen' : 'Volgende'}
          onClick={onNext}
          disabled={!canProceed || isSending}
          className={cn(
            'flex-[2] py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2',
            'btn-primary transition-opacity',
            (!canProceed || isSending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isSending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt verstuurd...
            </>
          ) : isLastStep ? (
            'Contract versturen →'
          ) : (
            'Volgende →'
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/WizardLayout.tsx src/__tests__/WizardLayout.test.tsx
git commit -m "feat: WizardLayout met navigatie, animaties en Framer Motion step transitions"
```

---

### Task 3: Step1Room component (TDD)

**Files:**
- Create: `src/pages/wizard/Step1Room.tsx`
- Create: `src/__tests__/Step1Room.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/Step1Room.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Step1Room from '../pages/wizard/Step1Room'
import { ROOMS } from '../lib/mockData'

const rooms = ROOMS.filter(r => r.propertyId === 'p1')

describe('Step1Room', () => {
  it('toont alle beschikbare kamers', () => {
    render(<Step1Room rooms={rooms} selectedRoomId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('toont samenvatting-card na selectie', () => {
    render(<Step1Room rooms={rooms} selectedRoomId="r1" onSelect={vi.fn()} />)
    expect(screen.getByText(/€ 450/)).toBeInTheDocument()
  })

  it('roept onSelect aan bij klikken op een kamer', () => {
    const onSelect = vi.fn()
    render(<Step1Room rooms={rooms} selectedRoomId={null} onSelect={onSelect} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onSelect).toHaveBeenCalledWith('r1')
  })

  it('toont "2 personen" badge bij dubbele kamer', () => {
    render(<Step1Room rooms={rooms} selectedRoomId="r6" onSelect={vi.fn()} />)
    expect(screen.getByText(/2 personen/i)).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Implementeer Step1Room**

```tsx
// src/pages/wizard/Step1Room.tsx
import { Home, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Room } from '../../types'

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

interface Step1RoomProps {
  rooms: Room[]
  selectedRoomId: string | null
  onSelect: (id: string) => void
}

export default function Step1Room({ rooms, selectedRoomId, onSelect }: Step1RoomProps) {
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-slate-600 mb-1">Kies een kamer</p>

      {rooms.map(room => {
        const isSelected = room.id === selectedRoomId
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-150',
              'bg-white/55 backdrop-blur-xl',
              isSelected
                ? 'border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                : 'border-white/75 hover:border-white/90 hover:bg-white/70',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  isSelected ? 'bg-accent/10' : 'bg-slate-100',
                )}>
                  {room.roomType === 'double'
                    ? <Users size={16} className={isSelected ? 'text-accent' : 'text-slate-500'} />
                    : <Home size={16} className={isSelected ? 'text-accent' : 'text-slate-500'} />
                  }
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Kamer {room.roomNumber}</p>
                  <p className="text-xs text-slate-500">{ROOM_TYPE_LABEL[room.roomType]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">€ {room.monthlyRent}</p>
                <p className="text-xs text-slate-400">/maand</p>
              </div>
            </div>
            {room.roomType === 'double' && (
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-renew-blue bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-full">
                <Users size={10} /> 2 personen — twee studentformulieren volgen
              </span>
            )}
          </button>
        )
      })}

      {/* Samenvatting-card */}
      {selectedRoom && (
        <div className="mt-2 glass rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Overzicht kamer {selectedRoom.roomNumber}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Type', ROOM_TYPE_LABEL[selectedRoom.roomType]],
              ['Huurprijs', `€ ${selectedRoom.monthlyRent}/maand`],
              ['Studentenbelasting', `€ ${selectedRoom.studentTax}/maand`],
              ['Vaste kosten', `€ ${selectedRoom.fixedCosts}/maand`],
              ['Waarborg', `€ ${selectedRoom.deposit}`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] text-slate-400 font-semibold">{label}</p>
                <p className="text-sm font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/Step1Room.tsx src/__tests__/Step1Room.test.tsx
git commit -m "feat: Step1Room — kamer selectie met samenvatting-card"
```

---

### Task 4: Step2Student component (TDD)

**Files:**
- Create: `src/pages/wizard/Step2Student.tsx`
- Create: `src/__tests__/Step2Student.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/Step2Student.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Step2Student from '../pages/wizard/Step2Student'

const emptyStudent = { firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', photoUrl: null }

describe('Step2Student', () => {
  it('toont voornaam, achternaam, e-mail, telefoon, geboortedatum velden', () => {
    render(<Step2Student students={[emptyStudent]} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/voornaam/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/achternaam/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/geboortedatum/i)).toBeInTheDocument()
  })

  it('toont twee formulieren bij twee studenten', () => {
    render(<Step2Student students={[emptyStudent, emptyStudent]} onChange={vi.fn()} />)
    expect(screen.getByText('Student 1')).toBeInTheDocument()
    expect(screen.getByText('Student 2')).toBeInTheDocument()
  })

  it('roept onChange aan bij invullen voornaam', () => {
    const onChange = vi.fn()
    render(<Step2Student students={[emptyStudent]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/voornaam/i), { target: { value: 'Emma' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('toont minderjarig badge bij geboortedatum < 18 jaar', () => {
    const minor = { ...emptyStudent, dateOfBirth: '2015-01-01' }
    render(<Step2Student students={[minor]} onChange={vi.fn()} />)
    expect(screen.getByText(/minderjarig/i)).toBeInTheDocument()
  })

  it('toont foto-upload knop', () => {
    render(<Step2Student students={[emptyStudent]} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/foto/i)).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Implementeer Step2Student**

```tsx
// src/pages/wizard/Step2Student.tsx
import { Camera, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
}

interface Step2StudentProps {
  students: StudentFormData[]
  onChange: (index: number, field: keyof StudentFormData, value: string | null) => void
}

function isMinor(dob: string): boolean {
  if (!dob) return false
  const birth = new Date(dob)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return age < 18 || (age === 18 && m < 0) || (age === 18 && m === 0 && today.getDate() < birth.getDate())
}

function StudentForm({
  student,
  index,
  showTitle,
  onChange,
}: {
  student: StudentFormData
  index: number
  showTitle: boolean
  onChange: (field: keyof StudentFormData, value: string | null) => void
}) {
  const minor = isMinor(student.dateOfBirth)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange('photoUrl', reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/70 rounded-2xl p-4 flex flex-col gap-3">
      {showTitle && (
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student {index + 1}</p>
      )}

      {/* Foto */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {student.photoUrl ? (
            <img
              src={student.photoUrl}
              alt="Foto"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-accent/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
              <Camera size={20} className="text-slate-400" />
            </div>
          )}
        </div>
        <div>
          <label
            aria-label="Foto toevoegen"
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-2 rounded-xl"
          >
            <Camera size={13} />
            {student.photoUrl ? 'Foto wijzigen' : 'Foto toevoegen'}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </label>
          <p className="text-[10px] text-slate-400 mt-1">Selfie of portretfoto</p>
        </div>
      </div>

      {/* Velden */}
      {[
        { field: 'firstName' as const, label: 'Voornaam', type: 'text', required: true },
        { field: 'lastName' as const, label: 'Achternaam', type: 'text', required: true },
        { field: 'email' as const, label: 'E-mail', type: 'email', required: true },
        { field: 'phone' as const, label: 'Telefoon', type: 'tel', required: false },
        { field: 'dateOfBirth' as const, label: 'Geboortedatum', type: 'date', required: true },
      ].map(({ field, label, type, required }) => (
        <div key={field}>
          <label
            htmlFor={`student-${index}-${field}`}
            className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1"
          >
            {label}{required && ' *'}
          </label>
          <input
            id={`student-${index}-${field}`}
            aria-label={label}
            type={type}
            value={student[field] ?? ''}
            onChange={e => onChange(field, e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-white/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            placeholder={label}
          />
        </div>
      ))}

      {/* Minderjarig badge */}
      {minor && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/60 px-3 py-2 rounded-xl">
          <AlertCircle size={13} />
          Minderjarig — voogd wordt vereist in de volgende stap
        </div>
      )}
    </div>
  )
}

export default function Step2Student({ students, onChange }: Step2StudentProps) {
  const showTitles = students.length > 1

  return (
    <div className="p-4 flex flex-col gap-4">
      {students.map((student, idx) => (
        <StudentForm
          key={idx}
          student={student}
          index={idx}
          showTitle={showTitles}
          onChange={(field, value) => onChange(idx, field, value)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/Step2Student.tsx src/__tests__/Step2Student.test.tsx
git commit -m "feat: Step2Student — studentformulier met foto capture en minderjarig detectie"
```

---

### Task 5: Step3SecondParty component (TDD)

**Files:**
- Create: `src/pages/wizard/Step3SecondParty.tsx`
- Create: `src/__tests__/Step3SecondParty.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/Step3SecondParty.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Step3SecondParty from '../pages/wizard/Step3SecondParty'

const defaultProps = {
  roomType: 'single' as const,
  hasMinor: false,
  secondLandlord: null,
  secondTenant: null,
  guardian: null,
  onSecondLandlordChange: vi.fn(),
  onSecondTenantChange: vi.fn(),
  onGuardianChange: vi.fn(),
}

describe('Step3SecondParty', () => {
  it('toont toggle voor tweede verhuurder', () => {
    render(<Step3SecondParty {...defaultProps} />)
    expect(screen.getByText(/tweede verhuurder/i)).toBeInTheDocument()
  })

  it('toont toggle voor tweede bewoner bij single kamer', () => {
    render(<Step3SecondParty {...defaultProps} roomType="single" />)
    expect(screen.getByText(/tweede bewoner/i)).toBeInTheDocument()
  })

  it('verbergt toggle voor tweede bewoner bij dubbele kamer', () => {
    render(<Step3SecondParty {...defaultProps} roomType="double" />)
    expect(screen.queryByText(/tweede bewoner/i)).not.toBeInTheDocument()
  })

  it('toont voogd-sectie automatisch bij minderjarige student', () => {
    render(<Step3SecondParty {...defaultProps} hasMinor={true} />)
    expect(screen.getByText(/voogd/i)).toBeInTheDocument()
    expect(screen.getByText(/vereist/i)).toBeInTheDocument()
  })

  it('verbergt voogd-sectie als geen minderjarigen', () => {
    render(<Step3SecondParty {...defaultProps} hasMinor={false} />)
    expect(screen.queryByText(/voogd/i)).not.toBeInTheDocument()
  })

  it('expandeert tweede verhuurder formulier na toggle', () => {
    render(<Step3SecondParty {...defaultProps} />)
    const toggle = screen.getByRole('switch', { name: /tweede verhuurder/i })
    fireEvent.click(toggle)
    expect(screen.getByLabelText(/naam verhuurder/i)).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Implementeer Step3SecondParty**

```tsx
// src/pages/wizard/Step3SecondParty.tsx
import { useState } from 'react'
import { AlertCircle, Building2, User, Shield } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { Room } from '../../types'

interface SecondPartyData { name: string; email: string }
interface GuardianData { name: string; email: string; phone: string }

interface Step3SecondPartyProps {
  roomType: Room['roomType']
  hasMinor: boolean
  secondLandlord: SecondPartyData | null
  secondTenant: SecondPartyData | null
  guardian: GuardianData | null
  onSecondLandlordChange: (data: SecondPartyData | null) => void
  onSecondTenantChange: (data: SecondPartyData | null) => void
  onGuardianChange: (data: GuardianData | null) => void
}

function Toggle({ label, checked, onChange, ariaLabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full"
    >
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className={cn('w-11 h-6 rounded-full transition-colors duration-200 relative', checked ? 'bg-accent' : 'bg-slate-200')}>
        <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </div>
    </button>
  )
}

function PartyFields({ prefix, value, onChange, fields }: {
  prefix: string
  value: Record<string, string>
  onChange: (field: string, val: string) => void
  fields: { field: string; label: string; type: string }[]
}) {
  return (
    <div className="flex flex-col gap-2 pt-3">
      {fields.map(({ field, label, type }) => (
        <div key={field}>
          <label htmlFor={`${prefix}-${field}`} className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
          <input
            id={`${prefix}-${field}`}
            aria-label={label}
            type={type}
            value={value[field] ?? ''}
            onChange={e => onChange(field, e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-white/90 text-sm font-medium text-slate-900 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            placeholder={label}
          />
        </div>
      ))}
    </div>
  )
}

export default function Step3SecondParty({
  roomType, hasMinor,
  secondLandlord, secondTenant, guardian,
  onSecondLandlordChange, onSecondTenantChange, onGuardianChange,
}: Step3SecondPartyProps) {
  const [showLandlord, setShowLandlord] = useState(secondLandlord !== null)
  const [showTenant, setShowTenant] = useState(secondTenant !== null)

  const nothingVisible = !showLandlord && (roomType === 'double' || !showTenant) && !hasMinor

  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Tweede verhuurder */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/70 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
            <Building2 size={15} className="text-teal-600" />
          </div>
          <Toggle
            label="Tweede verhuurder"
            ariaLabel="Tweede verhuurder"
            checked={showLandlord}
            onChange={v => {
              setShowLandlord(v)
              onSecondLandlordChange(v ? { name: '', email: '' } : null)
            }}
          />
        </div>
        {showLandlord && (
          <PartyFields
            prefix="landlord"
            value={secondLandlord ?? { name: '', email: '' }}
            onChange={(field, val) => onSecondLandlordChange({ ...(secondLandlord ?? { name: '', email: '' }), [field]: val })}
            fields={[
              { field: 'name', label: 'Naam verhuurder', type: 'text' },
              { field: 'email', label: 'E-mail verhuurder', type: 'email' },
            ]}
          />
        )}
      </div>

      {/* Tweede bewoner — enkel bij single/studio */}
      {roomType !== 'double' && (
        <div className="bg-white/40 backdrop-blur-xl border border-white/70 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <User size={15} className="text-renew-blue" />
            </div>
            <Toggle
              label="Tweede bewoner"
              ariaLabel="Tweede bewoner"
              checked={showTenant}
              onChange={v => {
                setShowTenant(v)
                onSecondTenantChange(v ? { name: '', email: '' } : null)
              }}
            />
          </div>
          {showTenant && (
            <PartyFields
              prefix="tenant"
              value={secondTenant ?? { name: '', email: '' }}
              onChange={(field, val) => onSecondTenantChange({ ...(secondTenant ?? { name: '', email: '' }), [field]: val })}
              fields={[
                { field: 'name', label: 'Naam bewoner', type: 'text' },
                { field: 'email', label: 'E-mail bewoner', type: 'email' },
              ]}
            />
          )}
        </div>
      )}

      {/* Voogd — automatisch bij minderjarige */}
      {hasMinor && (
        <div className="bg-amber-50/60 backdrop-blur-xl border border-amber-200/60 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield size={15} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Voogd</p>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Vereist — student is minderjarig</span>
            </div>
          </div>
          <PartyFields
            prefix="guardian"
            value={guardian ?? { name: '', email: '', phone: '' }}
            onChange={(field, val) => onGuardianChange({ ...(guardian ?? { name: '', email: '', phone: '' }), [field]: val })}
            fields={[
              { field: 'name', label: 'Naam voogd', type: 'text' },
              { field: 'email', label: 'E-mail voogd', type: 'email' },
              { field: 'phone', label: 'Telefoon voogd', type: 'tel' },
            ]}
          />
        </div>
      )}

      {/* Lege staat */}
      {nothingVisible && (
        <div className="text-center py-8 text-slate-400">
          <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold">Geen extra partijen vereist</p>
          <p className="text-xs mt-1">Klik op Volgende om door te gaan</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/Step3SecondParty.tsx src/__tests__/Step3SecondParty.test.tsx
git commit -m "feat: Step3SecondParty — tweede partij toggles en voogd auto-detect"
```

---

### Task 6: Step4Review component (TDD)

**Files:**
- Create: `src/pages/wizard/Step4Review.tsx`
- Create: `src/__tests__/Step4Review.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/Step4Review.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Step4Review from '../pages/wizard/Step4Review'
import { ROOMS } from '../lib/mockData'

const room = ROOMS[0]
const student = {
  firstName: 'Emma', lastName: 'Janssen',
  email: 'emma@ugent.be', phone: '0470 11 22 33',
  dateOfBirth: '2004-03-14', photoUrl: null,
}

describe('Step4Review', () => {
  it('toont kamerdetails', () => {
    render(<Step4Review room={room} students={[student]} secondLandlord={null} secondTenant={null} guardian={null} />)
    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText(/€ 450/)).toBeInTheDocument()
  })

  it('toont studentnaam', () => {
    render(<Step4Review room={room} students={[student]} secondLandlord={null} secondTenant={null} guardian={null} />)
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont tweede verhuurder als aanwezig', () => {
    const landlord = { name: 'Jan Peeters', email: 'jan@peeters.be' }
    render(<Step4Review room={room} students={[student]} secondLandlord={landlord} secondTenant={null} guardian={null} />)
    expect(screen.getByText('Jan Peeters')).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Implementeer Step4Review**

```tsx
// src/pages/wizard/Step4Review.tsx
import { Home, User, Building2, Shield } from 'lucide-react'
import type { Room } from '../../types'

interface StudentFormData {
  firstName: string; lastName: string; email: string; phone: string; dateOfBirth: string; photoUrl: string | null
}
interface SecondPartyData { name: string; email: string }
interface GuardianData { name: string; email: string; phone: string }

interface Step4ReviewProps {
  room: Room
  students: StudentFormData[]
  secondLandlord: SecondPartyData | null
  secondTenant: SecondPartyData | null
  guardian: GuardianData | null
}

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = { studio: 'Studio', single: 'Enkel', double: 'Dubbel' }

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/70 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon size={14} className="text-accent" />
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-slate-100/60 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  )
}

export default function Step4Review({ room, students, secondLandlord, secondTenant, guardian }: Step4ReviewProps) {
  return (
    <div className="p-4 flex flex-col gap-3">

      {/* Kamer */}
      <SectionCard icon={Home} title="Kamer">
        <InfoRow label="Kamer" value={`Kamer ${room.roomNumber}`} />
        <InfoRow label="Type" value={ROOM_TYPE_LABEL[room.roomType]} />
        <InfoRow label="Huurprijs" value={`€ ${room.monthlyRent}/maand`} />
        <InfoRow label="Vaste kosten" value={`€ ${room.fixedCosts}/maand`} />
        <InfoRow label="Studentenbelasting" value={`€ ${room.studentTax}/maand`} />
        <InfoRow label="Waarborg" value={`€ ${room.deposit}`} />
      </SectionCard>

      {/* Student(en) */}
      {students.map((student, idx) => (
        <SectionCard key={idx} icon={User} title={students.length > 1 ? `Student ${idx + 1}` : 'Student'}>
          {student.photoUrl && (
            <img src={student.photoUrl} alt="Foto" className="w-14 h-14 rounded-xl object-cover mb-3 border-2 border-accent/20" />
          )}
          <InfoRow label="Naam" value={`${student.firstName} ${student.lastName}`} />
          <InfoRow label="E-mail" value={student.email} />
          {student.phone && <InfoRow label="Telefoon" value={student.phone} />}
          <InfoRow label="Geboortedatum" value={student.dateOfBirth} />
        </SectionCard>
      ))}

      {/* Tweede verhuurder */}
      {secondLandlord && (
        <SectionCard icon={Building2} title="Tweede verhuurder">
          <InfoRow label="Naam" value={secondLandlord.name} />
          <InfoRow label="E-mail" value={secondLandlord.email} />
        </SectionCard>
      )}

      {/* Tweede bewoner */}
      {secondTenant && (
        <SectionCard icon={User} title="Tweede bewoner">
          <InfoRow label="Naam" value={secondTenant.name} />
          <InfoRow label="E-mail" value={secondTenant.email} />
        </SectionCard>
      )}

      {/* Voogd */}
      {guardian && (
        <SectionCard icon={Shield} title="Voogd">
          <InfoRow label="Naam" value={guardian.name} />
          <InfoRow label="E-mail" value={guardian.email} />
          {guardian.phone && <InfoRow label="Telefoon" value={guardian.phone} />}
        </SectionCard>
      )}
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer tests slagen**
```bash
npm run test:run 2>&1 | tail -8
```

- [ ] **Stap 5: Commit**
```bash
git add src/pages/wizard/Step4Review.tsx src/__tests__/Step4Review.test.tsx
git commit -m "feat: Step4Review — samenvatting van het volledige contract"
```

---

### Task 7: ContractNewPage — volledige implementatie (TDD)

**Files:**
- Modify: `src/pages/ContractNewPage.tsx` (vervangt stub volledig)
- Create: `src/__tests__/ContractNewPage.test.tsx`

- [ ] **Stap 1: Schrijf failing test**

```tsx
// src/__tests__/ContractNewPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ContractNewPage from '../pages/ContractNewPage'

function renderPage() {
  return render(<MemoryRouter><ContractNewPage /></MemoryRouter>)
}

describe('ContractNewPage', () => {
  it('toont stap 1 bij openen', () => {
    renderPage()
    expect(screen.getByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('toont de stapindicator met 4 stappen', () => {
    renderPage()
    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Partij')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
  })

  it('Volgende knop is uitgeschakeld op stap 1 als geen kamer geselecteerd', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('gaat naar stap 2 na kamer selectie en klik Volgende', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button')[1]) // eerste kamerkeuze
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    expect(screen.getByLabelText(/voornaam/i)).toBeInTheDocument()
  })

  it('gaat terug naar stap 1 bij klik Terug op stap 2', () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('button')[1])
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /terug/i }))
    expect(screen.getByText(/kies een kamer/i)).toBeInTheDocument()
  })
})
```

- [ ] **Stap 2: Verifieer test faalt**

- [ ] **Stap 3: Vervang ContractNewPage volledig**

```tsx
// src/pages/ContractNewPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WizardLayout from './wizard/WizardLayout'
import Step1Room from './wizard/Step1Room'
import Step2Student from './wizard/Step2Student'
import Step3SecondParty from './wizard/Step3SecondParty'
import Step4Review from './wizard/Step4Review'
import { ROOMS, PROPERTIES } from '../lib/mockData'
import type { Room } from '../types'

const WIZARD_STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
}

interface SecondPartyData { name: string; email: string }
interface GuardianData { name: string; email: string; phone: string }

function isMinor(dob: string): boolean {
  if (!dob) return false
  const birth = new Date(dob)
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return age < 18 || (age === 18 && m < 0) || (age === 18 && m === 0 && today.getDate() < birth.getDate())
}

const emptyStudent = (): StudentFormData => ({
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', photoUrl: null,
})

export default function ContractNewPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  const [secondLandlord, setSecondLandlord] = useState<SecondPartyData | null>(null)
  const [secondTenant, setSecondTenant] = useState<SecondPartyData | null>(null)
  const [guardian, setGuardian] = useState<GuardianData | null>(null)
  const [isSending, setIsSending] = useState(false)

  const propertyRooms = ROOMS.filter(r => r.propertyId === PROPERTIES[0].id)
  const selectedRoom: Room | null = propertyRooms.find(r => r.id === selectedRoomId) ?? null

  function handleRoomSelect(id: string) {
    setSelectedRoomId(id)
    const room = propertyRooms.find(r => r.id === id)
    if (room?.roomType === 'double') {
      setStudents([emptyStudent(), emptyStudent()])
    } else {
      setStudents([emptyStudent()])
    }
  }

  function handleStudentChange(index: number, field: keyof StudentFormData, value: string | null) {
    setStudents(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const hasMinor = students.some(s => isMinor(s.dateOfBirth))

  function canProceed(): boolean {
    if (currentStep === 1) return selectedRoomId !== null
    if (currentStep === 2) return students.every(s => s.firstName && s.lastName && s.email && s.dateOfBirth)
    return true
  }

  function handleNext() {
    if (currentStep < 4) {
      setCurrentStep(prev => (prev + 1) as 1 | 2 | 3 | 4)
    } else {
      setIsSending(true)
      setTimeout(() => navigate('/'), 1500)
    }
  }

  function handleBack() {
    if (currentStep === 1) navigate(-1)
    else setCurrentStep(prev => (prev - 1) as 1 | 2 | 3 | 4)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <WizardLayout
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onBack={handleBack}
        onNext={handleNext}
        canProceed={canProceed()}
        isLastStep={currentStep === 4}
        isSending={isSending}
      >
        {currentStep === 1 && (
          <Step1Room
            rooms={propertyRooms}
            selectedRoomId={selectedRoomId}
            onSelect={handleRoomSelect}
          />
        )}
        {currentStep === 2 && (
          <Step2Student
            students={students}
            onChange={handleStudentChange}
          />
        )}
        {currentStep === 3 && (
          <Step3SecondParty
            roomType={selectedRoom?.roomType ?? 'single'}
            hasMinor={hasMinor}
            secondLandlord={secondLandlord}
            secondTenant={secondTenant}
            guardian={guardian}
            onSecondLandlordChange={setSecondLandlord}
            onSecondTenantChange={setSecondTenant}
            onGuardianChange={setGuardian}
          />
        )}
        {currentStep === 4 && selectedRoom && (
          <Step4Review
            room={selectedRoom}
            students={students}
            secondLandlord={secondLandlord}
            secondTenant={secondTenant}
            guardian={guardian}
          />
        )}
      </WizardLayout>
    </div>
  )
}
```

- [ ] **Stap 4: Verifieer alle tests slagen**
```bash
npm run test:run
```
Verwacht: alle tests slagen (23 bestaande + alle nieuwe wizard tests).

- [ ] **Stap 5: TypeScript check**
```bash
npx tsc --noEmit
```
Verwacht: geen errors.

- [ ] **Stap 6: Visueel testen**
```bash
npm run dev
```
- Ga naar `http://localhost:5173`
- Klik "+ Nieuw Contract"
- Stap 1: selecteer een kamer → samenvatting verschijnt → Volgende wordt actief
- Stap 2: vul formulier in → Volgende pas actief na verplichte velden
- Stap 3: toggle tweede verhuurder → formulier expandeert
- Stap 4: overzicht toont alle info → "Contract versturen" → loading → terug naar dashboard

- [ ] **Stap 7: Commit**
```bash
git add src/pages/ContractNewPage.tsx src/__tests__/ContractNewPage.test.tsx
git commit -m "feat: volledige Contract Wizard — 4 stappen, StepIndicator, foto capture, voogd auto-detect"
```

---

### Task 8: Eindverificatie

- [ ] **Stap 1: Alle tests**
```bash
npm run test:run
```
Verwacht: 0 failures.

- [ ] **Stap 2: TypeScript**
```bash
npx tsc --noEmit
```

- [ ] **Stap 3: Build**
```bash
npm run build 2>&1 | tail -10
```

- [ ] **Stap 4: Finale commit**
```bash
git add -A
git commit -m "chore: Phase 2 eindverificatie — wizard volledig, alle tests slagen"
```

---

## Spec dekking check

| Vereiste | Task |
|---|---|
| StepIndicator cirkels + lijn, alle schermformaten | Task 1 |
| WizardLayout met Terug/Volgende/loading | Task 2 |
| Framer Motion animatie tussen stappen | Task 2 |
| Kamer selectie cards met samenvatting | Task 3 |
| Student formulier met foto (camera API) | Task 4 |
| Twee formulieren bij dubbele kamer | Task 4 |
| Minderjarig badge in stap 2 | Task 4 |
| Tweede verhuurder toggle | Task 5 |
| Tweede bewoner toggle (enkel single/studio) | Task 5 |
| Voogd automatisch bij minderjarige student | Task 5 |
| Overzicht samenvatting alle stappen | Task 6 |
| Volgende uitgeschakeld bij ontbrekende verplichte velden | Task 7 |
| Na versturen terug naar dashboard | Task 7 |
| Mock delay bij versturen | Task 7 |
| Liquid glass styling door hele wizard | Tasks 3-7 |
| Nederlandstalige UI | Tasks 1-7 |
