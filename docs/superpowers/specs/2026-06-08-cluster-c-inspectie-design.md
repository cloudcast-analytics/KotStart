# Cluster C — Inspectie/Plaatsbeschrijving — Design

**Datum:** 2026-06-08
**Status:** Ontwerp goedgekeurd door Vince, klaar voor implementatieplan
**Bron:** items #1 en #2 uit `aanpassingen kotstart.docx`, geclusterd in
`docs/superpowers/specs/2026-06-08-resterende-aanpassingen-clustering.md`

## Scope

Twee gerichte aanpassingen aan de plaatsbeschrijving (inspectie)-flow:

1. **#2 — Sleutels**: het item "Sleutels" (in categorie "Algemeen") registreert nu een
   conditie (Goed/Matig/Slecht/Onbruikbaar), net als alle andere items. Dat moet een
   **aantal sleutels** worden.
2. **#1 — Overzichtsfoto's**: de afsluitende stap van de inspectie-wizard staat nu precies
   **1** overzichtsfoto toe. Dat moet **5 tot 8** foto's worden.

Geraakte bestanden: `src/types/index.ts`, `src/pages/InspectionNewPage.tsx`,
`src/pages/InspectionDetailPage.tsx`, `src/lib/data.ts`, `src/lib/pdfDocuments.ts`,
`supabase/migrations/`, en de bijhorende tests in `src/__tests__/`.

---

## 1. Sleutels: aantal i.p.v. staat

### Datamodel

- `InspectionItem.condition` blijft `'good' | 'moderate' | 'bad' | 'unusable'`, maar wordt
  `| null` voor het Sleutels-item (de DB-kolom is al nullable: geen migratie nodig voor dit deel).
- Nieuw veld `keyCount?: number | null` op `InspectionItem`.
- DB: `inspection_items` krijgt een kolom `key_count integer check (key_count >= 0)`.
- `SaveInspectionInput.items[]` krijgt een optioneel `keyCount: number | null` naast het
  bestaande `condition`-veld.

Voor het Sleutels-item wordt `condition: null, keyCount: <n>` opgeslagen; voor alle andere
items blijft `condition: <waarde>, keyCount: null`.

### Wizard (`InspectionNewPage.tsx`)

- `InspectionItemState` krijgt `keyCount: number | null` naast `condition` en `photoUrl`.
- Voor het item met `itemName === 'Sleutels'` rendert de kaart een `+`/`-`-stepper
  (start op 0, ondergrens 0) in plaats van de vier conditie-knoppen.
- De voltooiingscheck wordt verplaatst naar een kleine helper `isItemComplete(categoryId, itemName)`
  die voor `'Sleutels'` controleert op `keyCount != null` en voor alle andere items op
  `condition != null`. `currentCategoryComplete()` gebruikt deze helper per item. Dit is een
  kleine if-tak in de bestaande validatielogica — geen aparte item-type-configstructuur, omdat
  het om precies één speciaal item gaat.
- De payload-opbouw (`handleNext` en `inspectionDocumentItems`) stuurt voor Sleutels
  `condition: null, keyCount: state.keyCount` mee, voor andere items `condition: state.condition,
  keyCount: null`.

### Weergave (detail + beide PDF's)

Op drie plekken wordt nu `CONDITION_LABEL[item.condition]` getoond; daar moet voor het
Sleutels-item i.p.v. een conditie-badge de tekst **"N stuks"** komen (enkelvoud: "1 stuk"):

1. `InspectionDetailPage.tsx` — de conditie-badge per item
2. `printInspectionDocument` in `pdfDocuments.ts` — los inspectierapport
3. `inspectionTableRows` in `pdfDocuments.ts` (~regel 154-172) — de
   plaatsbeschrijvingstabel in het contract-PDF, die `found.condition` opzoekt via
   `inspectionLookup`

Een kleine helper (bv. `formatItemValue(item)`) die op basis van `itemName === 'Sleutels'`
ofwel "N stuks" ofwel het conditie-label teruggeeft, voorkomt duplicatie tussen deze drie
plekken.

---

## 2. Overzichtsfoto's: 1 → 5-8

### Datamodel

- `Inspection.overviewPhotoUrl?: string` wordt `Inspection.overviewPhotoUrls: string[]`.
- DB-migratie:
  - nieuwe kolom `inspections.overview_photo_urls text[]`
  - bestaande data overzetten: `update inspections set overview_photo_urls =
    array[overview_photo_url] where overview_photo_url is not null`
  - oude kolom `overview_photo_url` verwijderen
- `SaveInspectionInput.overviewPhotoUrl: string | null` wordt `overviewPhotoUrls: string[]`.

### Wizard (laatste stap, `InspectionNewPage.tsx`)

- State wordt `overviewPhotoUrls: string[]` (was een losse `string | null`).
- Een galerij-grid toont de toegevoegde foto's; elke foto krijgt een ✕-knopje om te
  verwijderen. Een `+`-tegel laat een nieuwe foto toevoegen (camera/galerij, zoals nu via
  `readImage`), en wordt verborgen/uitgeschakeld zodra er 8 foto's zijn.
- Voortgangstekst onder de galerij: bv. *"3/8 foto's — voeg nog minstens 2 toe"* zolang
  `length < 5`, daarna gewoon *"6/8 foto's"*.
- `canProceed()` op de laatste stap wordt `overviewPhotoUrls.length >= 5` (de UI
  verhindert reeds verder gaan dan 8 door de `+`-tegel te verbergen).

### Opslaan (`saveInspectionData` in `data.ts`)

- I.p.v. één `uploadDataUrl`-aanroep wordt elke foto in de array individueel via
  `uploadDataUrl('inspection-photos', 'overview', ...)` geüpload (parallel via
  `Promise.all`, zoals nu al gebeurt voor `items[].photoUrl`); het resultaat is een
  `string[]` die als `overview_photo_urls` wordt opgeslagen.

### Weergave (detail + beide PDF's)

- `InspectionDetailPage.tsx`: i.p.v. één `<img>` een fotogalerij-grid (2-3 kolommen).
- `printInspectionDocument` in `pdfDocuments.ts`: alle foto's na elkaar/in een grid
  i.p.v. de huidige enkele `<img>`.
- `generateContractHtml` (contract-PDF, `ContractBundle.inspection?.overviewPhotoUrl`):
  moet eveneens overstappen op de array en een grid tonen i.p.v. één foto.

---

## Tests

De bestaande tests in `src/__tests__/` die `overviewPhotoUrl` (enkelvoud) of
conditie-gebaseerde Sleutels-items gebruiken (o.a. `pdfDocuments.test.ts`) moeten worden
bijgewerkt naar de nieuwe array- resp. keyCount-vorm. `mockData.ts` (regels 80, 87, 93-96)
moet eveneens worden aangepast: `overviewPhotoUrl: undefined` → `overviewPhotoUrls: []`
(of een paar mock-URL's), en een Sleutels-mockitem met `keyCount` i.p.v. `condition`.

## Out of scope

- Geen wijzigingen aan andere inspectie-items, categorieën, of de algemene wizard-flow.
- Geen wijzigingen aan de conditie-gebaseerde items — enkel "Sleutels" wijzigt van
  conditie naar aantal.
- Geen migratie-tooling voor productiedata nodig: dit is stagingomgeving.
