# Contract Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the legally correct Belgian rental flow: create contract (concept) → start inspection → sign → send to student.

**Architecture:** Four changes in sequence: (1) rename wizard last-step button and update tests; (2) fix `createContractDraft` to save status `'draft'` instead of `'sent'` and add `updateContractStatus` to `data.ts`; (3) navigate to new contract after saving; (4) replace `ContractDetailPage` status timeline with a 4-step voortgangschecklist and split signing from sending.

**Tech Stack:** React 18, TypeScript, React Router v7, Vitest + Testing Library, Supabase (with mock-data fallback in `src/lib/mockData.ts`)

---

## File Map

| File | Change |
|------|--------|
| `src/pages/wizard/WizardLayout.tsx` | Rename last-step button label + icon |
| `src/__tests__/WizardLayout.test.tsx` | Update button-label assertions |
| `src/lib/mockData.ts` | Add mock start inspection for contract `c4` |
| `src/lib/data.ts` | Change `createContractDraft` initial status; add `updateContractStatus` |
| `src/pages/ContractNewPage.tsx` | Navigate to `/contracts/:id` after save; remove timeout |
| `src/__tests__/ContractNewPage.test.tsx` | Update button-label assertion |
| `src/pages/ContractDetailPage.tsx` | Full rewrite: voortgangschecklist, split sign/send, Einde-only Inspectiepaspoort |
| `src/__tests__/ContractDetailPage.test.tsx` | Replace test suite to match new UI |

---

## Task 1: WizardLayout — "Opslaan als concept" button

**Files:**
- Modify: `src/pages/wizard/WizardLayout.tsx`
- Test: `src/__tests__/WizardLayout.test.tsx`

- [ ] **Step 1: Update the failing test**

In `src/__tests__/WizardLayout.test.tsx`, replace the test `'toont versturen en loading states'`:

```tsx
it('toont opslaan en loading states', () => {
  const { rerender } = renderWizard({ isLastStep: true })
  expect(screen.getByRole('button', { name: /opslaan als concept/i })).toBeInTheDocument()

  rerender(
    <WizardLayout
      steps={STEPS}
      currentStep={4}
      onBack={vi.fn()}
      onNext={vi.fn()}
      canProceed={true}
      isLastStep={true}
      isSending={true}
    >
      <div>Stap inhoud</div>
    </WizardLayout>,
  )

  expect(screen.getByText(/wordt opgeslagen/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- --reporter=verbose src/__tests__/WizardLayout.test.tsx
```

Expected: FAIL — `"opslaan als concept"` and `"wordt opgeslagen"` not found.

- [ ] **Step 3: Update WizardLayout.tsx**

In `src/pages/wizard/WizardLayout.tsx`:

Change the lucide import — swap `Send` for `Save`:
```tsx
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react'
```

Update the `aria-label` on the next button (currently `'Contract versturen'`):
```tsx
aria-label={isLastStep ? 'Opslaan als concept' : 'Volgende'}
```

Update the last-step button content block (the `isLastStep` branch):
```tsx
{isSending ? (
  <>
    <Loader2 size={15} className="animate-spin" />
    Wordt opgeslagen...
  </>
) : isLastStep ? (
  <>
    Opslaan als concept
    <Save size={15} />
  </>
) : (
  <>
    Volgende
    <ArrowRight size={15} />
  </>
)}
```

Add a subtitle below the button row (inside the footer `<div>`, after the button group `<div>`):
```tsx
{isLastStep && !isSending && (
  <p className="mt-2 text-center text-xs text-slate-400">
    Je kan daarna de plaatsbeschrijving doen en ondertekenen.
  </p>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/__tests__/WizardLayout.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/wizard/WizardLayout.tsx src/__tests__/WizardLayout.test.tsx
git commit -m "feat: rename wizard last step to 'Opslaan als concept'"
```

---

## Task 2: data.ts — fix initial status + add updateContractStatus + mock inspection for c4

**Files:**
- Modify: `src/lib/data.ts`
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1: Fix createContractDraft — save as 'draft' not 'sent'**

In `src/lib/data.ts`, find the `supabase.from('contracts').insert(...)` call inside `createContractDraft`. Change `status: 'sent'` to `status: 'draft'`:

```ts
status: 'draft',
```

- [ ] **Step 2: Add updateContractStatus**

At the end of `src/lib/data.ts`, after the `saveInspectionData` function, add:

```ts
export async function updateContractStatus(contractId: string, status: Contract['status']): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('contracts')
    .update({ status })
    .eq('id', contractId)
  if (error) throw error
}
```

- [ ] **Step 3: Add mock start inspection for contract c4**

Contract `c4` has `status: 'draft'` in `mockData.ts`. Tests need a scenario where a start inspection exists but the contract is not yet signed. Add `i2` to `MOCK_INSPECTIONS` in `src/lib/mockData.ts`:

```ts
export const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'i1',
    contractId: 'c1',
    type: 'start',
    overviewPhotoUrl: undefined,
    createdAt: '2025-09-15T10:00:00.000Z',
  },
  {
    id: 'i2',
    contractId: 'c4',
    type: 'start',
    overviewPhotoUrl: undefined,
    createdAt: '2025-09-16T10:00:00.000Z',
  },
]
```

- [ ] **Step 4: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS (no regressions — `updateContractStatus` is new and not yet called by any page).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/lib/mockData.ts
git commit -m "feat: save contracts as draft, add updateContractStatus, add mock inspection for c4"
```

---

## Task 3: ContractNewPage — navigate to contract after save

**Files:**
- Modify: `src/pages/ContractNewPage.tsx`
- Test: `src/__tests__/ContractNewPage.test.tsx`

- [ ] **Step 1: Update the failing test**

In `src/__tests__/ContractNewPage.test.tsx`, update the test `'toont overzicht na geldige stappen'`:

```tsx
it('toont overzicht na geldige stappen', async () => {
  renderPage()
  selectFirstRoomAndContinue()
  await fillStudent()
  fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
  fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

  expect(await screen.findByText('Emma Janssen')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /opslaan als concept/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- --reporter=verbose src/__tests__/ContractNewPage.test.tsx
```

Expected: FAIL — `"opslaan als concept"` not found.

- [ ] **Step 3: Update handleNext in ContractNewPage.tsx**

Replace the entire `handleNext` function in `src/pages/ContractNewPage.tsx`:

```tsx
async function handleNext() {
  if (!canProceed()) return

  if (currentStep < 4) {
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
      secondLandlord,
      guardian,
    })
    navigate(contractId ? `/contracts/${contractId}` : '/')
  } catch (err) {
    console.error('Contract opslaan mislukt:', err)
    setIsSending(false)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- --reporter=verbose src/__tests__/ContractNewPage.test.tsx
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ContractNewPage.tsx src/__tests__/ContractNewPage.test.tsx
git commit -m "feat: navigate to new contract after saving draft"
```

---

## Task 4: ContractDetailPage — voortgangschecklist + split signing/sending

**Files:**
- Modify: `src/pages/ContractDetailPage.tsx`
- Test: `src/__tests__/ContractDetailPage.test.tsx`

**Context for the implementer:**

Mock contract states used by tests:
- `c1` — `status: 'signed'`, has start inspection `i1` → shows "Bekijken" for start, "Versturen" for step 4
- `c4` — `status: 'draft'`, has start inspection `i2` (added in Task 2) → shows "Ondertekenen" for step 3

The checklist has 4 rows:

| Step | Done when | Blocked when | Active button |
|------|-----------|--------------|---------------|
| Contract aangemaakt | always | never | — |
| Startplaatsbeschrijving | `startInspection` exists | never | "Starten" (or "Bekijken →" if done) |
| Handtekening verhuurder | `status !== 'draft'` | no `startInspection` | "Ondertekenen" |
| Versturen naar student | `status === 'sent'` | `status === 'draft'` | "Versturen" |

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/__tests__/ContractDetailPage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractDetailPage from '../pages/ContractDetailPage'

function renderPage(initialPath = '/contracts/c1') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
        <Route path="/contracts/:id/renew" element={<div>Renew route</div>} />
        <Route path="/inspections/new" element={<div>Inspectie route</div>} />
        <Route path="/inspections/:id" element={<div>Inspectie detail route</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContractDetailPage', () => {
  function mockPrintWindow() {
    const print = vi.fn()
    const write = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
      print,
    } as unknown as Window)
    return { print, write }
  }

  it('toont student, kamer en contractgegevens', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Emma Janssen' })).toBeInTheDocument()
    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
    expect(screen.getByText('€ 450/maand')).toBeInTheDocument()
  })

  it('toont voortgangschecklist met 4 stappen', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Contract aangemaakt')).toBeInTheDocument()
    expect(screen.getByText('Startplaatsbeschrijving')).toBeInTheDocument()
    expect(screen.getByText('Handtekening verhuurder')).toBeInTheDocument()
    expect(screen.getByText('Versturen naar student')).toBeInTheDocument()
  })

  it('toont Bekijken-knop voor start als inspectie klaar is (c1)', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /bekijken/i })).toBeInTheDocument()
  })

  it('toont Versturen-knop als contract ondertekend is (c1 status signed)', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /^versturen$/i })).toBeInTheDocument()
  })

  it('toont Ondertekenen-knop als start gedaan en status draft (c4)', async () => {
    renderPage('/contracts/c4')

    expect(await screen.findByRole('button', { name: /ondertekenen/i })).toBeInTheDocument()
  })

  it('toont geen "Ondertekenen & versturen" als één knop', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.queryByRole('button', { name: /ondertekenen & versturen/i })).not.toBeInTheDocument()
  })

  it('toont alleen Eindplaatsbeschrijving in Inspectiepaspoort (niet Start)', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Eindplaatsbeschrijving')).toBeInTheDocument()
    // Startplaatsbeschrijving appears exactly once — in the checklist, not in Inspectiepaspoort
    expect(screen.getAllByText('Startplaatsbeschrijving')).toHaveLength(1)
  })

  it('navigeert naar contract verlengen', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /verlengen/i }))

    expect(screen.getByText('Renew route')).toBeInTheDocument()
  })

  it('maakt een printbaar contractdocument', async () => {
    const { write } = mockPrintWindow()
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /pdf maken/i }))

    expect(write).toHaveBeenCalledWith(expect.stringContaining('HUUROVEREENKOMST STUDENTENKAMER'))
  })

  it('redirect naar dashboard bij onbekend contract', async () => {
    renderPage('/contracts/onbekend')

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- --reporter=verbose src/__tests__/ContractDetailPage.test.tsx
```

Expected: multiple FAILs — checklist labels and split buttons not found yet.

- [ ] **Step 3: Rewrite ContractDetailPage.tsx**

Replace the entire contents of `src/pages/ContractDetailPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarPlus, Check, ClipboardList, Download, Home, User } from 'lucide-react'
import { getContractBundleData, sendContractEmail, updateContractStatus } from '../lib/data'
import { cn } from '../lib/cn'
import type { Contract, Inspection, InspectionItem, LandlordProfile, Property, Room, Student } from '../types'
import { generateContractHtml, printContractDocument } from '../lib/pdfDocuments'
import SignatureModal from '../components/SignatureModal'

const ROOM_TYPE_LABEL = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

export default function ContractDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<{
    contract: Contract
    room: Room
    student: Student
    property: Property
    startInspection?: Inspection
    startInspectionItems?: InspectionItem[]
    endInspection?: Inspection
    landlord?: LandlordProfile
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signStatus, setSignStatus] = useState<'idle' | 'signing' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadContract() {
      setLoading(true)
      setError(null)
      try {
        const nextBundle = await getContractBundleData(id)
        if (!cancelled) setBundle(nextBundle)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Contract kon niet geladen worden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContract()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Contract laden...</div>
  }

  if (error) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error}</div>
  }

  if (!bundle) return <Navigate to="/" replace />

  const { contract, room, student, property, startInspection, startInspectionItems, endInspection, landlord } = bundle

  const startDone = !!startInspection
  const signedDone = contract.status === 'signed' || contract.status === 'sent'
  const sentDone = contract.status === 'sent'

  async function handleSignatureConfirm(sig: string) {
    setShowSignatureModal(false)
    setSignStatus('signing')
    try {
      await updateContractStatus(contract.id, 'signed')
      setSignatureDataUrl(sig)
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, status: 'signed' } } : null)
      setSignStatus('idle')
    } catch (err) {
      setSignStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Ondertekenen mislukt.')
    }
  }

  async function handleSend() {
    if (!signatureDataUrl) {
      setShowSignatureModal(true)
      return
    }
    if (!student.email) {
      setSendStatus('error')
      setStatusMessage('Geen e-mailadres gevonden voor deze student.')
      return
    }
    setSendStatus('sending')
    setStatusMessage('Contract wordt verstuurd...')
    try {
      const html = generateContractHtml({
        contract,
        room,
        student,
        property,
        inspection: startInspection,
        inspectionItems: startInspectionItems,
        landlord,
        signatureDataUrl,
      })
      await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html)
      await updateContractStatus(contract.id, 'sent')
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, status: 'sent' } } : null)
      setSendStatus('sent')
      setStatusMessage(`Contract is verstuurd naar ${student.email}.`)
    } catch (err) {
      setSendStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Contract kon niet verstuurd worden.')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-bold text-accent"
        >
          Contracten
        </button>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">

          <section className="glass rounded-2xl p-4">
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
              </div>
            </div>

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
                  property,
                  inspection: startInspection,
                  inspectionItems: startInspectionItems,
                  landlord,
                })}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Home size={16} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Voortgang</h2>
            </div>
            <div className="flex flex-col gap-2">
              <ProgressRow
                label="Contract aangemaakt"
                done={true}
                date={contract.createdAt}
              />
              <ProgressRow
                label="Startplaatsbeschrijving"
                done={startDone}
                date={startInspection?.createdAt}
                primaryAction={startDone ? undefined : () => navigate('/inspections/new', { state: { contractId: contract.id, type: 'start' } })}
                primaryLabel={startDone ? undefined : 'Starten'}
                secondaryAction={startDone && startInspection ? () => navigate(`/inspections/${startInspection.id}`) : undefined}
                secondaryLabel={startDone ? 'Bekijken →' : undefined}
              />
              <ProgressRow
                label="Handtekening verhuurder"
                done={signedDone}
                blocked={!startDone}
                primaryAction={!signedDone && startDone ? () => setShowSignatureModal(true) : undefined}
                primaryLabel={!signedDone && startDone ? 'Ondertekenen' : undefined}
              />
              <ProgressRow
                label="Versturen naar student"
                done={sentDone}
                blocked={!signedDone}
                primaryAction={signedDone && !sentDone ? handleSend : undefined}
                primaryLabel={signedDone && !sentDone ? (sendStatus === 'sending' ? 'Versturen...' : 'Versturen') : undefined}
              />
            </div>
            {statusMessage && (
              <div
                role="status"
                className={cn(
                  'mt-3 rounded-xl border px-3 py-2 text-sm font-semibold',
                  sendStatus === 'sent'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700',
                )}
              >
                {statusMessage}
              </div>
            )}
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <InfoCard
              icon={Building2}
              title="Kamer"
              rows={[
                ['Pand', property.name],
                ['Adres', property.address],
                ['Kamer', room.roomNumber],
                ['Type', ROOM_TYPE_LABEL[room.roomType]],
              ]}
            />
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
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Inspectiepaspoort</h2>
            </div>
            <InspectionRow
              label="Eindplaatsbeschrijving"
              inspection={endInspection}
              onStart={() => navigate('/inspections/new', { state: { contractId: contract.id, type: 'end' } })}
              onView={() => { if (endInspection) navigate(`/inspections/${endInspection.id}`) }}
            />
          </section>
        </div>
      </main>

      {showSignatureModal && (
        <SignatureModal
          onConfirm={handleSignatureConfirm}
          onClose={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ElementType
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-chip flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
    >
      <Icon size={16} className="text-accent" />
      {label}
    </button>
  )
}

function ProgressRow({
  label,
  done,
  blocked,
  date,
  primaryAction,
  primaryLabel,
  secondaryAction,
  secondaryLabel,
}: {
  label: string
  done: boolean
  blocked?: boolean
  date?: string
  primaryAction?: () => void
  primaryLabel?: string
  secondaryAction?: () => void
  secondaryLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100/70 bg-white/40 px-4 py-3">
      <div className="flex items-center gap-3">
        {done ? (
          <Check size={15} className="shrink-0 text-green-500" />
        ) : (
          <div className={cn('h-4 w-4 shrink-0 rounded-full border-2', blocked ? 'border-slate-200' : 'border-accent')} />
        )}
        <div>
          <p className={cn('text-sm font-bold', blocked && !done ? 'text-slate-400' : 'text-slate-800')}>{label}</p>
          {done && date && (
            <p className="text-xs text-slate-500">
              {new Date(date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {!done && blocked && <p className="text-xs text-slate-400">Wacht op vorige stap</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {secondaryAction && secondaryLabel && (
          <button
            type="button"
            onClick={secondaryAction}
            className="glass-chip rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            {secondaryLabel}
          </button>
        )}
        {primaryAction && primaryLabel && (
          <button type="button" onClick={primaryAction} className="btn-primary px-3 py-1.5 text-xs">
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  rows,
}: {
  icon: React.ElementType
  title: string
  rows: Array<[string, string]>
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-slate-100/70 py-2 last:border-0">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <span className="text-right text-sm font-bold text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  )
}

function InspectionRow({
  label,
  inspection,
  onStart,
  onView,
}: {
  label: string
  inspection?: { id: string; createdAt: string }
  onStart: () => void
  onView: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100/70 bg-white/40 px-4 py-3">
      <div className="flex items-center gap-3">
        {inspection ? (
          <Check size={15} className="shrink-0 text-green-500" />
        ) : (
          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
        )}
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {inspection ? (
            <p className="text-xs text-slate-500">
              {new Date(inspection.createdAt).toLocaleDateString('nl-BE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Nog niet gedaan</p>
          )}
        </div>
      </div>
      {inspection ? (
        <button
          type="button"
          onClick={onView}
          className="glass-chip rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
        >
          Bekijken →
        </button>
      ) : (
        <button type="button" onClick={onStart} className="btn-primary px-3 py-1.5 text-xs">
          Starten
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run ContractDetailPage tests**

```bash
npm run test:run -- --reporter=verbose src/__tests__/ContractDetailPage.test.tsx
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS. If any test outside `ContractDetailPage.test.tsx` fails due to removed exports (`STATUS_LABEL`, `STATUS_STEPS`), fix the import in the failing file.

- [ ] **Step 6: Update CLAUDE.md test count**

In `CLAUDE.md`, update the test count line to reflect the final number reported by step 5.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ContractDetailPage.tsx src/__tests__/ContractDetailPage.test.tsx CLAUDE.md
git commit -m "feat: voortgangschecklist, split sign/send, Einde-only Inspectiepaspoort"
```
