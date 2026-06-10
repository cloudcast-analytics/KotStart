# Cluster E (N2) — Aanpasbare plaatsbeschrijvingscategorieën Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `CATEGORIES` constant in `InspectionNewPage.tsx` with a per-landlord, fully editable template (categories + items, 3 item types: condition/count/meter), stored in a new `inspection_templates` Supabase table, manageable from `/settings`, and rendered correctly in the wizard, the inspection detail page, and the PDF documents.

**Architecture:** New shared types (`InspectionTemplateCategory`/`InspectionTemplateItem`/`InspectionItemType`/`InspectionMeterUnit`) in `src/types/index.ts`. A `DEFAULT_INSPECTION_CATEGORIES` constant in `mockData.ts` is the demo-mode template and the seed for new landlords. `data.ts` gets `getInspectionCategories()`/`saveInspectionCategories()` backed by a new `inspection_templates` table (one JSONB row per `owner_id`). `inspection_items` gets two new nullable columns (`meter_value`, `meter_unit`). `InspectionNewPage` loads categories at mount and renders condition/count/meter UI per `item.type`. `SettingsPage` gets a full CRUD editor for the template. `InspectionDetailPage` and `pdfDocuments.ts` get a third display branch for meter values.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + RLS), Vitest + Testing Library.

---

## File Structure

- `src/types/index.ts` — add `InspectionItemType`, `InspectionMeterUnit`, `InspectionTemplateItem`, `InspectionTemplateCategory`; extend `InspectionItem`.
- `src/lib/mockData.ts` — add `DEFAULT_INSPECTION_CATEGORIES`.
- `supabase/migrations/20260610100000_inspection_templates.sql` — new table + RLS + `inspection_items` columns. Applied to staging (`bqlykafglpdumupesdsl`) via Supabase MCP.
- `supabase/staging-bootstrap.sql` — append same DDL for fresh staging DBs.
- `src/lib/data.ts` — `getInspectionCategories`, `saveInspectionCategories`, `InspectionItemRow`/`mapInspectionItem`/`SaveInspectionInput`/`saveInspectionData` meter fields.
- `src/pages/SettingsPage.tsx` — new "Plaatsbeschrijvingscategorieën" editor section.
- `src/pages/InspectionNewPage.tsx` — dynamic categories, meter rendering.
- `src/pages/InspectionDetailPage.tsx` + `src/lib/pdfDocuments.ts` — meter display (3 spots).
- Tests: `src/__tests__/data.test.ts`, `SettingsPage.test.tsx`, `InspectionNewPage.test.tsx`, `InspectionDetailPage.test.tsx`, `pdfDocuments.test.ts`.

---

### Task 1: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1:** Append after `Property` (or anywhere top-level) the new template types and extend `InspectionItem`:

```ts
export type InspectionItemType = 'condition' | 'count' | 'meter'
export type InspectionMeterUnit = 'kWh' | 'm³'

export interface InspectionTemplateItem {
  name: string
  type: InspectionItemType
  unit?: InspectionMeterUnit
}

export interface InspectionTemplateCategory {
  id: string
  label: string
  items: InspectionTemplateItem[]
}
```

`InspectionItem` gets two new optional fields:

```ts
export interface InspectionItem {
  id: string
  inspectionId: string
  category: string
  itemName: string
  condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
  keyCount?: number | null
  meterValue?: number | null
  meterUnit?: InspectionMeterUnit | null
  photoUrl?: string
  notes?: string
}
```

- [ ] **Step 2:** Run `npm run test:run` — expect all current tests still PASS (pure type addition, no behavior change).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add inspection template + meter types"
```

---

### Task 2: DEFAULT_INSPECTION_CATEGORIES

**Files:**
- Modify: `src/lib/mockData.ts`

- [ ] **Step 1:** Import `InspectionTemplateCategory` in the existing type-only import at the top of `mockData.ts`, then add the constant (place it above `MOCK_LANDLORD_PROFILE`):

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

- [ ] **Step 2:** Run `npm run test:run` — expect PASS (unused export is fine, no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(data): add DEFAULT_INSPECTION_CATEGORIES template"
```

---

### Task 3: Database migration (table + RLS + inspection_items columns)

**Files:**
- Create: `supabase/migrations/20260610100000_inspection_templates.sql`
- Modify: `supabase/staging-bootstrap.sql`

- [ ] **Step 1:** Create the migration file:

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

alter table inspection_items
  add column if not exists meter_value numeric,
  add column if not exists meter_unit text;
```

- [ ] **Step 2:** Apply to staging via Supabase MCP (`mcp__supabase__apply_migration`, project `bqlykafglpdumupesdsl`, name `inspection_templates`, the SQL above). Expect `{"success":true}`.

- [ ] **Step 3:** Append the same DDL to `supabase/staging-bootstrap.sql` under a new numbered section (after section 9, "Cluster E — N2: inspection_templates"), so a fresh staging DB stays consistent.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260610100000_inspection_templates.sql supabase/staging-bootstrap.sql
git commit -m "feat(db): add inspection_templates table and inspection_items meter columns"
```

---

### Task 4: Data layer (`src/lib/data.ts`)

**Files:**
- Modify: `src/lib/data.ts`
- Modify: `src/__tests__/data.test.ts`

- [ ] **Step 1:** Add imports: `DEFAULT_INSPECTION_CATEGORIES` from `./mockData`, and `InspectionTemplateCategory` to the type-only import from `../types`.

- [ ] **Step 2:** Extend `InspectionItemRow` (around line 66-75):

```ts
interface InspectionItemRow {
  id: string
  inspection_id: string
  category: string
  item_name: string
  condition: InspectionItem['condition']
  key_count: number | null
  meter_value: number | string | null
  meter_unit: string | null
  photo_url: string | null
  notes: string | null
}
```

- [ ] **Step 3:** Extend `SaveInspectionInput['items']` entries (around line 107-113) with `meterValue: number | null` and `meterUnit: InspectionMeterUnit | null`:

```ts
interface SaveInspectionInput {
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  items: Array<{
    category: string
    itemName: string
    condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
    keyCount: number | null
    meterValue: number | null
    meterUnit: InspectionMeterUnit | null
    photoUrl: string | null
  }>
}
```

(Add `InspectionMeterUnit` to the existing type-only import line.)

- [ ] **Step 4:** Update `mapInspectionItem` (around line 309-320) to map the new fields:

```ts
function mapInspectionItem(row: InspectionItemRow): InspectionItem {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    category: row.category,
    itemName: row.item_name,
    condition: row.condition,
    keyCount: row.key_count ?? undefined,
    meterValue: row.meter_value !== null && row.meter_value !== undefined ? Number(row.meter_value) : undefined,
    meterUnit: (row.meter_unit as InspectionMeterUnit | null) ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
  }
}
```

- [ ] **Step 5:** In `saveInspectionData` (around line 860-869), add the two new columns to the insert payload:

```ts
    const { error: itemError } = await supabase.from('inspection_items').insert(
      itemsWithUploadedPhotos.map(item => ({
        inspection_id: inspectionId,
        category: item.category,
        item_name: item.itemName,
        condition: item.condition,
        key_count: item.keyCount,
        meter_value: item.meterValue,
        meter_unit: item.meterUnit,
        photo_url: item.photoUrl,
      })),
    )
```

- [ ] **Step 6:** Add the two new exported functions, near `getLandlordProfile`/`saveLandlordProfile` (after `saveInspectionData` is fine too):

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

- [ ] **Step 7:** Add tests to `src/__tests__/data.test.ts`:

```ts
import { DEFAULT_INSPECTION_CATEGORIES } from '../lib/mockData'
import { getInspectionCategories, saveInspectionCategories } from '../lib/data'

describe('getInspectionCategories', () => {
  it('geeft DEFAULT_INSPECTION_CATEGORIES terug in demo-modus', async () => {
    const categories = await getInspectionCategories()
    expect(categories).toEqual(DEFAULT_INSPECTION_CATEGORIES)
  })
})

describe('saveInspectionCategories', () => {
  it('doet niets in demo-modus (geen Supabase)', async () => {
    await expect(saveInspectionCategories(DEFAULT_INSPECTION_CATEGORIES)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 8:** Run `npm run test:run` — expect PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(data): add getInspectionCategories/saveInspectionCategories and meter fields"
```

---

### Task 5: SettingsPage categorie-editor

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/__tests__/SettingsPage.test.tsx`

This is the largest task. `SettingsPage` becomes stateful: loads `getInspectionCategories()` on mount, lets the landlord edit categories/items, and saves via `saveInspectionCategories`.

- [ ] **Step 1:** Replace the full contents of `src/pages/SettingsPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { PROPERTIES, SCHOOL_YEARS, DEFAULT_INSPECTION_CATEGORIES } from '../lib/mockData'
import { getInspectionCategories, saveInspectionCategories } from '../lib/data'
import type { InspectionTemplateCategory, InspectionTemplateItem, InspectionItemType, InspectionMeterUnit } from '../types'
import { Check, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react'
import { cn } from '../lib/cn'

const ITEM_TYPE_LABEL: Record<InspectionItemType, string> = {
  condition: 'Conditie',
  count: 'Aantal',
  meter: 'Meterstand',
}

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base || 'categorie'}-${suffix}`
}

function newItem(): InspectionTemplateItem {
  return { name: 'Nieuw item', type: 'condition' }
}

function newCategory(): InspectionTemplateCategory {
  return { id: slugify('nieuwe-categorie'), label: 'Nieuwe categorie', items: [newItem()] }
}

function moveInArray<T>(array: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= array.length) return array
  const copy = [...array]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}

function hasValidationError(categories: InspectionTemplateCategory[]): boolean {
  return categories.some(category =>
    category.label.trim().length === 0 ||
    category.items.some(item => item.name.trim().length === 0 || (item.type === 'meter' && !item.unit)),
  )
}

export default function SettingsPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [categories, setCategories] = useState<InspectionTemplateCategory[]>(DEFAULT_INSPECTION_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const loaded = await getInspectionCategories()
        if (!cancelled) setCategories(loaded)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  function updateCategory(index: number, patch: Partial<InspectionTemplateCategory>) {
    setCategories(previous => previous.map((category, i) => (i === index ? { ...category, ...patch } : category)))
    setSaved(false)
  }

  function updateItem(categoryIndex: number, itemIndex: number, patch: Partial<InspectionTemplateItem>) {
    setCategories(previous => previous.map((category, i) => {
      if (i !== categoryIndex) return category
      return {
        ...category,
        items: category.items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item)),
      }
    }))
    setSaved(false)
  }

  function addCategory() {
    setCategories(previous => [...previous, newCategory()])
    setSaved(false)
  }

  function removeCategory(index: number) {
    setCategories(previous => previous.filter((_, i) => i !== index))
    setSaved(false)
  }

  function moveCategory(index: number, direction: -1 | 1) {
    setCategories(previous => moveInArray(previous, index, direction))
    setSaved(false)
  }

  function addItem(categoryIndex: number) {
    setCategories(previous => previous.map((category, i) => (
      i === categoryIndex ? { ...category, items: [...category.items, newItem()] } : category
    )))
    setSaved(false)
  }

  function removeItem(categoryIndex: number, itemIndex: number) {
    setCategories(previous => previous.map((category, i) => (
      i === categoryIndex ? { ...category, items: category.items.filter((_, j) => j !== itemIndex) } : category
    )))
    setSaved(false)
  }

  function moveItem(categoryIndex: number, itemIndex: number, direction: -1 | 1) {
    setCategories(previous => previous.map((category, i) => (
      i === categoryIndex ? { ...category, items: moveInArray(category.items, itemIndex, direction) } : category
    )))
    setSaved(false)
  }

  function handleItemTypeChange(categoryIndex: number, itemIndex: number, type: InspectionItemType) {
    updateItem(categoryIndex, itemIndex, { type, unit: type === 'meter' ? 'kWh' : undefined })
  }

  function handleResetToDefault() {
    setCategories(DEFAULT_INSPECTION_CATEGORIES)
    setConfirmReset(false)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveInspectionCategories(categories)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan is mislukt')
    } finally {
      setSaving(false)
    }
  }

  const disableSave = loading || saving || hasValidationError(categories)

  return (
    <AppShell
      schoolYear={schoolYear}
      propertyId={propertyId}
      onSchoolYearChange={setSchoolYear}
      onPropertyChange={setPropertyId}
      properties={PROPERTIES}
      schoolYears={SCHOOL_YEARS}
      showSchoolYearFilter={false}
      showPropertyFilter={false}
    >
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Instellingen</h1>
        <p className="mb-6 text-sm text-slate-500">
          App-instellingen komen hier: plaatsbeschrijvingscategorieen, thema en taal.
        </p>

        <section className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Binnenkort
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Verhuurdergegevens staan voortaan bij Account.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plaatsbeschrijving</p>
              <h2 className="text-lg font-bold text-slate-900">Plaatsbeschrijvingscategorieën</h2>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm font-semibold text-slate-500">Categorieën laden...</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {categories.map((category, categoryIndex) => (
                <div key={category.id} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`Categorienaam ${categoryIndex + 1}`}
                      value={category.label}
                      onChange={event => updateCategory(categoryIndex, { label: event.target.value })}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      aria-label={`${category.label} omhoog verplaatsen`}
                      onClick={() => moveCategory(categoryIndex, -1)}
                      disabled={categoryIndex === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${category.label} omlaag verplaatsen`}
                      onClick={() => moveCategory(categoryIndex, 1)}
                      disabled={categoryIndex === categories.length - 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Categorie ${category.label} verwijderen`}
                      onClick={() => removeCategory(categoryIndex)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`Itemnaam ${categoryIndex + 1}-${itemIndex + 1}`}
                          value={item.name}
                          onChange={event => updateItem(categoryIndex, itemIndex, { name: event.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                        />
                        <select
                          aria-label={`Itemtype ${categoryIndex + 1}-${itemIndex + 1}`}
                          value={item.type}
                          onChange={event => handleItemTypeChange(categoryIndex, itemIndex, event.target.value as InspectionItemType)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                        >
                          {(Object.entries(ITEM_TYPE_LABEL) as Array<[InspectionItemType, string]>).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        {item.type === 'meter' && (
                          <select
                            aria-label={`Eenheid ${categoryIndex + 1}-${itemIndex + 1}`}
                            value={item.unit ?? 'kWh'}
                            onChange={event => updateItem(categoryIndex, itemIndex, { unit: event.target.value as InspectionMeterUnit })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
                          >
                            <option value="kWh">kWh</option>
                            <option value="m³">m³</option>
                          </select>
                        )}
                        <button
                          type="button"
                          aria-label={`Item ${item.name || itemIndex + 1} omhoog verplaatsen`}
                          onClick={() => moveItem(categoryIndex, itemIndex, -1)}
                          disabled={itemIndex === 0}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Item ${item.name || itemIndex + 1} omlaag verplaatsen`}
                          onClick={() => moveItem(categoryIndex, itemIndex, 1)}
                          disabled={itemIndex === category.items.length - 1}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Item ${item.name || itemIndex + 1} verwijderen`}
                          onClick={() => removeItem(categoryIndex, itemIndex)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addItem(categoryIndex)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500"
                  >
                    <Plus size={14} />
                    Item toevoegen
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addCategory}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-bold text-slate-500"
              >
                <Plus size={16} />
                Categorie toevoegen
              </button>

              {error && (
                <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {confirmReset ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
                  <div role="dialog" aria-modal="true" aria-labelledby="reset-categories-title" className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-5 shadow-2xl">
                    <h2 id="reset-categories-title" className="text-lg font-bold text-slate-900">Standaardtemplate herstellen?</h2>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      Alle categorieën en items worden vervangen door de standaardlijst. Klik daarna op &quot;Wijzigingen opslaan&quot; om dit te bevestigen.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white"
                      >
                        Ja, herstellen
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700"
                >
                  Reset naar standaard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disableSave}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition',
                    disableSave && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {saved ? <Check size={16} /> : <Save size={16} />}
                  {saved ? 'Opgeslagen!' : 'Wijzigingen opslaan'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2:** Replace `src/__tests__/SettingsPage.test.tsx` contents:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from '../pages/SettingsPage'
import { saveInspectionCategories } from '../lib/data'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    saveInspectionCategories: vi.fn().mockResolvedValue(undefined),
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('toont app-instellingen zonder verhuurderformulier', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Instellingen' })).toBeInTheDocument()
    expect(screen.getByText(/plaatsbeschrijvingscategorieen/i)).toBeInTheDocument()
    expect(screen.getByText(/verhuurdergegevens staan voortaan bij account/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Naam en voornamen')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Plaatsbeschrijvingscategorieën' })).toBeInTheDocument()
    })
  })

  it('laadt de standaardcategorieën met Algemeen en meterstand-items', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Elektriciteitsmeter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Watermeter')).toBeInTheDocument()
  })

  it('voegt een nieuwe categorie toe', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /categorie toevoegen/i }))

    expect(screen.getByDisplayValue('Nieuwe categorie')).toBeInTheDocument()
  })

  it('verwijdert een item uit een categorie', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /item gasmeter verwijderen/i }))

    expect(screen.queryByDisplayValue('Gasmeter')).not.toBeInTheDocument()
  })

  it('zet eenheid standaard op kWh wanneer itemtype naar Meterstand wijzigt', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Verwarming')).toBeInTheDocument()
    })

    const verwarmingRow = screen.getByDisplayValue('Verwarming').closest('div') as HTMLElement
    const typeSelect = verwarmingRow.querySelector('select') as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'meter' } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('kWh', { exact: false })).toBeInTheDocument()
    })
  })

  it('toont reset-bevestiging en herstelt de standaardtemplate', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /item gasmeter verwijderen/i }))
    expect(screen.queryByDisplayValue('Gasmeter')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reset naar standaard/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ja, herstellen/i }))

    expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
  })

  it('roept saveInspectionCategories aan bij Wijzigingen opslaan', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /wijzigingen opslaan/i }))

    await waitFor(() => {
      expect(saveInspectionCategories).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: /opgeslagen/i })).toBeInTheDocument()
  })

  it('schakelt Wijzigingen opslaan uit bij een lege itemnaam', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Verwarming')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Verwarming'), { target: { value: '' } })

    expect(screen.getByRole('button', { name: /wijzigingen opslaan/i })).toBeDisabled()
  })
})
```

- [ ] **Step 3:** Run `npm run test:run` — expect PASS. If `getByDisplayValue('kWh', { exact: false })` is ambiguous (multiple meter items already show kWh/m³ selects), narrow the test by querying within `verwarmingRow` instead — adjust to:

```ts
    const updatedSelect = verwarmingRow.querySelectorAll('select')
    expect(updatedSelect[1]).toHaveValue('kWh')
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/SettingsPage.tsx src/__tests__/SettingsPage.test.tsx
git commit -m "feat(settings): add inspection category template editor"
```

---

### Task 6: InspectionNewPage refactor

**Files:**
- Modify: `src/pages/InspectionNewPage.tsx`
- Modify: `src/__tests__/InspectionNewPage.test.tsx`

- [ ] **Step 1:** Replace the module-level `CATEGORIES`/`InspectionCategory`/`createInitialItems`/`itemKey`/`InspectionItemState` and component logic. Key changes to `src/pages/InspectionNewPage.tsx`:

  1. Remove the local `InspectionCategory` interface and hardcoded `CATEGORIES` constant.
  2. Import `InspectionTemplateCategory`, `InspectionTemplateItem`, `InspectionMeterUnit` from `../types`, `getInspectionCategories` and `saveInspectionData` from `../lib/data`, and `DEFAULT_INSPECTION_CATEGORIES` from `../lib/mockData`.
  3. `InspectionItemState` gets `meterValue: number | null`:

```ts
interface InspectionItemState {
  condition: Condition | null
  keyCount: number | null
  meterValue: number | null
  photoUrl: string | null
}
```

  4. `createInitialItems` and `itemKey` now take `InspectionTemplateCategory[]` and `InspectionTemplateItem`:

```ts
function createInitialItems(categories: InspectionTemplateCategory[]): Record<string, InspectionItemState> {
  return categories.reduce<Record<string, InspectionItemState>>((acc, category) => {
    category.items.forEach(item => {
      acc[itemKey(category.id, item.name)] = { condition: null, keyCount: null, meterValue: null, photoUrl: null }
    })
    return acc
  }, {})
}

function itemKey(categoryId: string, itemName: string) {
  return `${categoryId}:${itemName}`
}
```

  5. Component state: load categories on mount.

```ts
  const [categories, setCategories] = useState<InspectionTemplateCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<Record<string, InspectionItemState>>({})
  const [overviewPhotoUrls, setOverviewPhotoUrls] = useState<string[]>([])
  const [isFinishing, setIsFinishing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      let loaded: InspectionTemplateCategory[]
      try {
        loaded = await getInspectionCategories()
      } catch {
        loaded = DEFAULT_INSPECTION_CATEGORIES
      }
      if (cancelled) return
      setCategories(loaded)
      setItems(createInitialItems(loaded))
      setCategoriesLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])
```

(Add `useEffect` to the React import line: `import { type ChangeEvent, useEffect, useMemo, useState } from 'react'`.)

  6. `isFinalStep`/`currentCategory`/`steps` now derive from `categories`:

```ts
  const isFinalStep = categories.length > 0 && currentIndex === categories.length
  const currentCategory = categories[currentIndex]
  const steps = useMemo(() => [...categories.map(category => category.label), 'Foto'], [categories])
```

  7. `isItemComplete(categoryId, item: InspectionTemplateItem)` switches on `item.type`:

```ts
  function isItemComplete(categoryId: string, item: InspectionTemplateItem) {
    const state = items[itemKey(categoryId, item.name)]
    if (!state) return false
    if (item.type === 'count') return state.keyCount !== null
    if (item.type === 'meter') return state.meterValue !== null
    return state.condition !== null
  }

  function currentCategoryComplete() {
    if (!currentCategory) return false
    return currentCategory.items.every(item => isItemComplete(currentCategory.id, item))
  }
```

  8. `buildInspectionItems` per type:

```ts
  function buildInspectionItems() {
    return categories.flatMap(category =>
      category.items
        .map(item => {
          const state = items[itemKey(category.id, item.name)]
          if (!isItemComplete(category.id, item)) return null
          return {
            category: category.label,
            itemName: item.name,
            condition: item.type === 'condition' ? state.condition : null,
            keyCount: item.type === 'count' ? state.keyCount : null,
            meterValue: item.type === 'meter' ? state.meterValue : null,
            meterUnit: item.type === 'meter' ? (item.unit ?? null) : null,
            photoUrl: state.photoUrl,
          }
        })
        .filter((entry): entry is {
          category: string
          itemName: string
          condition: Condition | null
          keyCount: number | null
          meterValue: number | null
          meterUnit: InspectionMeterUnit | null
          photoUrl: string | null
        } => entry !== null),
    )
  }
```

  9. `canProceed` adds a categories-loaded guard:

```ts
  function canProceed() {
    if (categoriesLoading) return false
    return isFinalStep ? overviewPhotoUrls.length >= 5 : currentCategoryComplete()
  }
```

  10. Render: while `categoriesLoading`, show a loading state instead of the wizard body (mirror the simple loading text used in `InspectionDetailPage`):

```tsx
  if (categoriesLoading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Plaatsbeschrijving laden...</div>
  }
```//Place this check right after the hooks, before the main `return (...)`.

  11. In the per-item render block, replace `item === 'Sleutels'` branching with `item.type`-based branching, and use `item.name` everywhere `item` (string) was previously used. The condition-buttons block becomes the `item.type === 'condition'` branch; the Sleutels stepper becomes the generic `item.type === 'count'` branch (still uses the same +/- UI, label stays "Aantal sleutels ..." only if needed — keep the existing aria-labels generic: `Aantal verminderen`/`Aantal vermeerderen` would break the existing test, so **keep the exact strings** `Aantal sleutels verminderen`/`Aantal sleutels vermeerderen` for backward compatibility with the Sleutels item, by deriving the label from `item.name`):

```tsx
                      {item.type === 'count' ? (
                        <div className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-white/80 bg-white/60 py-2">
                          <button
                            type="button"
                            aria-label={`Aantal ${item.name.toLowerCase()} verminderen`}
                            disabled={(state.keyCount ?? 0) <= 0}
                            onClick={() =>
                              updateItem(currentCategory.id, item.name, { keyCount: Math.max(0, (state.keyCount ?? 0) - 1) })
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/70 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="min-w-[5.5rem] text-center text-sm font-bold text-slate-900">
                            {`${state.keyCount ?? 0} ${(state.keyCount ?? 0) === 1 ? 'stuk' : 'stuks'}`}
                          </span>
                          <button
                            type="button"
                            aria-label={`Aantal ${item.name.toLowerCase()} vermeerderen`}
                            onClick={() => updateItem(currentCategory.id, item.name, { keyCount: (state.keyCount ?? 0) + 1 })}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/70 text-slate-600"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      ) : item.type === 'meter' ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            aria-label={`Meterstand voor ${item.name}`}
                            value={state.meterValue ?? ''}
                            onChange={event => {
                              const raw = event.target.value
                              updateItem(currentCategory.id, item.name, { meterValue: raw === '' ? null : Number(raw) })
                            }}
                            className="w-full rounded-lg border border-white/90 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                          />
                          <span className="shrink-0 text-sm font-bold text-slate-500">{item.unit}</span>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {CONDITION_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateItem(currentCategory.id, item.name, { condition: option.value })}
                              className={cn(
                                'h-9 rounded-full border px-2 text-xs font-bold transition-colors',
                                state.condition === option.value
                                  ? option.activeClass
                                  : 'border-white/80 bg-white/60 text-slate-500 hover:bg-white/80',
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
```

  Note: the existing Sleutels test expects aria-labels `/aantal sleutels vermeerderen/i` / `/aantal sleutels verminderen/i`. Since `item.name.toLowerCase()` for "Sleutels" is `"sleutels"`, `Aantal sleutels vermeerderen` matches exactly — no test changes needed for those labels.

  12. Update the rest of the JSX: `currentCategory.items.map(item => { const key = itemKey(currentCategory.id, item.name) ...` and the photo-needed check `state.condition === 'bad' || state.condition === 'unusable'` stays the same (only meaningful for `condition`-type items, which is correct — meter/count items never set `condition`). Update `<p className="text-sm font-bold text-slate-900">{item}</p>` to `{item.name}`, and the `Foto toevoegen voor ${item}` aria-label to `${item.name}`.

  13. `updateItem` signature stays `(categoryId: string, itemName: string, patch: Partial<InspectionItemState>)` — unchanged except callers now pass `item.name`.

- [ ] **Step 2:** Run `npm run test:run -- InspectionNewPage` — expect existing tests to PASS unchanged (the demo-mode `getInspectionCategories()` returns `DEFAULT_INSPECTION_CATEGORIES`, which has the same 5 categories/items as before, plus the new Gasmeter/Watermeter-as-meter items in "Algemeen"). **Important:** the existing test `'gaat naar de laatste stap na alle categorieen'` and similar use `category.itemCount: 4` for "Algemeen" with `rateAllExceptSleutels` (clicks all "Goed" buttons) + `setSleutelsCount`. With the new template, "Algemeen" has 6 items: Verwarming (condition), Elektriciteitsmeter/Gasmeter/Watermeter (meter), Rookmelder (condition), Sleutels (count). `rateAllExceptSleutels(4)` will fail because only 2 "Goed" buttons exist (Verwarming, Rookmelder), not 4, and the meter inputs are never filled, so `canProceed()` stays false. These tests MUST be updated — see Step 3.

- [ ] **Step 3:** Update `src/__tests__/InspectionNewPage.test.tsx`:

  - Add a helper to fill meter inputs:

```ts
async function fillMeterValues(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    const input = await screen.findByLabelText(new RegExp(`meterstand voor ${label}`, 'i'))
    fireEvent.change(input, { target: { value } })
  }
}
```

  - For every test that iterates `categories` and special-cases `'Algemeen'`, change the "Algemeen" handling from `rateAllExceptSleutels(category.itemCount)` (with `itemCount: 4`) to:

```ts
      if (category.title === 'Algemeen') {
        await waitFor(() => {
          expect(screen.getAllByRole('button', { name: 'Goed' })).toHaveLength(2)
        })
        screen.getAllByRole('button', { name: 'Goed' }).forEach(button => fireEvent.click(button))
        await fillMeterValues({ Elektriciteitsmeter: '1234', Gasmeter: '56', Watermeter: '78' })
        await setSleutelsCount(2) // or 1, matching the original per-test count
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
```

  This applies to: `'gaat naar de laatste stap na alle categorieen'`, `'toont geen PDF voorbeeld knop op de laatste stap'`, `'laat een toegevoegde overzichtsfoto verwijderen'`, `'toont een foutmelding wanneer opslaan van de plaatsbeschrijving mislukt'` (keep each test's original `setSleutelsCount` argument: 2, 2, 1, 1 respectively).

  - The test `'toont een aantal-stepper voor Sleutels i.p.v. conditieknoppen'` iterates only `['Keuken', 'Badkamer', 'Kamer', 'Inkom']` then checks "Algemeen" — no `itemCount`-based loop for Algemeen, so it needs no change beyond what's already there (it doesn't call `rateAllExceptSleutels`).

  - Add a new test verifying meter rendering:

```ts
  it('toont een meterstand-invoerveld met eenheid voor Elektriciteitsmeter en Gasmeter', async () => {
    renderPage()

    const categories = ['Keuken', 'Badkamer', 'Kamer', 'Inkom']
    for (const title of categories) {
      await screen.findByRole('heading', { name: title })
      await selectAllGoodInCurrentCategory(title === 'Inkom' ? 5 : 7)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    await screen.findByRole('heading', { name: 'Algemeen' })
    expect(screen.getByLabelText(/meterstand voor elektriciteitsmeter/i)).toBeInTheDocument()
    expect(screen.getByText('kWh')).toBeInTheDocument()
    expect(screen.getByLabelText(/meterstand voor gasmeter/i)).toBeInTheDocument()
    expect(screen.getAllByText('m³').length).toBeGreaterThanOrEqual(1)
  })
```

- [ ] **Step 4:** Run `npm run test:run` — expect PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/InspectionNewPage.tsx src/__tests__/InspectionNewPage.test.tsx
git commit -m "feat(inspection): load categories dynamically and support meter items"
```

---

### Task 7: InspectionDetailPage + pdfDocuments meter display

**Files:**
- Modify: `src/pages/InspectionDetailPage.tsx`
- Modify: `src/lib/pdfDocuments.ts`
- Modify: `src/__tests__/InspectionDetailPage.test.tsx`
- Modify: `src/__tests__/pdfDocuments.test.ts`

- [ ] **Step 1:** In `src/pages/InspectionDetailPage.tsx`, update `itemBadge` (lines 25-33) to add a meter branch first:

```ts
function itemBadge(item: InspectionItem): { label: string; colorClass: string } {
  if (item.meterValue != null) {
    return { label: `${item.meterValue} ${item.meterUnit ?? ''}`.trim(), colorClass: 'bg-blue-100 text-blue-700' }
  }

  if (item.itemName === 'Sleutels') {
    const count = item.keyCount ?? 0
    return { label: `${count} ${count === 1 ? 'stuk' : 'stuks'}`, colorClass: 'bg-slate-100 text-slate-700' }
  }

  const condition = item.condition ?? 'good'
  return { label: CONDITION_LABEL[condition], colorClass: CONDITION_COLOR[condition] }
}
```

- [ ] **Step 2:** Update `printInspection` (lines 35-49) to pass meter fields through to `printInspectionDocument`:

```ts
function printInspection(inspection: Inspection, items: InspectionItem[], title: string) {
  printInspectionDocument({
    title,
    type: inspection.type,
    createdAt: inspection.createdAt,
    overviewPhotoUrls: inspection.overviewPhotoUrls,
    items: items.map(item => ({
      category: item.category,
      itemName: item.itemName,
      condition: item.condition,
      keyCount: item.keyCount ?? null,
      meterValue: item.meterValue ?? null,
      meterUnit: item.meterUnit ?? null,
      photoUrl: item.photoUrl ?? null,
    })),
  })
}
```

- [ ] **Step 3:** In `src/lib/pdfDocuments.ts`:
  - Add `InspectionMeterUnit` to the type-only import from `../types`.
  - Extend `InspectionDocumentItem` (lines 18-24):

```ts
export interface InspectionDocumentItem {
  category: string
  itemName: string
  condition: string | null
  keyCount: number | null
  meterValue: number | null
  meterUnit: InspectionMeterUnit | null
  photoUrl: string | null
}
```

  - Update `inspectionValueLabel` (lines 41-48) to check meter first:

```ts
function inspectionValueLabel(
  itemName: string,
  condition: string | null,
  keyCount: number | null | undefined,
  meterValue?: number | null,
  meterUnit?: string | null,
): string {
  if (meterValue != null) {
    return `${meterValue} ${meterUnit ?? ''}`.trim()
  }

  if (itemName === 'Sleutels') {
    const count = keyCount ?? 0
    return `${count} ${count === 1 ? 'stuk' : 'stuks'}`
  }

  return condition ? (CONDITION_LABEL[condition] ?? condition) : ''
}
```

  - Update the call site in `generateInspectionHtml` (around line 502):

```ts
                  <span>${escapeHtml(inspectionValueLabel(item.itemName, item.condition, item.keyCount, item.meterValue, item.meterUnit))}</span>
```

  - The contract-PDF path (`generateContractHtml`) does NOT render inspection items inline (per existing tests/spec: "geen inline onderdeel"), so no change needed there — confirms spec section 6 point 3 is a no-op for this codebase (the contract PDF never showed an inspection table to begin with). Note this in the commit message.

- [ ] **Step 4:** Add tests to `src/__tests__/InspectionDetailPage.test.tsx`. The mock data (`MOCK_INSPECTION_ITEMS` in `mockData.ts`) has no meter items, so add one for inspection `i1` directly in `mockData.ts`... **do not** modify `mockData.ts` for this — instead add a focused unit test for `itemBadge`-equivalent behavior via a new mock inspection. Simplest: add a new entry to `MOCK_INSPECTION_ITEMS` in `src/lib/mockData.ts`:

```ts
export const MOCK_INSPECTION_ITEMS: InspectionItem[] = [
  { id: 'ii1', inspectionId: 'i1', category: 'Kamer', itemName: 'Vloer', condition: 'good', photoUrl: undefined },
  { id: 'ii2', inspectionId: 'i1', category: 'Kamer', itemName: 'Muren', condition: 'moderate', photoUrl: undefined },
  { id: 'ii3', inspectionId: 'i1', category: 'Badkamer', itemName: 'Douche', condition: 'good', photoUrl: undefined },
  { id: 'ii4', inspectionId: 'i1', category: 'Badkamer', itemName: 'Toilet & toiletbril', condition: 'good', photoUrl: undefined },
  { id: 'ii5', inspectionId: 'i1', category: 'Algemeen', itemName: 'Sleutels', condition: null, keyCount: 3, photoUrl: undefined },
  { id: 'ii6', inspectionId: 'i1', category: 'Algemeen', itemName: 'Elektriciteitsmeter', condition: null, meterValue: 1234, meterUnit: 'kWh', photoUrl: undefined },
]
```

  Then add a test in `InspectionDetailPage.test.tsx`:

```ts
  it('toont meterstand met eenheid voor meter-items', async () => {
    renderPage()

    expect(await screen.findByText('Elektriciteitsmeter')).toBeInTheDocument()
    expect(screen.getByText('1234 kWh')).toBeInTheDocument()
  })
```

  Existing test `'toont conditiechips voor elk item'` expects `findAllByText('Goed')` to have length 3 — adding `ii6` (a meter item, not "good") doesn't change that count, so it stays valid.

- [ ] **Step 5:** Add a test to `src/__tests__/pdfDocuments.test.ts`:

```ts
  it('toont meterstand met eenheid in plaats van conditie of stuks', () => {
    const html = generateInspectionHtml({
      title: 'Startplaatsbeschrijving',
      type: 'start',
      createdAt: '2025-09-15T10:00:00.000Z',
      overviewPhotoUrls: [],
      items: [
        {
          category: 'Algemeen',
          itemName: 'Elektriciteitsmeter',
          condition: null,
          keyCount: null,
          meterValue: 1234,
          meterUnit: 'kWh',
          photoUrl: null,
        },
      ],
    })

    expect(html).toContain('Elektriciteitsmeter')
    expect(html).toContain('1234 kWh')
  })
```

  Existing `InspectionDocumentItem` literals in `pdfDocuments.test.ts` (the `'maakt een apart plaatsbeschrijvingsdocument met sleutelaantal'` test) and in `InspectionDetailPage.tsx`'s `printInspection` now require `meterValue`/`meterUnit` fields per the updated `InspectionDocumentItem` interface — add `meterValue: null, meterUnit: null` to that existing test's item literal.

- [ ] **Step 6:** Run `npm run test:run` — expect PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/InspectionDetailPage.tsx src/lib/pdfDocuments.ts src/lib/mockData.ts src/__tests__/InspectionDetailPage.test.tsx src/__tests__/pdfDocuments.test.ts
git commit -m "feat(inspection): display meter readings in detail page and PDF"
```

---

### Task 8: Final verification

- [ ] **Step 1:** Run the full suite: `npm run test:run` — expect all tests (104 + new ones) PASS.
- [ ] **Step 2:** Run `npm run build` to confirm the TypeScript build is clean (new types/fields must not break `tsc`).
- [ ] **Step 3:** Quick manual sanity check is not required (no dev server requirement for this backend/data-layer-heavy feature), but if time allows, start `npm run dev` and visually confirm `/settings` renders the editor and `/inspections/new` shows the meter inputs in "Algemeen".

---

## Self-Review Notes

- **Spec coverage:** Datamodel (Task 1+3), default template (Task 2), data-layer (Task 4), Settings editor (Task 5), wizard (Task 6), detail/PDF (Task 7) — all spec sections 1-8 covered. Per-property template assignment explicitly out of scope (spec section "Open punt").
- **Type consistency:** `InspectionTemplateItem.unit` is `InspectionMeterUnit | undefined`; `InspectionItem.meterUnit` is `InspectionMeterUnit | null | undefined` (DB returns `null`, template item `unit` is `undefined` when absent) — both are handled with `??`/`!= null` checks consistently across `data.ts`, `InspectionNewPage.tsx`, `InspectionDetailPage.tsx`, `pdfDocuments.ts`.
- **Existing test impact:** `InspectionNewPage.test.tsx` requires updates to the "Algemeen" handling in 4 tests due to the new item count/types (documented in Task 6 Step 3). `pdfDocuments.test.ts` requires `meterValue`/`meterUnit: null` added to one existing item literal due to the `InspectionDocumentItem` interface extension (Task 7 Step 5).
