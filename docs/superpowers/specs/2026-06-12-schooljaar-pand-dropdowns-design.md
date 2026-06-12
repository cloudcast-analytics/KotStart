# Schooljaar- en pand-dropdowns + zelf schooljaren toevoegen — Design

**Datum:** 2026-06-12
**Status:** Ontwerp goedgekeurd door Vince, klaar voor implementatieplan

## Scope

De TopBar (`src/components/layout/TopBar.tsx`) toont vandaag de geselecteerde
**schooljaar** en het geselecteerde **pand** als `Chip`-knoppen (`src/components/ui/Chip.tsx`):
een knop met een pijltje die er als dropdown uitziet, maar bij elke klik gewoon naar de
**volgende waarde in de lijst** springt (cyclisch). Er is geen manier om direct een waarde
te kiezen, en geen manier om een nieuw schooljaar toe te voegen — `SCHOOL_YEARS` is een
hardcoded array (`src/lib/mockData.ts`) met 4 jaren (`2024–2025` t/m `2027–2028`).

Dit ontwerp maakt twee verbeteringen:

1. **Echte dropdowns**: de schooljaar- en pand-selector in de TopBar worden vervangen door
   een dropdown die bij klik een lijst met **alle** beschikbare opties toont; klik op een
   optie selecteert die direct. Dit hergebruikt het bestaande "lijst met extra actie
   onderaan"-patroon van `InstitutionSelect.tsx` (de "Andere…"-optie bij
   onderwijsinstellingen).
2. **Zelf nieuwe schooljaren toevoegen**: onderaan de schooljaar-dropdown komt — in
   accentblauw, net als "Andere…" — een actie **"+ Volgend schooljaar toevoegen
   (20XX–20XX)"**. Het jaartal wordt automatisch berekend met de bestaande
   `nextSchoolYear()`-functie (geen vrije tekstinvoer). Toegevoegde jaren worden per
   verhuurder bewaard in een nieuwe Supabase-tabel `school_years`, zodat ze na een herlaad
   en op andere toestellen beschikbaar blijven.

**Expliciet uit scope:**

- Geen "schooljaar verwijderen"-actie.
- Geen aanpassing aan **welke** pagina's de schooljaar-/pandfilter gebruiken of hoe
  `getDashboardRowsData(propertyId, schoolYear)` werkt — enkel de UI-interactie
  (cyclisch → dropdown) en de bron van de schooljarenlijst veranderen.
- Geen wijziging aan `nextSchoolYear()` zelf of aan hoe `ContractRenewPage`/
  `createContractRenewal` het volgende schooljaar berekenen.
- Geen "pand toevoegen via dropdown" — panden worden al beheerd via `PropertiesPage`.
- Geen vrije-tekstinvoer voor schooljaren (i.t.t. "Andere…" bij onderwijsinstellingen, dat
  wél vrije tekst toelaat).

Geraakte bestanden: `src/components/ui/FilterDropdown.tsx` (nieuw),
`src/components/ui/Chip.tsx` + `src/__tests__/Chip.test.tsx` (verwijderd),
`src/components/layout/TopBar.tsx`, `src/components/layout/AppShell.tsx`, `src/lib/data.ts`,
`src/lib/mockData.ts`, `supabase/migrations/`, `supabase/staging-bootstrap.sql`,
`src/__tests__/DashboardPage.test.tsx`, en nieuwe tests in `src/__tests__/`.

---

## 1. `FilterDropdown` component

**Nieuw bestand:** `src/components/ui/FilterDropdown.tsx`

Vervangt `Chip` als TopBar-control. Zelfde visuele basis als `Chip`
(`glass-chip flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-slate-800 text-xs
font-semibold ... min-h-[36px]`, label + `ChevronDown`-icoon), maar is nu een
toggle-knop voor een overlay-lijst.

```tsx
interface FilterDropdownExtraAction {
  label: string
  onClick: () => void
}

interface FilterDropdownProps {
  label: string                 // huidige geselecteerde waarde (getoond op de knop)
  options: string[]              // alle keuzes
  onSelect: (value: string) => void
  extraAction?: FilterDropdownExtraAction
  className?: string
}
```

**Gedrag:**

- Klik op de knop → toggelt `open`-state (lokale `useState`).
- Wanneer `open`, toont een `<ul>`-overlay onder de knop (zelfde stijl als
  `InstitutionSelect`'s lijst: `absolute z-20 mt-1 max-h-56 w-full overflow-y-auto
  rounded-xl border border-white/90 bg-white shadow-xl`).
- Elke optie is een `<button>` (`block w-full px-3 py-2 text-left text-sm font-medium
  text-slate-700 hover:bg-accent/10 ...`). De optie die overeenkomt met `label` krijgt een
  visuele markering (bv. `font-semibold text-accent`).
- Klik op een optie → `onSelect(option)` + `setOpen(false)`.
- Indien `extraAction` is meegegeven, wordt die als laatste `<li>` gerenderd, met
  `border-t border-slate-100` en `text-accent font-semibold` (zelfde stijl als
  "Andere…"). Klik → `extraAction.onClick()` + `setOpen(false)`.
- **Klik buiten de dropdown sluit hem**: een `useRef` op de buitenste `<div>` +
  `useEffect` met een `document.addEventListener('mousedown', ...)` die `open` op
  `false` zet als de klik buiten de ref valt. Listener wordt opgeruimd bij unmount /
  wanneer `open` weer `false` wordt.

`Chip.tsx` en `src/__tests__/Chip.test.tsx` worden verwijderd — `Chip` werd alleen in
`TopBar.tsx` gebruikt.

---

## 2. `TopBar.tsx`

**Huidige props** (`schoolYear`, `propertyName`, `schoolYears`, `propertyNames`,
`onSchoolYearChange`, `onPropertyChange`, ...) blijven grotendeels hetzelfde. Wijzigingen:

- De twee `Chip`-instanties worden `FilterDropdown`:
  ```tsx
  {showSchoolYearFilter && (
    <FilterDropdown
      label={schoolYear}
      options={schoolYears}
      onSelect={onSchoolYearChange}
      extraAction={{
        label: `+ Volgend schooljaar toevoegen (${nextSchoolYear(schoolYears[schoolYears.length - 1] ?? schoolYear)})`,
        onClick: onAddSchoolYear,
      }}
      className="flex-1 max-w-[130px]"
    />
  )}
  {showPropertyFilter && (
    <FilterDropdown
      label={propertyName}
      options={propertyNames}
      onSelect={onPropertyChange}
      className="flex-1"
    />
  )}
  ```
- `nextSchoolYear` wordt geïmporteerd uit `../../lib/data`.
- Nieuwe verplichte prop: `onAddSchoolYear: () => void`.
- Als `schoolYears` leeg is (zou niet mogen gebeuren, `SCHOOL_YEARS` heeft altijd minstens
  1 jaar), valt `nextSchoolYear(...)` terug op `schoolYear` zelf via de `?? schoolYear`
  fallback hierboven — puur defensief, geen aparte testcase voor vereist.

---

## 3. `AppShell.tsx`

`AppShell` haalt nu zelf de volledige schooljarenlijst op (basislijst + eigen
toegevoegde jaren) en beheert de "voeg toe"-actie:

```tsx
const [schoolYears, setSchoolYears] = useState<string[]>(schoolYearsProp ?? SCHOOL_YEARS)

useEffect(() => {
  let cancelled = false
  getSchoolYears().then(years => {
    if (!cancelled) setSchoolYears(years)
  })
  return () => { cancelled = true }
}, [])

async function handleAddSchoolYear() {
  const last = schoolYears[schoolYears.length - 1] ?? schoolYear
  const newYear = nextSchoolYear(last)
  const updated = await addSchoolYear(newYear)
  if (updated) {
    setSchoolYears(updated)
  } else {
    // demo-modus: addSchoolYear geeft null terug, voeg lokaal toe zodat de UI bruikbaar blijft
    setSchoolYears(prev => (prev.includes(newYear) ? prev : [...prev, newYear]))
  }
  onSchoolYearChange(newYear)
}
```

- De bestaande `schoolYears`-prop (default `SCHOOL_YEARS`) blijft bestaan als
  **initiële/fallback-waarde** zolang `getSchoolYears()` nog niet is teruggekomen — pagina's
  blijven `schoolYears={SCHOOL_YEARS}` doorgeven zoals nu.
- `handleAddSchoolYear` wordt als `onAddSchoolYear` doorgegeven aan `TopBar`.
- Property-dropdown krijgt geen `extraAction` — `properties`/`propertyId`-logica blijft
  ongewijzigd.

---

## 4. `data.ts` — schooljaren ophalen en toevoegen

Twee nieuwe geëxporteerde functies, naar het patroon van `getLandlordProfile`/
`saveLandlordProfile`:

```ts
export async function getSchoolYears(): Promise<string[]> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { data, error } = await supabase
        .from('school_years')
        .select('label')
        .eq('owner_id', userData.user.id)

      if (!error && data) {
        const custom = data.map(row => row.label as string)
        return mergeSchoolYears(SCHOOL_YEARS, custom)
      }
    }
  }

  return [...SCHOOL_YEARS]
}

export async function addSchoolYear(label: string): Promise<string[] | null> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { error } = await supabase
        .from('school_years')
        .upsert({ owner_id: userData.user.id, label }, { onConflict: 'owner_id,label' })

      if (error) throw error
      return getSchoolYears()
    }
  }

  return null
}
```

**`mergeSchoolYears(base, custom)`** (interne helper, niet geëxporteerd): voegt `base` en
`custom` samen, dedupliceert, en sorteert oplopend op het **startjaar** (eerste 4 cijfers,
numeriek):

```ts
function mergeSchoolYears(base: string[], custom: string[]): string[] {
  const unique = Array.from(new Set([...base, ...custom]))
  return unique.sort((a, b) => {
    const yearA = Number(a.match(/^(\d{4})/)?.[1] ?? 0)
    const yearB = Number(b.match(/^(\d{4})/)?.[1] ?? 0)
    return yearA - yearB
  })
}
```

- **Demo-modus** (`isSupabaseConfigured === false`, of geen ingelogde gebruiker):
  `getSchoolYears()` geeft gewoon `[...SCHOOL_YEARS]`, `addSchoolYear()` geeft `null` —
  `AppShell` vangt dit op met een lokale (niet-persistente) toevoeging, zodat de knop ook
  in de demo iets zichtbaars doet.
- **`onConflict: 'owner_id,label'`** maakt herhaalde klikken op "+ Volgend schooljaar
  toevoegen" idempotent (geen dubbele rijen / geen fout bij dubbele insert).

---

## 5. Database — nieuwe tabel `school_years`

**Nieuwe migratie:** `supabase/migrations/20260612000000_school_years.sql`

```sql
create table school_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);

alter table school_years enable row level security;

create policy "Owners manage their school years"
  on school_years for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

**`supabase/staging-bootstrap.sql`**: zelfde `create table` + RLS-policy toevoegen als
nieuw genummerd item (`-- 14) 20260612000000_school_years`), na item 13
(`landlord_profiles`), zodat een verse staging-DB identiek is aan de live database nadat
de migratie via MCP is toegepast.

---

## 6. Tests

- **`src/__tests__/FilterDropdown.test.tsx`** (nieuw):
  - toont het label op de knop;
  - opent de optielijst bij klik en toont alle `options`;
  - klik op een optie roept `onSelect` aan met die waarde en sluit de lijst;
  - met `extraAction`: toont de extra actie onderaan, klik roept `extraAction.onClick` aan;
  - klik buiten de dropdown sluit de lijst (optielijst niet meer in de DOM/niet zichtbaar).
- **`src/__tests__/data.test.ts`**:
  - `getSchoolYears()` in demo-modus geeft `SCHOOL_YEARS` terug (incl. EN DASH-check);
  - `addSchoolYear(...)` in demo-modus geeft `null` terug.
- **`src/__tests__/DashboardPage.test.tsx`**: de test `'toont lege staat als er geen data
  is voor de selectie'` klikt nu eerst de pand-`FilterDropdown` open en selecteert dan de
  optie `'Kot Guldensporenstraat'` uit de lijst (i.p.v. te vertrouwen op cyclisch gedrag
  van de oude `Chip`).
- **`src/__tests__/Chip.test.tsx`**: verwijderd (component bestaat niet meer).
- Volledige suite (`npm run test:run`) en `npx tsc -b` moeten slagen na implementatie.
