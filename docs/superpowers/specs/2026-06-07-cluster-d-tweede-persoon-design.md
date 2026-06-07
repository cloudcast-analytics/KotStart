# Cluster D — Tweede persoon · Ontwerp

**Datum:** 2026-06-07
**Status:** Goedgekeurd ontwerp (klaar voor implementatieplan)
**Onderdeel van:** "Aanpassingen KotStart" (volledige launch). Eén van vier clusters; dit is cluster D.
**Volgorde:** B (klaar) → **D (dit document)** → C → A

## Doel

Punt **#12**: de tweede bewoner van een dubbele kamer wordt vandaag wel in de wizard
ingevoerd en als `secondStudentId` op het contract opgeslagen, maar daarna nergens meer
gebruikt — `getContractBundleData` lost hem niet op, dus hij ontbreekt in dashboard,
contractdetail, PDF en e-mail. Daarnaast bevat Stap 3 van de wizard drie velden
("Tweede verhuurder", "Tweede bewoner", "Voogd") die op de verkeerde plek staan, deels
dood zijn, en niet voldoende data verzamelen om een echte studentrij te kunnen aanmaken.

Dit ontwerp maakt van de tweede bewoner een **volwaardige, zichtbare deelnemer** aan het
contract — van invoer tot dashboard tot PDF/e-mail — en ruimt de drie misplaatste Stap-3
velden op.

## Beslissingen (uit brainstorm)

| Onderwerp | Keuze |
|-----------|-------|
| Stap 3 ("Partij") | **Volledig verwijderen** uit de wizard. De pagina staat op de verkeerde plek (een tweede verhuurder voeg je nooit hier toe) en de velden ("naam + e-mail") zijn te schraal om een echte studentrij te vormen. |
| Tweede verhuurder | **Volledig schrappen** — uit de wizard, het datamodel én de database (dode functionaliteit, nooit elders gebruikt). |
| Tweede bewoner (`secondTenant`) | **Volledig schrappen** — was sowieso al verborgen bij dubbele kamers en nooit gepersisteerd; de échte tweede bewoner komt nu uit de Stap-2-flow die al bestaat voor `roomType === 'double'`. |
| Voogd-veld | **Verplaatsen naar Stap 2**, per student (niet meer als los, algemeen veld in Stap 3). |
| Voogd-model | **Eén voogd per minderjarige student** — naam, e-mail, telefoon. Geen gedeelde voogd voor beide studenten. |
| Wie ondertekent bij minderjarigheid | **Bewust uitgesteld naar cluster A** — daar wordt de hele ondertekenings-/verzendflow herzien. Nu verzamelen we enkel de voogd-gegevens; wie tekent (student, voogd, of beiden) wordt daar bepaald. |
| Dashboardweergave | **Eén rij, gecombineerde naam** ("Emma Janssen & Liam Pieters") — consistent met hoe een dubbele kamer er nu al uitziet voor andere doeleinden. |
| Plaatsbeschrijving & stappen bij 2 studenten | **Geen duplicatie.** Beide horen bij het CONTRACT (= kamer + schooljaar), niet bij de student: `Inspection.contractId` levert er precies één op, en de 4-staps-checklist (aangemaakt → plaatsbeschrijving → ondertekening verhuurder → versturen) draait al op contractniveau. Enkel de **informatieweergave** op `ContractDetailPage` breidt uit naar twee studentkoppen. |
| Verzending van het contract | **Naar beide studenten** — wanneer er een tweede bewoner is, ontvangt die hetzelfde document op zijn/haar eigen e-mailadres (zie "E-mailverzending" hieronder). |
| Studentinfo in het contractdocument | **Beide bewoners volledig vermeld** — niet enkel een gecombineerde naam. De PDF/HTML krijgt een infoblok per huurder (zie "Contractdocument" hieronder). |

## Scope-afbakening

**In scope:**
- Verwijderen van Stap 3 en alle bijhorende dode/misplaatste velden + datamodel + DB-kolommen.
- Voogd-data verzamelen per (minderjarige) student in Stap 2.
- Tweede bewoner overal zichtbaar/bruikbaar maken: bundle-resolutie, dashboard, contractdetail, PDF, e-mail.

**Buiten scope (andere clusters):**
- **Wie ondertekent** het contract bij een minderjarige bewoner (student/voogd/beiden) → **cluster A**.
- Verdere herziening van de volledige contract-/ondertekeningsflow → **cluster A**.
- Plaatsbeschrijving-gerelateerde aanpassingen → **cluster C**.

## Datamodel

### `Contract` (`src/types/index.ts`)
Verwijderen: `secondLandlordName?`, `secondLandlordEmail?`, `guardianName?`, `guardianEmail?`,
`guardianPhone?` (verhuizen naar `Student`, zie hieronder — of vervallen volledig voor
`secondLandlord*`).

`secondStudentId?: string` blijft ongewijzigd.

### `Student` (`src/types/index.ts`)
Toevoegen:
```ts
guardianName?: string
guardianEmail?: string
guardianPhone?: string
```

### `StudentDashboardRow` (`src/types/index.ts`)
Toevoegen voor de gecombineerde weergave:
```ts
secondFirstName?: string
secondLastName?: string
```

### Database (nieuwe migratie)
Nieuw bestand `supabase/migrations/2026XXXXXXXXXXXX_second_student_guardian.sql`:

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

`mapStudent`, `StudentRow` (DB-type) en `createContractDraft` in `src/lib/data.ts` worden
bijgewerkt om de nieuwe `guardian_*`-kolommen op `students` te lezen/schrijven; de
`second_landlord_*`/`guardian_*`-writes naar `contracts` verdwijnen.

## Componenten & units

### `src/pages/wizard/Step3SecondParty.tsx` — verwijderen
Het volledige bestand (199 regels: "Tweede verhuurder", "Tweede bewoner", "Voogd",
gedeelde `Toggle`/`PartyFields`-subcomponenten) wordt verwijderd.

### `src/pages/wizard/types.ts`
- `SecondPartyData` — verwijderen (enkel gebruikt door de geschrapte velden).
- `GuardianData` — verwijderen als los, algemeen type; voogdvelden komen rechtstreeks op
  `StudentFormData`:
```ts
guardianName?: string
guardianEmail?: string
guardianPhone?: string
```
- `StudentFormData` krijgt deze drie optionele velden naast de bestaande 16.

### `src/pages/wizard/Step2Student.tsx`
In `StudentForm`, direct na het bestaande minderjarigheids-bericht ("Minderjarig, voogd
wordt vereist..."), komt — **enkel wanneer `isMinor(student.dateOfBirth)` waar is** — een
nieuwe subsectie "Voogd" toegevoegd, in exact hetzelfde visuele patroon als de bestaande
"Studie"/"Hoofdverblijf"-blokken (`border-t border-white/60 pt-3`,
`text-[10.5px] font-bold uppercase tracking-wider text-slate-400`-koptekst, en
`TextInput`'s in dezelfde stijl):

- Naam voogd * (verplicht)
- E-mail voogd * (verplicht, met dezelfde `isValidEmail`-validatie als studentmail)
- Telefoon voogd (optioneel)

Validatie volgt het bestaande `touched`/`fieldError`-patroon: verplicht-check faalt zolang
de student minderjarig is en het veld leeg is; e-mailformaat-check identiek aan het
bestaande `email`-veld.

### `src/pages/wizard/Step4Review.tsx`
- Props `secondLandlord` en `secondTenant` (en hun bijhorende `SectionCard`-blokken)
  verdwijnen volledig.
- Prop `guardian: GuardianData | null` verdwijnt; in de plaats toont elke studentkaart
  (`students.map(...)`) — wanneer die student minderjarig is — een ingebedde voogd-subsectie
  met dezelfde `InfoRow`'s als de rest van de kaart, voorafgegaan door een mini-koptekst
  "Voogd" (`text-[10.5px] font-bold uppercase tracking-wider text-slate-400`,
  `border-t border-slate-100/60 pt-2`). Geen aparte kaart meer.

### `src/pages/ContractNewPage.tsx`
- State `secondLandlord`, `secondTenant`, `guardian` verdwijnen volledig (de laatste leeft
  voortaan per student in `StudentFormData`).
- `WizardStep`-type gaat van 4 naar 3 stappen (Kamer → Student(en) → Overzicht); Stap 3
  ("Partij") wordt overgeslagen in de stappen-array en de `StepIndicator`.
- `emptyStudent()` initialiseert de drie nieuwe voogdvelden als lege strings.
- `studentIsComplete()` faalt zolang een minderjarige student geen `guardianName`/
  `guardianEmail` heeft ingevuld (telefoon optioneel).
- `createContractDraft`-aanroep stuurt de voogdvelden mee per student (zie hieronder).

### `src/lib/data.ts`

**`CreateContractDraftInput`**: `secondLandlord` en `guardian` (top-level) verdwijnen.
`ContractDraftStudent` krijgt `guardianName?`, `guardianEmail?`, `guardianPhone?`.

**`createContractDraft`**: schrijft de voogdvelden naar de `students`-rij (niet meer naar
`contracts`); `second_landlord_*`/`guardian_*`-writes naar `contracts` verdwijnen.

**`getContractBundleData`** (regel ~373-427): lost voortaan ook de tweede student op:
```ts
const secondStudent = contract.secondStudentId
  ? students.find(s => s.id === contract.secondStudentId)
  : undefined
```
en neemt `secondStudent` op in het geretourneerde bundle-object (het `ContractBundle`-type
heeft dit veld al).

**`buildDashboardRows`/`getDashboardRowsData`**: lossen `secondStudentId` op en vullen
`secondFirstName`/`secondLastName` op `StudentDashboardRow`.

**`sendContractEmail`**: blijft single-recipient (`to: string`); zie "E-mailverzending"
hieronder voor hoe de aanroeper dit met twee ontvangers gebruikt.

### `src/pages/components/StudentRow.tsx`
Toont, wanneer `secondFirstName`/`secondLastName` aanwezig zijn, de gecombineerde naam:
`${firstName} ${lastName} & ${secondFirstName} ${secondLastName}` — verder ongewijzigd
(zelfde acties, zelfde styling).

## Contractdetail (`ContractDetailPage.tsx`)

**Geen wijziging aan de workflow/stappen** — die blijven exact zoals nu (één plaatsbeschrijving,
één ondertekening, één verzendactie), want ze zijn al contract-scoped.

**Wel wijziging aan de informatieweergave**: de bovenste `glass`-kaart toont, wanneer
`bundle.secondStudent` bestaat, **twee** koppen (avatar + naam + subtitel + eventuele
"Minderjarig — voogd: …"-notitie) gestapeld in dezelfde kaart met een `border-t
border-white/60`-scheiding — in plaats van één. Acties (Verlengen, PDF maken, verwijderen)
blijven ongewijzigd en eenmalig.

`handleSend` en de `printContractDocument`/`generateContractHtml`-aanroepen geven voortaan
ook `secondStudent` mee in de bundle.

## E-mailverzending naar beide studenten

`sendContractEmail` blijft single-recipient (de edge function `send-contract-email`
valideert en accepteert exact één `to`-adres — wijzigen daarvan zou een aparte, niet
triviale aanpassing aan de Resend-integratie betekenen, buiten de scope van dit punt).

**Aanpak:** `handleSend` in `ContractDetailPage.tsx` roept `sendContractEmail` **twee keer**
aan wanneer er een `secondStudent` is — eenmaal per student, telkens met diens eigen
naam/adres en dezelfde gegenereerde `html`/`pdfBase64`:

```ts
await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html, pdfBase64)
if (secondStudent?.email) {
  await sendContractEmail(secondStudent.email, `${secondStudent.firstName} ${secondStudent.lastName}`, html, pdfBase64)
}
```

De statusboodschap na verzending vermeldt beide adressen wanneer van toepassing
("Contract is verstuurd naar emma@... en liam@...").

## Contractdocument (`pdfDocuments.ts`)

In `generateContractHtml`:
- De kop **"ANDERZIJDS, de HUURDER:"** wordt **"ANDERZIJDS, de HUURDERS:"** zodra er een
  `secondStudent` is.
- Het bestaande infoblok (naam, geboortedatum, instelling, faculteit, studentnummer,
  hoofdverblijf via `formatResidence`, telefoon, e-mail) wordt voor de eerste huurder
  behouden, en — wanneer `secondStudent` aanwezig is — **identiek herhaald** voor de tweede
  huurder direct eronder, elk gelabeld "Huurder 1" / "Huurder 2".
- De huidige `huurderNaam`-samenvoeging (`${student.lastName}, ${student.firstName} &amp;
  ${secondStudent.lastName}, ${secondStudent.firstName}`) blijft bestaan voor plekken in het
  contract waar één samengevatte naam nodig is (bv. titel/aanhef), maar het detailblok toont
  voortaan beide volledig.

## Mockdata (`src/lib/mockData.ts`)

Eén bestaand contract op een `double`-kamer (bv. `c-demo-student`, kamer `r6`) krijgt een
`secondStudentId` verwijzend naar een nieuwe of bestaande student, zodat de afgewerkte
functionaliteit in demo-modus zichtbaar/test­baar is. Eén van de twee gekoppelde studenten
krijgt een `dateOfBirth` die hem/haar minderjarig maakt plus ingevulde `guardianName`/
`guardianEmail`/`guardianPhone`, zodat ook het voogd-pad gedemonstreerd wordt.
`getDashboardRows` (mock-equivalent van `getDashboardRowsData`) krijgt dezelfde
`secondFirstName`/`secondLastName`-resolutie als de Supabase-variant.

## Tests (Vitest)

- `getContractBundleData`: retourneert `secondStudent` wanneer `secondStudentId` gezet is;
  `undefined` wanneer niet.
- `getDashboardRowsData`/mock-equivalent: combineert namen correct wanneer een tweede
  student aanwezig is.
- `StudentRow`: toont gecombineerde naam wanneer `secondFirstName`/`secondLastName` gezet zijn.
- `Step2Student`: toont voogd-subsectie enkel bij minderjarigheid; valideert verplichte
  voogd-velden en e-mailformaat.
- `Step4Review`: toont voogd ingebed in de studentkaart, geen aparte kaarten meer voor
  "Tweede verhuurder"/"Tweede bewoner"/"Voogd".
- `generateContractHtml`: toont "HUURDERS" (meervoud) + twee volledige infoblokken wanneer
  `secondStudent` aanwezig is; "HUURDER" (enkelvoud) + één blok wanneer niet.
- `handleSend`/e-mail: verstuurt naar beide adressen wanneer `secondStudent.email` aanwezig
  is (via een geïsoleerde test van de verzendlogica, niet van de hele pagina-flow).

## Bestanden geraakt (overzicht)

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | `Contract`: `secondLandlord*`/`guardian*` weg; `Student`: `guardian*` toe; `StudentDashboardRow`: `secondFirstName`/`secondLastName` toe |
| `src/pages/wizard/Step3SecondParty.tsx` | **verwijderd** |
| `src/pages/wizard/types.ts` | `SecondPartyData`/`GuardianData` weg; `StudentFormData`: `guardian*` toe |
| `src/pages/wizard/Step2Student.tsx` | voogd-subsectie per minderjarige student |
| `src/pages/wizard/Step4Review.tsx` | `secondLandlord`/`secondTenant`/`guardian`-props weg; voogd ingebed per studentkaart |
| `src/pages/ContractNewPage.tsx` | state opruimen, `WizardStep` 4→3, `emptyStudent`, `studentIsComplete` |
| `src/lib/data.ts` | `CreateContractDraftInput`/`ContractDraftStudent`, `createContractDraft`, `getContractBundleData` (`secondStudent`), dashboard-rijen (`secondFirstName`/`secondLastName`) |
| `src/pages/components/StudentRow.tsx` | gecombineerde naam tonen |
| `src/pages/ContractDetailPage.tsx` | twee studentkoppen, `secondStudent` in send/print-bundle, dubbele e-mailverzending, statusboodschap |
| `src/lib/pdfDocuments.ts` | "HUURDERS" + twee volledige infoblokken |
| `src/lib/mockData.ts` | demo-contract met tweede (minderjarige) student + voogd |
| `supabase/migrations/2026…_second_student_guardian.sql` | **nieuw** — kolomwijzigingen |
| `src/__tests__/…` | nieuwe/aangepaste tests |

## Openstaand

- **Wie ondertekent bij minderjarigheid** (student, voogd, of beiden — wettelijk vereiste)
  wordt in **cluster A** uitgewerkt, samen met de bredere herziening van de
  ondertekenings-/verzendflow.
