# Cluster B — Studentdata · Ontwerp

**Datum:** 2026-06-06
**Status:** Goedgekeurd ontwerp (klaar voor implementatieplan)
**Onderdeel van:** "Aanpassingen KotStart" (volledige launch). Eén van vier clusters; dit is cluster B.

## Doel

Twee aanpassingen die de **consistentie en kwaliteit van studentdata** verhogen:

- **#9 — Domicilieadres splitsen.** Het ene vrije veld `primaryResidence` wordt gesplitst in
  aparte velden (Straat, Huisnummer, Bus, Postcode, Gemeente) zodat data uniform wordt
  opgeslagen en later betrouwbaar samen te voegen / te corrigeren is.
- **#11 — Onderwijsinstelling als keuzelijst.** Het vrije tekstveld `institution` wordt een
  doorzoekbare keuzelijst van erkende Vlaamse instellingen, zodat "KU Leuven" en
  "Katholieke Universiteit Leuven" niet meer als twee verschillende waarden bestaan.
  De faculteit/opleiding wordt een apart, optioneel vrij veld.

## Beslissingen (uit brainstorm)

| Onderwerp | Keuze |
|-----------|-------|
| #11 bron & onderhoud | Gebundelde lijst in de app + hergeneratie-script (`npm run institutions:update`). Geen runtime-fetch (lijst wijzigt zelden; runtime is fragieler). |
| #11 granulariteit | Dropdown = canonieke **instelling**; **faculteit** is een apart, optioneel vrij veld. |
| #11 dekking | **Enkel Vlaanderen** (universiteiten + hogescholen, incl. Nederlandstalige Brusselse instellingen). Later uitbreidbaar naar Wallonië/buitenland. |
| #11 vangnet | **"Andere…"**-optie die een vrij tekstveld toont (buitenlandse studenten / niet in lijst). |
| #11 UI | Lichte eigen doorzoekbare combobox (`InstitutionSelect`), volgt designsysteem. |
| #9 velden | Straat / Huisnummer / **Bus (optioneel)** / Postcode / Gemeente. |
| #9 opslag | Aparte DB-kolommen. Oude kolom `primary_residence` blijft staan maar ongebruikt (niet-destructief). |
| #9 weergave | Helper `formatResidence()` voegt de velden samen tot één regel voor het contract. |

## Scope-afbakening

**In scope:** alleen de student-domiciledata en de onderwijsinstelling.

**Buiten scope (andere clusters):**
- Verhuurderadres blijft één veld — volledigheidscheck van het verhuurderprofiel hoort bij
  **cluster A (#13)**.
- De contracttemplate (`pdfDocuments.ts`) wordt grondig herzien in **cluster A**. In cluster B
  doen we enkel de **minimale, werkende** aanpassing: `primaryResidence` vervangen door
  `formatResidence()` en faculteit tonen waar nodig, zodat de app blijft werken.

## Datamodel

### `Student` (`src/types/index.ts`)
Verwijder `primaryResidence?: string`. Voeg toe:

```ts
residenceStreet?: string       // Straat
residenceNumber?: string       // Huisnummer
residenceBox?: string          // Bus (optioneel)
residencePostalCode?: string   // Postcode (4 cijfers, BE)
residenceCity?: string         // Gemeente
faculty?: string               // optioneel
```
`institution?: string` blijft (nu = canonieke naam uit de lijst, of vrije tekst bij "Andere…").

### `StudentFormData` (`src/pages/wizard/types.ts`)
Spiegelt `Student`: vervang `primaryResidence: string` door dezelfde zes velden
(`residenceStreet`, `residenceNumber`, `residenceBox`, `residencePostalCode`,
`residenceCity`, `faculty`). De wizard houdt deze als verplichte strings aan
(behalve `residenceBox` en `faculty`, die optioneel zijn).

### Database (nieuwe migratie)
Nieuw bestand `supabase/migrations/2026XXXXXXXXXXXX_student_residence_institution.sql`:

```sql
alter table students
  add column residence_street       text,
  add column residence_number       text,
  add column residence_box          text,
  add column residence_postal_code  text,
  add column residence_city         text,
  add column faculty                text;
-- primary_residence blijft bestaan (niet-destructief), wordt niet meer geschreven.
```

`mapStudent`, `StudentRow` en `createContractDraft` in `src/lib/data.ts` mappen de nieuwe
snake_case-kolommen naar de camelCase-velden en terug.

## Componenten & units

### `src/lib/institutions.ts`
Exporteert de gebundelde, gecureerde lijst:

```ts
export const VLAAMSE_INSTELLINGEN: string[] = [ /* canonieke namen */ ]
```
Bron: officiële Vlaamse lijst (URL door gebruiker aan te leveren). Tot die er is,
een voorlopige gecureerde lijst van Vlaamse universiteiten + hogescholen.

### `scripts/generate-institutions.mjs`
Node-script dat de officiële bron ophaalt/parset en `src/lib/institutions.ts` herschrijft.
Toegevoegd als `"institutions:update"` in `package.json` scripts. De bron-URL staat als
constante bovenaan het script. Handmatig te draaien wanneer de lijst wijzigt — geen
runtime-afhankelijkheid.

### `src/components/InstitutionSelect.tsx`
Lichte doorzoekbare combobox:
- Tekst-input filtert de lijst (typeahead).
- Dropdown toont gefilterde resultaten + onderaan een vaste **"Andere…"**-optie.
- Kiezen van een instelling geeft de canonieke naam terug.
- Kiezen van "Andere…" toont een vrij tekstveld; de ingetypte waarde wordt de `institution`.
- Stijl identiek aan de bestaande stap-2-inputs (rounded-xl, bg-white/60, accent focus-ring).
- Props: `value: string`, `onChange: (value: string) => void`, optioneel `id`/`aria-label`.

### `src/lib/residence.ts`
```ts
export function formatResidence(s: {
  residenceStreet?: string; residenceNumber?: string; residenceBox?: string
  residencePostalCode?: string; residenceCity?: string
}): string
// → "Kerkstraat 22 bus 3, 9200 Dendermonde"  (bus weggelaten indien leeg)

export function isValidBelgianPostalCode(value: string): boolean
// → exact 4 cijfers (1000–9999)
```

## UI-wijzigingen — Wizard stap 2 (`Step2Student.tsx`)

De huidige platte `FIELDS`-lijst (incl. het ene `primaryResidence`-veld) wordt
geherstructureerd in drie blokken per student:

1. **Persoonlijk** — Voornaam*, Achternaam*, E-mail*, Telefoon, Geboortedatum*
   (ongewijzigd; behoudt de bestaande datum-auto-format en minor-detectie).
2. **Studie** — Onderwijsinstelling* (= `InstitutionSelect`), Faculteit/opleiding (optioneel),
   Studentennummer*.
3. **Hoofdverblijf (domicilie)** — Straat*, Huisnummer*, Bus, Postcode*, Gemeente*.

Validatie:
- Verplicht: straat, huisnummer, postcode, gemeente, instelling, studentennummer.
- Optioneel: bus, faculteit, telefoon, foto.
- Postcode faalt als niet exact 4 cijfers (`isValidBelgianPostalCode`).
- Foutmeldingen volgen het bestaande `touched`/`fieldError`-patroon.

`studentIsComplete()` in `ContractNewPage.tsx` wordt bijgewerkt: vervang de
`primaryResidence`-check door checks op straat/huisnummer/postcode/gemeente (+ geldige
postcode) en behoud de instelling-check.

`emptyStudent()` in `ContractNewPage.tsx` initialiseert de nieuwe velden als lege strings.

## Weergave in contract (minimaal)

In `src/lib/pdfDocuments.ts`:
- Rij "Hoofdverblijf" gebruikt `formatResidence(student)` i.p.v. `student.primaryResidence`.
- Rij "Onderwijsinstelling" toont `student.institution`; indien `student.faculty` ingevuld,
  komt er een extra rij "Faculteit" direct daaronder.

(De volledige herziening van de template gebeurt in cluster A.)

## Mockdata (`src/lib/mockData.ts`)

Bestaande `STUDENTS` omzetten: `primaryResidence`/`institution`-strings splitsen naar de
nieuwe velden (canonieke instelling + losse faculteit + gesplitst adres). Voorbeeld:
`"Universiteit Gent (UGent) — Faculteit Ingenieurswetenschappen"` →
`institution: "Universiteit Gent"`, `faculty: "Faculteit Ingenieurswetenschappen"`.

## Tests (Vitest)

- `formatResidence`: met en zonder bus; lege velden weggelaten.
- `isValidBelgianPostalCode`: 4 cijfers geldig, 3/5 cijfers en letters ongeldig.
- `InstitutionSelect`: filtert op invoer; "Andere…" toont vrij tekstveld en geeft vrije
  tekst door via `onChange`.
- `Step2Student`: rendert de drie blokken; toont fout bij ongeldige postcode; respecteert
  optionele bus/faculteit.
- Data-mapping (indien getest in mock-modus): nieuwe velden round-trippen.

## Bestanden geraakt (overzicht)

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | `Student`: residence-velden + `faculty`; `primaryResidence` weg |
| `src/pages/wizard/types.ts` | `StudentFormData` idem |
| `src/lib/institutions.ts` | **nieuw** — gebundelde lijst |
| `scripts/generate-institutions.mjs` | **nieuw** — hergeneratie-script |
| `package.json` | script `institutions:update` |
| `src/components/InstitutionSelect.tsx` | **nieuw** — combobox |
| `src/lib/residence.ts` | **nieuw** — `formatResidence`, postcode-validatie |
| `src/pages/wizard/Step2Student.tsx` | 3 blokken, nieuwe velden, validatie |
| `src/pages/ContractNewPage.tsx` | `emptyStudent`, `studentIsComplete` |
| `src/lib/data.ts` | mapping + `createContractDraft` |
| `src/lib/pdfDocuments.ts` | `formatResidence` + faculteit (minimaal) |
| `src/lib/mockData.ts` | studenten omgezet |
| `supabase/migrations/2026…_student_residence_institution.sql` | **nieuw** — kolommen |
| `src/__tests__/…` | nieuwe tests |

## Openstaand

- **Bron-URL voor de instellingenlijst** wordt door de gebruiker aangeleverd; tot dan een
  voorlopige gecureerde lijst. Het script wordt op die URL gericht.
