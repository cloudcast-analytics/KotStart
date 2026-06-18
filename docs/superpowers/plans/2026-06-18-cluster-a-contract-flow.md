# Cluster A — Contract & verhuurderflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vereenvoudig de contract-stepper (plaatsbeschrijving losgemaakt van contractflow), voeg "Concept sturen" toe met datumregistratie en los de verhuurder-datum fix op in de contract-PDF.

**Architecture:** Kleine additieve wijzigingen over 5 bestanden + 1 Edge Function + 1 Supabase migratie. TDD: tests schrijven vóór implementatie. Elke taak eindigt met een commit.

**Tech Stack:** React 18 + TypeScript + Tailwind, Vitest + Testing Library, Supabase (PostgreSQL + Edge Functions), Resend (e-mail)

---

## File Map

| Bestand | Rol in deze taak |
|---------|-----------------|
| `src/types/index.ts` | `conceptSentAt?: string` toevoegen aan `Contract` type |
| `src/lib/data.ts` | `ContractRow` uitbreiden + mapping + `saveConceptSentAt()` + `sendContractEmail` isConcept param |
| `supabase/migrations/20260618_concept_sent_at.sql` | Nieuw: `ALTER TABLE contracts ADD COLUMN concept_sent_at TIMESTAMPTZ` |
| `src/lib/pdfDocuments.ts` | `isConcept` vlag op `generateContractHtml` / `generateContractPdfBase64`, verhuurder datum fix |
| `src/pages/ContractDetailPage.tsx` | Stepper vereenvoudigen, concept-knop + handler, `saveConceptSentAt` importeren |
| `supabase/functions/send-contract-email/index.ts` | `isConcept` payload verwerken (subject, bodytekst, bestandsnaam) |
| `src/__tests__/pdfDocuments.test.ts` | Tests voor isConcept vlag + verhuurder datum |
| `src/__tests__/ContractDetailPage.test.tsx` | Tests updaten (3 stappen, concept-knop) |

---

## Task 1: Contract type + ContractRow interface

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/data.ts:48-61` (ContractRow interface) en `src/lib/data.ts:328-334` (mapping)

- [ ] **Stap 1: Voeg `conceptSentAt` toe aan Contract type**

In `src/types/index.ts`, zoek het `Contract` interface (heeft `signedAt?` en `sentAt?`) en voeg toe:

```typescript
// Bestaand:
  signedAt?: string
  sentAt?: string
// Toevoegen op de regel na sentAt?:
  conceptSentAt?: string
```

- [ ] **Stap 2: Voeg `concept_sent_at` toe aan ContractRow interface in data.ts**

In `src/lib/data.ts`, zoek `interface ContractRow` (rond regel 48) en voeg toe na `sent_at`:

```typescript
// Bestaand:
  sent_at?: string | null
// Toevoegen:
  concept_sent_at?: string | null
```

- [ ] **Stap 3: Voeg `conceptSentAt` toe aan de row-mapping**

In `src/lib/data.ts`, zoek het blok rond regel 331 waar `signedAt` en `sentAt` gemapt worden en voeg toe:

```typescript
// Bestaand:
    signedAt: row.signed_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
// Toevoegen:
    conceptSentAt: row.concept_sent_at ?? undefined,
```

- [ ] **Stap 4: TypeScript check**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npx tsc -b --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 5: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add src/types/index.ts src/lib/data.ts && git commit -m "feat(types): add conceptSentAt to Contract type and ContractRow mapping"
```

---

## Task 2: Supabase migratie

**Files:**
- Create: `supabase/migrations/20260618_concept_sent_at.sql`

- [ ] **Stap 1: Maak migratiebestand aan**

Bestand: `supabase/migrations/20260618_concept_sent_at.sql`

```sql
ALTER TABLE contracts ADD COLUMN concept_sent_at TIMESTAMPTZ;
```

- [ ] **Stap 2: Pas de migratie toe via Supabase MCP**

Gebruik het MCP-tool `mcp__supabase__apply_migration` met:
- `project_id`: `tsieqsxzjrfnevcrbswg`
- `name`: `concept_sent_at`
- `query`: de SQL uit stap 1

- [ ] **Stap 3: Voeg toe aan staging-bootstrap.sql**

In `supabase/migrations/staging-bootstrap.sql`, zoek het blok waar kolommen aan `contracts` worden toegevoegd (of de `CREATE TABLE contracts`-definitie) en voeg `concept_sent_at TIMESTAMPTZ` toe als laatste kolom, gevolgd door een commentaarregel `-- migratie 20260618`.

- [ ] **Stap 4: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add supabase/migrations/20260618_concept_sent_at.sql supabase/migrations/staging-bootstrap.sql && git commit -m "feat(db): add concept_sent_at column to contracts table"
```

---

## Task 3: data.ts — saveConceptSentAt + sendContractEmail isConcept

**Files:**
- Modify: `src/lib/data.ts`

- [ ] **Stap 1: Voeg `saveConceptSentAt` toe aan data.ts**

Zoek `export async function sendContractEmail` en voeg dáárnet vóór de nieuwe functie in:

```typescript
export async function saveConceptSentAt(contractId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('contracts')
    .update({ concept_sent_at: new Date().toISOString() })
    .eq('id', contractId)
  if (error) throw error
}
```

- [ ] **Stap 2: Voeg `isConcept` param toe aan `sendContractEmail`**

Zoek `export async function sendContractEmail(` en pas de signature en body aan:

```typescript
// Bestaand:
export async function sendContractEmail(
  to: string,
  name: string,
  html: string,
  pdfBase64?: string,
): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.functions.invoke('send-contract-email', {
    body: { to, name, html, pdfBase64 },
  })

// Wordt:
export async function sendContractEmail(
  to: string,
  name: string,
  html: string,
  pdfBase64?: string,
  isConcept?: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.functions.invoke('send-contract-email', {
    body: { to, name, html, pdfBase64, isConcept },
  })
```

- [ ] **Stap 3: TypeScript check**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npx tsc -b --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 4: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add src/lib/data.ts && git commit -m "feat(data): add saveConceptSentAt and isConcept param to sendContractEmail"
```

---

## Task 4: pdfDocuments.ts — isConcept vlag + verhuurder datum fix (TDD)

**Files:**
- Modify: `src/__tests__/pdfDocuments.test.ts`
- Modify: `src/lib/pdfDocuments.ts`

- [ ] **Stap 1: Schrijf falende tests voor verhuurder datum**

Voeg toe aan `src/__tests__/pdfDocuments.test.ts`, in de `describe('generateContractHtml')` blok:

```typescript
  it('vult de verhuurder-datum in op dezelfde datum als de huurder wanneer het contract getekend is', () => {
    const html = generateContractHtml({
      ...mockBundle,
      contract: { ...CONTRACTS[0], signedAt: '2025-09-12T10:00:00.000Z' },
    })
    const matches = [...html.matchAll(/Datum: 12\/09\/2025/g)]
    expect(matches).toHaveLength(2)
  })

  it('laat beide datumvelden leeg wanneer het contract nog niet getekend is', () => {
    const html = generateContractHtml({
      ...mockBundle,
      contract: { ...CONTRACTS[0], signedAt: undefined },
    })
    const matches = [...html.matchAll(/Datum: _____ \/ _____ \/ _____/g)]
    expect(matches).toHaveLength(2)
  })
```

- [ ] **Stap 2: Schrijf falende tests voor isConcept vlag**

Voeg toe in dezelfde `describe`:

```typescript
  it('voegt CONCEPT toe aan de documenttitel wanneer isConcept true is', () => {
    const html = generateContractHtml(mockBundle, { isConcept: true })
    expect(html).toContain('CONCEPT HUUROVEREENKOMST STUDENTENKAMER')
  })

  it('bevat geen CONCEPT prefix in de documenttitel zonder isConcept optie', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('HUUROVEREENKOMST STUDENTENKAMER')
    expect(html).not.toContain('CONCEPT HUUROVEREENKOMST')
  })
```

- [ ] **Stap 3: Draai tests om te bevestigen dat ze falen**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npm run test:run -- pdfDocuments
```

Verwacht: de 4 nieuwe tests FALEN (de bestaande 20 slagen nog).

- [ ] **Stap 4: Implementeer `isConcept` vlag in `generateContractHtml`**

In `src/lib/pdfDocuments.ts`, pas de functiesignatuur aan:

```typescript
// Bestaand:
export function generateContractHtml(bundle: ContractBundle): string {

// Wordt:
export function generateContractHtml(bundle: ContractBundle, options?: { isConcept?: boolean }): string {
```

Voeg direct bovenaan de functie-body toe (vóór de destructuring):

```typescript
  const isConceptDoc = options?.isConcept ?? false
```

Zoek de `<h1>`-regel en pas aan:

```typescript
// Bestaand:
<h1>HUUROVEREENKOMST STUDENTENKAMER</h1>

// Wordt:
<h1>${isConceptDoc ? 'CONCEPT ' : ''}HUUROVEREENKOMST STUDENTENKAMER</h1>
```

- [ ] **Stap 5: Implementeer verhuurder datum fix**

Zoek in `generateContractHtml` het verhuurder handtekeningblok. Het bevat:
```
Datum: _____ / _____ / _____<br/>
Plaats: ${escapeHtml(signingPlace)}
```

Pas de datumregel aan:
```typescript
// Bestaand:
    Datum: _____ / _____ / _____<br/>
// Wordt:
    Datum: ${escapeHtml(signedDate)}<br/>
```

Let op: `signedDate` is al beschikbaar in de functie (`const signedDate = formatDocumentDate(contract.signedAt)`). `formatDocumentDate(undefined)` geeft `'_____ / _____ / _____'` terug — dus bij een concept (geen signedAt) verschijnt automatisch het lege veld.

- [ ] **Stap 6: Pas `generateContractPdfBase64` aan om `options` door te geven**

```typescript
// Bestaand:
export async function generateContractPdfBase64(bundle: ContractBundle): Promise<string> {
  const html2pdf = (await import('html2pdf.js')).default
  const html = generateContractHtml(bundle)

// Wordt:
export async function generateContractPdfBase64(bundle: ContractBundle, options?: { isConcept?: boolean }): Promise<string> {
  const html2pdf = (await import('html2pdf.js')).default
  const html = generateContractHtml(bundle, options)
```

(De rest van de functie blijft ongewijzigd.)

- [ ] **Stap 7: Draai tests om te bevestigen dat ze slagen**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npm run test:run -- pdfDocuments
```

Verwacht: alle tests SLAGEN.

- [ ] **Stap 8: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add src/__tests__/pdfDocuments.test.ts src/lib/pdfDocuments.ts && git commit -m "feat(pdf): add isConcept flag and fix landlord signature date"
```

---

## Task 5: ContractDetailPage — stepper + concept UI (TDD)

**Files:**
- Modify: `src/__tests__/ContractDetailPage.test.tsx`
- Modify: `src/pages/ContractDetailPage.tsx`

- [ ] **Stap 1: Update bestaande test "voortgangschecklist met 4 stappen"**

In `src/__tests__/ContractDetailPage.test.tsx`, zoek:
```typescript
  it('toont voortgangschecklist met 4 stappen', async () => {
```

Vervang volledig door:
```typescript
  it('toont voortgangschecklist met 3 stappen (plaatsbeschrijving staat los in Inspectiepaspoort)', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })

    // Voortgang-sectie: 3 rijen
    expect(screen.getByText('Contract aangemaakt')).toBeInTheDocument()
    expect(screen.getByText(/Concept: 20 augustus 2025/i)).toBeInTheDocument()
    expect(screen.getByText('Handtekeningen verhuurder en student')).toBeInTheDocument()
    expect(screen.getByText(/Definitief contract: 12 september 2025/i)).toBeInTheDocument()
    expect(screen.getByText('Versturen naar student')).toBeInTheDocument()

    // Startplaatsbeschrijving staat NIET als stap in Voortgang,
    // maar wel in Inspectiepaspoort (getest in een andere test)
    const voortgang = screen.getByText('Contract aangemaakt').closest('section')!
    expect(voortgang).not.toContain
  })
```

- [ ] **Stap 2: Voeg test toe voor ontblokken handtekening zonder plaatsbeschrijving**

Voeg toe na de bovenstaande test:

```typescript
  it('toont Handtekeningen opslaan ook zonder startplaatsbeschrijving (plaatsbeschrijving blokkeert niet meer)', async () => {
    const base = await getContractBundleData('c4')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      startInspection: undefined,
      startInspectionItems: undefined,
    })

    renderPage('/contracts/c4')

    expect(await screen.findByRole('button', { name: /handtekeningen opslaan/i })).toBeInTheDocument()
  })
```

- [ ] **Stap 3: Voeg test toe voor Concept sturen-knop**

```typescript
  it('toont Concept sturen-knop wanneer conceptSentAt niet gezet is en contract nog niet verstuurd is', async () => {
    renderPage('/contracts/c4')

    expect(await screen.findByRole('button', { name: /concept sturen/i })).toBeInTheDocument()
  })

  it('verbergt Concept sturen-knop en toont verstuurd-label wanneer conceptSentAt gezet is', async () => {
    const base = await getContractBundleData('c4')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      contract: { ...base!.contract, conceptSentAt: '2026-06-18T10:00:00.000Z' },
    })

    renderPage('/contracts/c4')

    await screen.findByRole('heading', { name: /\w/ })
    expect(screen.queryByRole('button', { name: /concept sturen/i })).not.toBeInTheDocument()
    expect(screen.getByText(/verstuurd/i)).toBeInTheDocument()
  })

  it('toont geen Concept sturen-knop wanneer contract al verstuurd is (status sent)', async () => {
    renderPage('/contracts/c3')

    await screen.findByRole('heading', { name: /\w/ })
    expect(screen.queryByRole('button', { name: /concept sturen/i })).not.toBeInTheDocument()
  })
```

- [ ] **Stap 4: Draai tests om te bevestigen dat nieuwe tests falen**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npm run test:run -- ContractDetailPage
```

Verwacht: bestaande tests slagen, de 4 nieuwe FALEN.

- [ ] **Stap 5: Implementeer stepper vereenvoudiging in ContractDetailPage**

In `src/pages/ContractDetailPage.tsx`:

**5a.** Voeg import toe van `saveConceptSentAt` (zoek de import-regel van `data`):
```typescript
// Bestaand:
import { deleteContractBundleData, getContractBundleData, sendContractEmail, updateContractStatus } from '../lib/data'
// Wordt:
import { deleteContractBundleData, getContractBundleData, saveConceptSentAt, sendContractEmail, updateContractStatus } from '../lib/data'
```

**5b.** Voeg `generateContractPdfBase64` toe aan de import uit `pdfDocuments` (zoek bestaande import):
```typescript
// Bestaand:
import { generateContractHtml, generateContractPdfBase64, printContractDocument } from '../lib/pdfDocuments'
// (al aanwezig — geen wijziging nodig)
```

**5c.** Voeg nieuwe state toe na de bestaande `sendStatus` state:
```typescript
// Na:
const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
// Toevoegen:
const [conceptSendStatus, setConceptSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
```

**5d.** Verwijder de `startDone`-afhankelijkheid van de signing-stap. Zoek:
```typescript
  const startDone = !!startInspection
```
Die regel mag blijven (startDone wordt nog gebruikt voor Inspectiepaspoort-checks elders). Maar zoek dáárna:
```typescript
        primaryAction={!signedDone && startDone ? () => setShowSignatureModal(true) : undefined}
        primaryLabel={!signedDone && startDone ? 'Handtekeningen opslaan' : undefined}
```
En vervang door:
```typescript
        primaryAction={!signedDone ? () => setShowSignatureModal(true) : undefined}
        primaryLabel={!signedDone ? 'Handtekeningen opslaan' : undefined}
```

**5e.** Verwijder de `ProgressRow` voor "Startplaatsbeschrijving" uit de Voortgang-sectie. Zoek en verwijder:
```typescript
              <ProgressRow
                label="Startplaatsbeschrijving"
                done={startDone}
                date={startInspection?.createdAt}
              />
```

**5f.** Verwijder de `blocked` prop van de handtekening-rij. Zoek:
```typescript
              <ProgressRow
                label={signatureProgressLabel}
                done={signedDone}
                blocked={!startDone}
                date={contract.signedAt}
```
En verwijder `blocked={!startDone}`:
```typescript
              <ProgressRow
                label={signatureProgressLabel}
                done={signedDone}
                date={contract.signedAt}
```

- [ ] **Stap 6: Voeg `handleSendConcept` handler toe**

Voeg de handler toe direct vóór `handleSend` in de component:

```typescript
  async function handleSendConcept() {
    if (!student.email) {
      setConceptSendStatus('error')
      setStatusMessage('Geen e-mailadres gevonden voor deze student.')
      return
    }
    setConceptSendStatus('sending')
    setStatusMessage('Concept wordt verstuurd...')
    try {
      const conceptBundle = { contract, room, student, secondStudent, property, landlord }
      const html = generateContractHtml(conceptBundle, { isConcept: true })
      let pdfBase64: string | undefined
      try {
        pdfBase64 = await generateContractPdfBase64(conceptBundle, { isConcept: true })
      } catch (pdfError) {
        console.error('Concept PDF-generatie mislukt, verstuur HTML fallback:', pdfError)
      }
      await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html, pdfBase64, true)
      if (secondStudent?.email) {
        await sendContractEmail(secondStudent.email, `${secondStudent.firstName} ${secondStudent.lastName}`, html, pdfBase64, true)
      }
      await saveConceptSentAt(contract.id)
      const conceptSentAt = new Date().toISOString()
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, conceptSentAt } } : null)
      setConceptSendStatus('sent')
      setStatusMessage(null)
    } catch (err) {
      setConceptSendStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Concept kon niet verstuurd worden.')
    }
  }
```

- [ ] **Stap 7: Voeg concept-UI toe aan ProgressRow "Contract aangemaakt"**

Zoek de `ProgressRow` voor "Contract aangemaakt" en vervang:
```typescript
              <ProgressRow
                label="Contract aangemaakt"
                done={true}
                date={contract.createdAt}
                datePrefix="Concept"
              />
```

Door:
```typescript
              <ProgressRow
                label="Contract aangemaakt"
                done={true}
                date={contract.createdAt}
                datePrefix="Concept"
                secondaryAction={!sentDone && !contract.conceptSentAt && conceptSendStatus !== 'sending' ? handleSendConcept : undefined}
                secondaryLabel={!sentDone && !contract.conceptSentAt && conceptSendStatus !== 'sending' ? 'Concept sturen' : undefined}
                conceptSentAt={contract.conceptSentAt}
              />
```

- [ ] **Stap 8: Voeg `conceptSentAt` prop toe aan `ProgressRow` component**

Zoek de `ProgressRow` functie-definitie (prop-type en implementatie) en voeg toe:

In de props-interface:
```typescript
// Na secondaryLabel?: string:
  conceptSentAt?: string
```

In het render-deel, zoek de `<div className="flex items-center gap-2">` die de knoppen bevat en voeg de concept-indicator toe vóór de bestaande knoppenlogica:

```typescript
      <div className="flex items-center gap-2">
        {conceptSentAt && (
          <span className="text-xs font-semibold text-accent">
            ✓ Verstuurd {new Date(conceptSentAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
        {!conceptSentAt && secondaryAction && secondaryLabel && (
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
```

- [ ] **Stap 9: TypeScript check**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npx tsc -b --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 10: Draai ContractDetailPage tests**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npm run test:run -- ContractDetailPage
```

Verwacht: alle tests SLAGEN.

- [ ] **Stap 11: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add src/__tests__/ContractDetailPage.test.tsx src/pages/ContractDetailPage.tsx && git commit -m "feat(contract): simplify stepper and add concept send functionality"
```

---

## Task 6: Edge Function — isConcept verwerking + deploy

**Files:**
- Modify: `supabase/functions/send-contract-email/index.ts`

- [ ] **Stap 1: Lees `isConcept` uit de payload en pas subject/body/bestandsnaam aan**

In `supabase/functions/send-contract-email/index.ts`:

Zoek de destructuring van de request body (regel ~53):
```typescript
    const { to, name, html, pdfBase64 } = await req.json() as { to?: string; name?: string; html?: string; pdfBase64?: string }
```
Vervang door:
```typescript
    const { to, name, html, pdfBase64, isConcept } = await req.json() as { to?: string; name?: string; html?: string; pdfBase64?: string; isConcept?: boolean }
```

Zoek de `emailBody` constructie (~regel 66-74) en pas aan:
```typescript
    const emailBody: Record<string, unknown> = {
      from: `${fromName} <${fromAddress}>`,
      to,
      reply_to: user.email,
      subject: isConcept ? `Concept huurovereenkomst voor ${name}` : `Huurovereenkomst voor ${name}`,
      html: `<p>Beste ${name},</p>
             <p>${isConcept ? 'In bijlage vindt u een concept van de huurovereenkomst als PDF.' : 'In bijlage vindt u de ondertekende huurovereenkomst als PDF.'}</p>
             <p>Met vriendelijke groeten,<br>${fromName}</p>`,
    }
```

Zoek de attachment bestandsnaam (~regel 79):
```typescript
          filename: `huurovereenkomst_${safeName}.pdf`,
```
Vervang door:
```typescript
          filename: `${isConcept ? 'concept_' : ''}huurovereenkomst_${safeName}.pdf`,
```

- [ ] **Stap 2: Deploy de Edge Function via Supabase MCP**

Gebruik het MCP-tool `mcp__supabase__deploy_edge_function` met:
- `project_id`: `tsieqsxzjrfnevcrbswg`
- `name`: `send-contract-email`
- `entrypoint_path`: `supabase/functions/send-contract-email/index.ts`

- [ ] **Stap 3: Commit**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && git add supabase/functions/send-contract-email/index.ts && git commit -m "feat(edge): support isConcept flag in send-contract-email function"
```

---

## Task 7: Volledige testsuite + afsluiting

**Files:** geen nieuwe wijzigingen

- [ ] **Stap 1: Draai volledige testsuite**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npm run test:run
```

Verwacht: alle tests SLAGEN (minstens 108 tests — 104 bestaand + 4 nieuw in pdfDocuments + nieuwe in ContractDetailPage).

- [ ] **Stap 2: TypeScript final check**

```bash
cd "C:\shit\Bezig\KotKlusser\KotStart\KotStartGit" && npx tsc -b --noEmit
```

Verwacht: geen fouten.

- [ ] **Stap 3: Update memory**

Werk de memory bij (`C:\Users\vince\.claude\projects\C--shit-Bezig-KotKlusser-KotStart-KotStartGit\memory\kotstart-aanpassingen-clusters.md`) met de status van Cluster A als ✅ done.
