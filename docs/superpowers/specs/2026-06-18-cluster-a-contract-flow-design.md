# Cluster A — Contract & verhuurderflow: design

**Datum:** 2026-06-18
**Branch:** `staging`
**Status:** Goedgekeurd door Vince — klaar voor implementatieplan

---

## Context

Dit is het resterende werk van Cluster A uit de "Aanpassingen KotStart"-launchreeks. Na verificatie van de huidige codebase bleek het merendeel van de oorspronkelijke Cluster A-items al geïmplementeerd:

| Item | Status bij aanvang |
|------|-------------------|
| #7 Datum concept vs. definitief contract | ✅ al gedaan (stepper toont al `createdAt` als concept en `signedAt` als definitief) |
| #8 Contracten per pand genereren (was hardcoded Gent) | ✅ al gedaan (`property.city` wordt al gebruikt in `pdfDocuments.ts`) |
| #13 Verhuurdergegevens compleet vóór contract aanmaken | ✅ al gedaan |
| N6 PDF-knop naar InspectionDetailPage | ✅ al gedaan |
| N7 Contract-PDF en plaatsbeschrijving-PDF apart | ✅ al gedaan (aparte `generateContractHtml` en `generateInspectionHtml`) |
| Minderjarigheid / voogd in contract en ondertekening | ✅ al gedaan (`signatureLabelFor`, `signaturePartyLabel`, `isMinor` check) |

**Effectief nieuw te implementeren in deze cluster:**

1. Stepper vereenvoudigen — plaatsbeschrijving uit de stappen halen
2. "Concept sturen" functionaliteit met datumregistratie
3. Verhuurder-datum fix in het contract-PDF

---

## Scope

### 1. Stepper vereenvoudigen (`ContractDetailPage.tsx`)

**Huidig:** 4 stappen — Contract aangemaakt / Startplaatsbeschrijving / Handtekeningen / Versturen. De handtekening-stap is geblokkeerd totdat de plaatsbeschrijving klaar is.

**Nieuw:** 3 stappen — Contract aangemaakt / Handtekeningen / Versturen.

- De `ProgressRow` voor "Startplaatsbeschrijving" wordt verwijderd uit de Voortgang-sectie
- De `blocked={!startDone}` conditie op de handtekening-rij verdwijnt — ondertekenen is meteen beschikbaar
- De Inspectiepaspoort-sectie onderaan de pagina (start- én eindplaatsbeschrijving) blijft volledig ongewijzigd — de plaatsbeschrijving is los van de contractflow, niet verplicht vóór ondertekening

**Rationale:** Een kotbaas moet de vrijheid hebben de plaatsbeschrijving zelf in te vullen, uit te besteden aan de student, of op een later moment te doen. Het contract ondertekenen mag daar niet van afhangen.

---

### 2. Concept sturen

#### 2a. Data-laag

**`src/types/index.ts`**
- Nieuw optioneel veld `conceptSentAt?: string` op het `Contract` type (naast bestaande `signedAt?` en `sentAt?`)

**Supabase migratie** (`supabase/migrations/20260618_concept_sent_at.sql`)
```sql
ALTER TABLE contracts ADD COLUMN concept_sent_at TIMESTAMPTZ;
```
RLS-aanpassing niet nodig — bestaande row-level policy dekt dit veld automatisch.

**`src/lib/data.ts`**
- Nieuwe functie `saveConceptSentAt(contractId: string): Promise<void>`
  - Supabase: `UPDATE contracts SET concept_sent_at = now() WHERE id = contractId`
  - Mock mode (geen Supabase): no-op
- `sendContractEmail` krijgt optionele vierde parameter `isConcept?: boolean`; geeft die mee in de body-payload naar de Edge Function

**Mock data (`src/lib/mockData.ts`)**
- Bestaande contractrecords: `conceptSentAt` blijft `undefined` (geen wijziging nodig)

#### 2b. ContractDetailPage

**Nieuwe state:** `conceptSendStatus: 'idle' | 'sending' | 'sent' | 'error'`

**Step 1 — "Contract aangemaakt" rij:**

Wanneer `conceptSentAt` nog niet gezet is:
- Knop "Concept sturen" rechts in de rij (secondary stijl: `glass-chip`)

Wanneer `conceptSentAt` gezet is (na versturen):
- Knop verdwijnt
- Rechts in de rij: `✓ Verstuurd` in accentkleur + datum (`new Date(conceptSentAt).toLocaleDateString('nl-BE', ...)`)

**Nieuwe handler `handleSendConcept()`:**
1. Zet `conceptSendStatus = 'sending'`
2. Genereert contract HTML via `generateContractHtml(bundle, { isConcept: true })` (geen handtekeningen — `landlordSignatureDataUrl` en `studentSignatureDataUrl` zijn op dat moment `undefined`)
3. Genereert PDF via `generateContractPdfBase64`
4. Roept `sendContractEmail(student.email, naam, html, pdfBase64, true)` aan (en eventueel `secondStudent.email`)
5. Roept `saveConceptSentAt(contract.id)` aan
6. Zet lokaal `bundle.contract.conceptSentAt = new Date().toISOString()`
7. Zet `conceptSendStatus = 'sent'`

Foutafhandeling: bij falen → `conceptSendStatus = 'error'`, foutbericht in `statusMessage`.

#### 2c. Edge Function (`supabase/functions/send-contract-email/index.ts`)

Leest `isConcept?: boolean` uit de JSON-body. Wanneer `true`:

| Veld | Normaal | Concept |
|------|---------|---------|
| Subject | `Huurovereenkomst voor [naam]` | `Concept huurovereenkomst voor [naam]` |
| Bodytekst | `In bijlage vindt u de ondertekende huurovereenkomst als PDF.` | `In bijlage vindt u een concept van de huurovereenkomst als PDF.` |
| Bestandsnaam | `huurovereenkomst_[naam].pdf` | `concept_huurovereenkomst_[naam].pdf` |

Validatie-check in de Edge Function uitbreiden: `isConcept` accepteren als optioneel boolean veld.

#### 2d. PDF-document (`src/lib/pdfDocuments.ts`)

`generateContractHtml` krijgt een optionele tweede parameter `{ isConcept?: boolean }`.

Wanneer `isConcept: true`:
```html
<!-- was: -->
<h1>HUUROVEREENKOMST STUDENTENKAMER</h1>
<!-- wordt: -->
<h1>CONCEPT HUUROVEREENKOMST STUDENTENKAMER</h1>
```

`printContractDocument` en `generateContractPdfBase64` geven de opties door aan `generateContractHtml`.

---

### 3. Verhuurder-datum fix (`src/lib/pdfDocuments.ts`)

**Probleem:** In het handtekeningblok van het contract staat bij de verhuurder `Datum: _____ / _____ / _____` hardcoded, terwijl de huurder-kant al `${signedDate}` gebruikt.

**Fix:** Vervang in het verhuurder-blok:
```html
<!-- was: -->
Datum: _____ / _____ / _____
<!-- wordt: -->
Datum: ${escapeHtml(signedDate)}
```

`signedDate` is al berekend via `formatDocumentDate(contract.signedAt)`, die automatisch `_____ / _____ / _____` teruggeeft als `signedAt` nog `undefined` is — dus concept-PDF toont correct een leeg veld, ondertekend contract toont de echte datum op beide kanten.

---

## Bestanden gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | `conceptSentAt?: string` op `Contract` |
| `supabase/migrations/20260618_concept_sent_at.sql` | `ALTER TABLE contracts ADD COLUMN concept_sent_at TIMESTAMPTZ` |
| `src/lib/data.ts` | `saveConceptSentAt()`, `sendContractEmail` isConcept param |
| `src/lib/pdfDocuments.ts` | `isConcept` vlag op `generateContractHtml`, verhuurder datum fix |
| `src/pages/ContractDetailPage.tsx` | Stepper vereenvoudigen, concept-knop + handler |
| `supabase/functions/send-contract-email/index.ts` | `isConcept` payload verwerken |

---

## Buiten scope

- `staging-bootstrap.sql` updaten met de nieuwe migratie (aparte stap na implementatie, zoals bij vorige clusters)
- N3 (dark/light thema), N4 (taalkeuze), N8 (e-mail/wachtwoord wijzigen) — dit zijn Cluster E-items
