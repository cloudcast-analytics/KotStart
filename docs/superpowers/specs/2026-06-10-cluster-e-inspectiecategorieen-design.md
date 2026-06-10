# Cluster E — N2: Aanpasbare plaatsbeschrijvingscategorieën — Design

**Datum:** 2026-06-10
**Status:** Ontwerp goedgekeurd door Vince, klaar voor implementatieplan
**Bron:** item N2 uit `docs/superpowers/specs/2026-06-08-resterende-aanpassingen-clustering.md`
(Cluster E — Instellingen & Profiel)

## Scope

Vandaag staat de plaatsbeschrijvings-checklist (categorieën + items) hardcoded als
`CATEGORIES` in `src/pages/InspectionNewPage.tsx`. Dit cluster maakt die lijst beheerbaar
door de verhuurder, vanuit Instellingen.

**v1-scope (deze spec):**
- Eén centraal, editbaar template per verhuurder (alle panden gebruiken hetzelfde template).
- Volledige bewerkbaarheid: categorieën toevoegen/hernoemen/verwijderen/herordenen, en
  binnen elke categorie items toevoegen/hernoemen/verwijderen/herordenen.
- Drie itemtypes: **conditie** (Goed/Matig/Slecht/Onbruikbaar — huidig gedrag), **aantal**
  (zoals "Sleutels" nu — generiek gemaakt), en **meterstand** (nieuw — numerieke waarde met
  hardcoded eenheid kWh of m³).
- "Algemeen"-categorie krijgt een nieuw item "Gasmeter" (meterstand, m³); "Verwarming"
  blijft een conditie-item.

**Expliciet uit scope (vervolgstap):**
- Per-pand toewijzing van meerdere templates. Het datamodel (`inspection_templates` als
  losse tabel met `owner_id`) is zo opgezet dat dit later kan worden toegevoegd door extra
  rijen + een `properties.inspection_template_id`-kolom, zonder herontwerp van de
  JSON-structuur.

Geraakte bestanden: `src/types/index.ts`, `src/lib/mockData.ts`, `src/lib/data.ts`,
`src/pages/SettingsPage.tsx`, `src/pages/InspectionNewPage.tsx`,
`src/pages/InspectionDetailPage.tsx`, `src/lib/pdfDocuments.ts`, `supabase/migrations/`,
`supabase/staging-bootstrap.sql`, en de bijhorende tests in `src/__tests__/`.

---

## 1. Datamodel

### Types (`src/types/index.ts`)

```ts
export type InspectionItemType = 'condition' | 'count' | 'meter'
export type InspectionMeterUnit = 'kWh' | 'm³'

export interface InspectionTemplateItem {
  name: string
  type: InspectionItemType
  unit?: InspectionMeterUnit // verplicht wanneer type === 'meter'
}

export interface InspectionTemplateCategory {
  id: string
  label: string
  items: InspectionTemplateItem[]
}
```

`InspectionItem` (bestaand) krijgt twee nieuwe optionele velden:

```ts
export interface InspectionItem {
  // ...bestaande velden (id, inspectionId, category, itemName, condition, keyCount, photoUrl, notes)
  meterValue?: number | null
  meterUnit?: InspectionMeterUnit | null
}
```

### Supabase

Nieuwe tabel `inspection_templates` (één rij per verhuurder):

```sql
create table inspection_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  categories jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inspection_templates enable row level security;

create policy "Owners manage their inspection template"
  on inspection_templates for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

`inspection_items` krijgt twee nieuwe nullable kolommen:

```sql
alter table inspection_items
  add column if not exists meter_value numeric,
  add column if not exists meter_unit text;
```

Migratiebestand: `supabase/migrations/20260610100000_inspection_templates.sql`. Na het
schrijven van de migratie wordt deze, net als bij Cluster A, meteen via de Supabase MCP op
**staging** (`bqlykafglpdumupesdsl`) toegepast. `supabase/staging-bootstrap.sql` wordt met
dezelfde DDL bijgewerkt zodat een verse staging-DB consistent blijft.

`categories`-kolom bevat de JSON-array van `InspectionTemplateCategory[]` zoals hierboven
gedefinieerd. Categorie-`id`'s worden gegenereerd bij aanmaak (slug van het label + korte
random suffix, bv. `kamer-a3f1`) zodat ze stabiel en uniek blijven, ook na hernoemen.

---

## 2. Standaardtemplate (`src/lib/mockData.ts`)

`DEFAULT_INSPECTION_CATEGORIES: InspectionTemplateCategory[]` vervangt de huidige hardcoded
`CATEGORIES`-constante uit `InspectionNewPage.tsx`:

```ts
export const DEFAULT_INSPECTION_CATEGORIES: InspectionTemplateCategory[] = [
  {
    id: 'kitchen',
    label: 'Keuken',
    items: [
      { name: 'Aanrecht', type: 'condition' },
      { name: 'Gootsteen & kraan', type: 'condition' },
      { name: 'Oven/kookplaat', type: 'condition' },
      { name: 'Koelkast', type: 'condition' },
      { name: 'Microgolf', type: 'condition' },
      { name: 'Kasten', type: 'condition' },
      { name: 'Vloer', type: 'condition' },
    ],
  },
  {
    id: 'bathroom',
    label: 'Badkamer',
    items: [
      { name: 'Wastafel & kraan', type: 'condition' },
      { name: 'Douche/bad', type: 'condition' },
      { name: 'Toilet', type: 'condition' },
      { name: 'Toiletbril', type: 'condition' },
      { name: 'Spiegel', type: 'condition' },
      { name: 'Afvoer', type: 'condition' },
      { name: 'Vloer', type: 'condition' },
    ],
  },
  {
    id: 'living',
    label: 'Kamer',
    items: [
      { name: 'Vloer', type: 'condition' },
      { name: 'Muren', type: 'condition' },
      { name: 'Plafond', type: 'condition' },
      { name: 'Raam/ramen', type: 'condition' },
      { name: 'Gordijnen/rolgordijnen', type: 'condition' },
      { name: 'Deur', type: 'condition' },
      { name: 'Kledingkast', type: 'condition' },
    ],
  },
  {
    id: 'hall',
    label: 'Inkom',
    items: [
      { name: 'Vloer', type: 'condition' },
      { name: 'Muren', type: 'condition' },
      { name: 'Voordeur', type: 'condition' },
      { name: 'Brievenbus', type: 'condition' },
      { name: 'Deurbel', type: 'condition' },
    ],
  },
  {
    id: 'general',
    label: 'Algemeen',
    items: [
      { name: 'Verwarming', type: 'condition' },
      { name: 'Elektriciteitsmeter', type: 'meter', unit: 'kWh' },
      { name: 'Gasmeter', type: 'meter', unit: 'm³' },
      { name: 'Watermeter', type: 'meter', unit: 'm³' },
      { name: 'Rookmelder', type: 'condition' },
      { name: 'Sleutels', type: 'count' },
    ],
  },
]
```

In demo-mode (Supabase niet geconfigureerd) is dit ook meteen het template dat
`getInspectionCategories()` teruggeeft.

---

## 3. Data-layer (`src/lib/data.ts`)

```ts
export async function getInspectionCategories(): Promise<InspectionTemplateCategory[]> {
  if (!isSupabaseConfigured) return DEFAULT_INSPECTION_CATEGORIES

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return DEFAULT_INSPECTION_CATEGORIES

  const { data, error } = await supabase
    .from('inspection_templates')
    .select('categories')
    .eq('owner_id', userData.user.id)
    .maybeSingle()

  if (error || !data) return DEFAULT_INSPECTION_CATEGORIES
  return data.categories as InspectionTemplateCategory[]
}

export async function saveInspectionCategories(categories: InspectionTemplateCategory[]): Promise<void> {
  if (!isSupabaseConfigured) return

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  const { error } = await supabase
    .from('inspection_templates')
    .upsert({ owner_id: userData.user.id, categories }, { onConflict: 'owner_id' })

  if (error) throw error
}
```

`saveInspectionData` (bestaande functie) krijgt twee extra velden in de insert-payload voor
`inspection_items`: `meter_value: item.meterValue ?? null` en
`meter_unit: item.meterUnit ?? null`.

---

## 4. Instellingen-editor (`src/pages/SettingsPage.tsx`)

Nieuwe sectie "Plaatsbeschrijvingscategorieën", boven of naast de bestaande "Binnenkort"-kaart:

- **Laden:** bij mount `getInspectionCategories()` → lokale state `categories`
  (loading-spinner tijdens fetch).
- **Per categorie:** bewerkbaar label (tekstinvoer), ↑/↓-knoppen om te herordenen,
  verwijderknop met `AlertDialog`-bevestiging (zelfde patroon als "Mijn Panden" op
  `LandlordProfilePage`/`PropertiesPage`).
- **Per item binnen een categorie:** bewerkbare naam, type-dropdown
  (*Conditie / Aantal / Meterstand*), bij "Meterstand" een tweede dropdown met **kWh**/**m³**
  (geen vrije tekst), ↑/↓-knoppen, verwijderknop.
- **"Item toevoegen"** onderaan elke categorie (nieuw item krijgt placeholder-naam "Nieuw
  item", type "Conditie", direct bewerkbaar).
- **"Categorie toevoegen"** onderaan de lijst (genereert een unieke `id` uit het label).
- **"Reset naar standaard"**: `AlertDialog`-bevestiging, herlaadt
  `DEFAULT_INSPECTION_CATEGORIES` in de lokale state (nog niet opgeslagen tot er expliciet
  op "Wijzigingen opslaan" wordt geklikt).
- **"Wijzigingen opslaan"**: roept `saveInspectionCategories(categories)` aan, met
  saving/success/error-feedback (zelfde stijl als andere opslaan-knoppen, bv.
  `AccountPage.tsx`).
- **Validatie:** "Opslaan" is disabled zolang er een lege categorienaam, lege itemnaam, of
  een meterstand-item zonder eenheid bestaat. Bij het wijzigen van een item naar type
  "Meterstand" wordt de eenheid standaard op `kWh` gezet.

---

## 5. Plaatsbeschrijvingswizard (`src/pages/InspectionNewPage.tsx`)

- De hardcoded `CATEGORIES`-constante en de module-level helpers die ervan afhangen
  (`createInitialItems`, de `steps`-array) worden vervangen door state die geladen wordt via
  `getInspectionCategories()` bij mount, met een loading-indicator vóór de data binnen is.
  Bij een laadfout valt de wizard terug op `DEFAULT_INSPECTION_CATEGORIES` (niet-blokkerend),
  zodat de wizard altijd bruikbaar blijft.
- `InspectionItemState` krijgt een `meterValue: number | null` veld naast `condition`,
  `keyCount` en `photoUrl`.
- `category.items` zijn nu `InspectionTemplateItem[]` (objecten) i.p.v. `string[]`. Overal
  waar nu `item` als string wordt gebruikt (itemKey, labels, conditie-vergelijkingen) wordt
  dit `item.name`.
- **Rendering per `item.type`:**
  - `condition` → bestaande vier conditie-knoppen (Goed/Matig/Slecht/Onbruikbaar).
  - `count` → bestaande +/− stepper (was hardcoded op `item === 'Sleutels'`, wordt nu
    generiek `item.type === 'count'`).
  - `meter` → nieuw: numeriek invoerveld (`type="number"`, `min={0}`) met `item.unit`
    (kWh/m³) als label/suffix naast het veld.
- **`isItemComplete(categoryId, item)`** wordt per type:
  - `condition` → `state.condition !== null`
  - `count` → `state.keyCount !== null`
  - `meter` → `state.meterValue !== null`
- **Payload-opbouw** (`handleNext`/save): per item wordt op basis van `item.type` precies
  één van `condition` / `keyCount` / (`meterValue` + `meterUnit` uit `item.unit`) gevuld, de
  andere velden blijven `null`.

---

## 6. Detailweergave & PDF (`InspectionDetailPage.tsx`, `pdfDocuments.ts`)

Beide groeperen items al op `item.category` (string) — geen structurele wijziging nodig
daar. Op de drie plekken waar nu een conditie-badge of "N stuks" (Sleutels) getoond wordt,
komt een derde tak bij:

- Indien `item.meterValue != null` → toon `"<meterValue> <meterUnit>"`
  (bv. "1234 kWh", "87 m³") i.p.v. een conditie-badge of stuks-tekst.

Dit raakt:
1. `InspectionDetailPage.tsx` — item-rij weergave
2. `printInspectionDocument` in `pdfDocuments.ts` — los plaatsbeschrijvingsdocument
3. `inspectionTableRows`/contract-PDF in `pdfDocuments.ts` — plaatsbeschrijvingstabel

---

## 7. Tests

- **`data.test.ts`** (of relevante bestaande testfile): `getInspectionCategories` —
  mock-mode geeft `DEFAULT_INSPECTION_CATEGORIES`; Supabase-mode geeft opgeslagen
  categorieën terug, of valt terug op default als er geen rij bestaat.
  `saveInspectionCategories` — controleert de upsert-call (tabel, `onConflict: 'owner_id'`).
- **`SettingsPage.test.tsx`**: rendert categorieën uit (gemockt) template; toevoegen/
  hernoemen/verwijderen/herordenen van categorie en item; type-dropdown incl. eenheid-
  dropdown bij "Meterstand"; "Reset naar standaard"; "Wijzigingen opslaan" roept
  `saveInspectionCategories` met de verwachte structuur; validatie disable-states.
- **`InspectionNewPage.test.tsx`**: laadt categorieën (gemockt); rendert per `item.type` de
  juiste input (conditie-knoppen / aantal-stepper / meterstand-veld); bestaande
  Sleutels-tests aangepast naar generieke `type === 'count'`-aanpak; nieuwe test voor
  Elektriciteitsmeter (kWh-veld) en Gasmeter (m³-veld); voltooiingscheck per type.
- **`InspectionDetailPage.test.tsx`** / **`pdfDocuments.test.ts`**: meterstand-items tonen
  `"<waarde> <eenheid>"` in detailpagina, los plaatsbeschrijvingsdocument en
  contract-PDF-tabel.

---

## 8. Foutafhandeling

- Instellingen: opslaan mislukt → foutmelding, lokale wijzigingen blijven behouden (niet
  resetten).
- Wizard: categorieën laden mislukt → stille terugval op `DEFAULT_INSPECTION_CATEGORIES`
  zodat een plaatsbeschrijving altijd gestart kan worden.

---

## Open punt voor een latere sessie

Per-pand sjabloon-toewijzing (uit de oorspronkelijke wens "uiteindelijk per pand kunnen
kiezen") is bewust **niet** in deze spec opgenomen. Het datamodel (losse
`inspection_templates`-rijen per `owner_id`) laat dit later toe via extra rijen +
`properties.inspection_template_id`, zonder de JSON-structuur van een template te wijzigen.
