# Huurindexatie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic rent indexation based on the Belgian health index (gezondheidsindex), toggled per property, applied at contract renewal and room price updates.

**Architecture:** A Supabase Edge Function syncs monthly health index values from Statbel's public CSV API into a `health_index` table. The frontend reads these values and calculates indexed rents using the legally mandated formula. The toggle lives on the `properties` table and is exposed in SettingsPage per property.

**Tech Stack:** React 18, TypeScript, Supabase (Edge Functions in Deno, PostgreSQL), Tailwind CSS, Vitest

## Global Constraints

- Node 20+ required for builds
- All data access goes through `src/lib/data.ts` (mock fallback when Supabase absent)
- Edge Functions use Deno with `https://deno.land/std@0.168.0` and `https://esm.sh/@supabase/supabase-js@2`
- Tailwind classes follow glassmorphism pattern (bg-white/45, backdrop-blur-xl, border-white/70)
- Tests use Vitest + Testing Library, mocking `src/lib/data` imports
- Dutch UI copy throughout
- Branch: `staging`

---

### Task 1: Database Migration — health_index table + property/room columns

**Files:**
- Create: `supabase/migrations/20260624000000_health_index_and_indexation.sql`

**Interfaces:**
- Produces: `health_index` table (year int, month int, value decimal, PK(year,month)), `properties.indexation_enabled` boolean column, `rooms.base_rent` decimal column, `rooms.base_rent_year` int column

- [ ] **Step 1: Write the migration SQL**

```sql
-- Health index table (gezondheidsindex basis 2013=100)
CREATE TABLE IF NOT EXISTS health_index (
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  value decimal(8,2) NOT NULL,
  PRIMARY KEY (year, month)
);

-- RLS: authenticated users can read
ALTER TABLE health_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read health_index"
  ON health_index FOR SELECT TO authenticated USING (true);

-- Property indexation toggle
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS indexation_enabled boolean DEFAULT false;

-- Room base rent tracking
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS base_rent decimal(10,2),
  ADD COLUMN IF NOT EXISTS base_rent_year int;

-- Backfill existing rooms: base_rent = current monthly_rent, base_rent_year from created_at
UPDATE rooms
SET base_rent = monthly_rent,
    base_rent_year = EXTRACT(YEAR FROM created_at)::int
WHERE base_rent IS NULL;
```

- [ ] **Step 2: Verify migration applies locally**

Run: `cat supabase/migrations/20260624000000_health_index_and_indexation.sql`
Expected: The file exists with the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260624000000_health_index_and_indexation.sql
git commit -m "feat(db): add health_index table and indexation columns on properties/rooms"
```

---

### Task 2: Edge Function — sync-health-index

**Files:**
- Create: `supabase/functions/sync-health-index/index.ts`

**Interfaces:**
- Consumes: Statbel CSV at `https://bestat.statbel.fgov.be/bestat/api/views/d9a303dc-d393-4686-8fe2-234e03a857b8/result/CSV`
- Produces: Rows upserted into `health_index` table

- [ ] **Step 1: Write the Edge Function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STATBEL_CSV_URL =
  'https://bestat.statbel.fgov.be/bestat/api/views/d9a303dc-d393-4686-8fe2-234e03a857b8/result/CSV'

const MONTH_MAP: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6,
  juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12,
}

function parseMonth(raw: string): { year: number; month: number } | null {
  const cleaned = raw.replace(/"/g, '').trim().toLowerCase()
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (cleaned.startsWith(name)) {
      const yearMatch = cleaned.match(/(\d{4})/)
      if (yearMatch) return { year: Number(yearMatch[1]), month: num }
    }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const response = await fetch(STATBEL_CSV_URL)
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Statbel CSV fetch failed', status: response.status }), { status: 502 })
    }

    const text = await response.text()
    const lines = text.split('\n').slice(1) // skip header

    const rows: Array<{ year: number; month: number; value: number }> = []

    for (const line of lines) {
      if (!line.trim()) continue
      const cols = line.split(',').map(c => c.replace(/"/g, '').trim())
      // Format: Jaar, Maand, Niveau 1, Basisjaar, Consumptieprijsindex
      const basisjaar = cols[3] ?? ''
      const niveau = cols[2] ?? ''

      if (!basisjaar.includes('2013') || !niveau.toLowerCase().includes('gezondheidsindex')) continue

      const parsed = parseMonth(cols[1] ?? '')
      const value = Number(cols[4])
      if (parsed && Number.isFinite(value)) {
        rows.push({ year: parsed.year, month: parsed.month, value })
      }
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows parsed from CSV' }), { status: 422 })
    }

    const { error } = await supabase
      .from('health_index')
      .upsert(rows, { onConflict: 'year,month' })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ synced: rows.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/sync-health-index/index.ts
git commit -m "feat(edge): add sync-health-index Edge Function for Statbel data"
```

---

### Task 3: Data Layer — indexation helpers in data.ts

**Files:**
- Modify: `src/lib/data.ts`
- Modify: `src/types/index.ts` (add `baseRent`/`baseRentYear` to Room, `indexationEnabled` to Property)
- Modify: `src/lib/mockData.ts` (add mock health index data + room fields)
- Create: `src/__tests__/indexation.test.ts`

**Interfaces:**
- Consumes: `health_index` table, `properties.indexation_enabled`, `rooms.base_rent`, `rooms.base_rent_year`
- Produces:
  - `getHealthIndex(year: number, month: number): Promise<number | null>`
  - `calculateIndexedRent(baseRent: number, baseYear: number, targetYear: number): Promise<number>`
  - `getPropertyIndexation(propertyId: string): Promise<boolean>`
  - `savePropertyIndexation(propertyId: string, enabled: boolean): Promise<void>`

- [ ] **Step 1: Update types — add fields to Room and Property**

In `src/types/index.ts`:

```typescript
// Add to Room interface:
  baseRent?: number
  baseRentYear?: number

// Add to Property interface:
  indexationEnabled?: boolean
```

- [ ] **Step 2: Write failing tests**

Create `src/__tests__/indexation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { calculateIndexedRentPure } from '../lib/indexation'

describe('calculateIndexedRentPure', () => {
  it('indexes rent correctly with known values', () => {
    // €500 base, startIndex 107.89, currentIndex 129.42
    const result = calculateIndexedRentPure(500, 107.89, 129.42)
    expect(result).toBeCloseTo(599.81, 1)
  })

  it('returns base rent when indices are equal', () => {
    const result = calculateIndexedRentPure(450, 120.5, 120.5)
    expect(result).toBe(450)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateIndexedRentPure(500, 100, 103.33)
    expect(result).toBe(516.65)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:run -- src/__tests__/indexation.test.ts`
Expected: FAIL — module `../lib/indexation` does not exist

- [ ] **Step 4: Create indexation utility module**

Create `src/lib/indexation.ts`:

```typescript
export function calculateIndexedRentPure(
  baseRent: number,
  startIndex: number,
  currentIndex: number,
): number {
  if (startIndex === currentIndex || startIndex === 0) return baseRent
  return Math.round((baseRent * currentIndex / startIndex) * 100) / 100
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/__tests__/indexation.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Add data layer functions**

Add to `src/lib/data.ts`:

```typescript
import { calculateIndexedRentPure } from './indexation'

// --- Health Index ---

export async function getHealthIndex(year: number, month: number): Promise<number | null> {
  if (!isSupabaseConfigured) {
    const entry = MOCK_HEALTH_INDEX.find(h => h.year === year && h.month === month)
    return entry?.value ?? null
  }

  const { data, error } = await supabase
    .from('health_index')
    .select('value')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (error || !data) return null
  return Number(data.value)
}

export async function calculateIndexedRent(
  baseRent: number,
  baseYear: number,
  targetYear: number,
): Promise<number> {
  const startIndex = await getHealthIndex(baseYear, 8) // augustus
  const currentIndex = await getHealthIndex(targetYear, 8) // augustus
  if (!startIndex || !currentIndex) return baseRent
  return calculateIndexedRentPure(baseRent, startIndex, currentIndex)
}

// --- Property Indexation ---

export async function getPropertyIndexation(propertyId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data, error } = await supabase
    .from('properties')
    .select('indexation_enabled')
    .eq('id', propertyId)
    .maybeSingle()

  if (error || !data) return false
  return data.indexation_enabled === true
}

export async function savePropertyIndexation(propertyId: string, enabled: boolean): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('properties')
    .update({ indexation_enabled: enabled })
    .eq('id', propertyId)

  if (error) throw error
}
```

- [ ] **Step 7: Update RoomRow mapping to include base_rent fields**

In `src/lib/data.ts`, update `RoomRow` interface and `mapRoom`:

```typescript
// Add to RoomRow interface:
  base_rent?: number | string | null
  base_rent_year?: number | null

// In mapRoom function, add:
  baseRent: row.base_rent != null ? asNumber(row.base_rent) : undefined,
  baseRentYear: row.base_rent_year ?? undefined,
```

- [ ] **Step 8: Update PropertyRow mapping to include indexation_enabled**

In `src/lib/data.ts`, update `PropertyRow` interface and the property mapper:

```typescript
// Add to PropertyRow interface:
  indexation_enabled?: boolean | null

// In the property mapping, add:
  indexationEnabled: row.indexation_enabled ?? undefined,
```

- [ ] **Step 9: Add mock health index data**

Add to `src/lib/mockData.ts`:

```typescript
export const MOCK_HEALTH_INDEX = [
  { year: 2020, month: 8, value: 107.89 },
  { year: 2021, month: 8, value: 110.35 },
  { year: 2022, month: 8, value: 119.42 },
  { year: 2023, month: 8, value: 124.15 },
  { year: 2024, month: 8, value: 126.08 },
  { year: 2025, month: 8, value: 129.42 },
  { year: 2026, month: 8, value: 132.10 },
]
```

- [ ] **Step 10: Update createRoomData to persist base_rent fields**

In `src/lib/data.ts`, in `createRoomData`:

```typescript
// Add to the insert object:
  base_rent: input.monthlyRent,
  base_rent_year: new Date().getFullYear(),
```

- [ ] **Step 11: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

- [ ] **Step 12: Commit**

```bash
git add src/types/index.ts src/lib/indexation.ts src/lib/data.ts src/lib/mockData.ts src/__tests__/indexation.test.ts
git commit -m "feat(data): add health index data layer, indexation calculation, and property toggle"
```

---

### Task 4: SettingsPage — Indexation toggle per property

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `getPropertyIndexation(propertyId)`, `savePropertyIndexation(propertyId, enabled)`
- Produces: UI toggle for indexation per property in settings

- [ ] **Step 1: Add indexation state and load it alongside delegation**

In `SettingsPage.tsx`, add state:

```typescript
const [indexationEnabled, setIndexationEnabled] = useState(false)
const [indexationSaving, setIndexationSaving] = useState(false)
```

In the existing `useEffect` that loads per-property settings (the one triggered by `selectedPropertyId`), add `getPropertyIndexation` to the `Promise.all`:

```typescript
const [loaded, loadedDelegation, loadedIndexation] = await Promise.all([
  getInspectionCategories(selectedPropertyId!),
  getPropertyDelegation(selectedPropertyId!),
  getPropertyIndexation(selectedPropertyId!),
])
if (!cancelled) {
  setCategories(loaded)
  setSavedCategories(loaded)
  setDelegationMode(loadedDelegation)
  setIndexationEnabled(loadedIndexation)
}
```

- [ ] **Step 2: Add toggle save handler**

```typescript
async function handleIndexationToggle(enabled: boolean) {
  if (!selectedPropertyId) return
  setIndexationSaving(true)
  try {
    await savePropertyIndexation(selectedPropertyId, enabled)
    setIndexationEnabled(enabled)
  } catch {
    setError('Indexatie-instelling opslaan mislukt.')
  } finally {
    setIndexationSaving(false)
  }
}
```

- [ ] **Step 3: Add UI section in the per-property settings panel**

After the delegation section, add:

```tsx
<div className="mt-6 rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Huurindexatie</h3>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-semibold text-slate-900">Automatische indexatie</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Bij contractverlenging wordt de basishuurprijs automatisch geïndexeerd aan de gezondheidsindex.
      </p>
    </div>
    <button
      type="button"
      disabled={indexationSaving}
      onClick={() => handleIndexationToggle(!indexationEnabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        indexationEnabled ? 'bg-blue-600' : 'bg-slate-200',
        indexationSaving && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
          indexationEnabled ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add import for getPropertyIndexation and savePropertyIndexation**

Update the import at the top of `SettingsPage.tsx`:

```typescript
import { getInspectionCategories, saveInspectionCategories, getProperties, getPropertyDelegation, savePropertyDelegation, getPropertyIndexation, savePropertyIndexation } from '../lib/data'
```

- [ ] **Step 5: Run dev server, verify toggle appears and persists**

Run: `npm run dev`
Navigate to Instellingen, select a property, verify the "Huurindexatie" section appears with a toggle.

- [ ] **Step 6: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat(settings): add indexation toggle per property"
```

---

### Task 5: ContractRenewPage — Auto-fill indexed rent with info tooltip

**Files:**
- Modify: `src/pages/ContractRenewPage.tsx`

**Interfaces:**
- Consumes: `getPropertyIndexation(propertyId)`, `calculateIndexedRent(baseRent, baseYear, targetYear)`, `getHealthIndex(year, month)`, Room `baseRent`/`baseRentYear`
- Produces: Auto-filled indexed rent in the renewal form with "Indexatie toegepast ⓘ" badge

- [ ] **Step 1: Add imports and state for indexation**

```typescript
import { Info } from 'lucide-react'
import { createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, getHealthIndex, getPropertyIndexation, nextSchoolYear } from '../lib/data'
import { calculateIndexedRentPure } from '../lib/indexation'
```

Add state:

```typescript
const [indexationEnabled, setIndexationEnabled] = useState(false)
const [indexationInfo, setIndexationInfo] = useState<{
  baseRent: number
  startIndex: number
  currentIndex: number
  indexedRent: number
} | null>(null)
const [showIndexInfo, setShowIndexInfo] = useState(false)
```

- [ ] **Step 2: Load indexation data in the existing useEffect**

After loading the bundle and rooms, add:

```typescript
if (nextBundle) {
  const indexEnabled = await getPropertyIndexation(nextBundle.property.id)
  if (cancelled) return
  setIndexationEnabled(indexEnabled)

  if (indexEnabled && defaultRoom) {
    const baseRent = defaultRoom.baseRent ?? defaultRoom.monthlyRent
    const baseYear = defaultRoom.baseRentYear ?? 2024
    const targetYear = Number(upcomingSchoolYear.match(/^(\d{4})/)?.[1] ?? 2026)

    const startIndex = await getHealthIndex(baseYear, 8)
    const currentIndex = await getHealthIndex(targetYear, 8)

    if (startIndex && currentIndex && !cancelled) {
      const indexedRent = calculateIndexedRentPure(baseRent, startIndex, currentIndex)
      setIndexationInfo({ baseRent, startIndex, currentIndex, indexedRent })
      setForm(prev => ({ ...prev, monthlyRent: String(indexedRent) }))
    }
  }
}
```

- [ ] **Step 3: Add "Indexatie toegepast ⓘ" badge next to the Huurprijs field**

Replace the existing `MoneyField` for `monthlyRent` with:

```tsx
<div className="relative">
  <MoneyField
    label="Huurprijs"
    value={form.monthlyRent}
    onChange={value => updateField('monthlyRent', value)}
  />
  {indexationInfo && (
    <div className="mt-1 flex items-center gap-1">
      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
        Indexatie toegepast
      </span>
      <button
        type="button"
        onClick={() => setShowIndexInfo(!showIndexInfo)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
      >
        <Info size={10} />
      </button>
    </div>
  )}
  {showIndexInfo && indexationInfo && (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-700">
      <p className="font-semibold">
        €{indexationInfo.baseRent} × ({indexationInfo.currentIndex} / {indexationInfo.startIndex}) = €{indexationInfo.indexedRent}
      </p>
      <p className="mt-1 text-slate-500">
        Aanvangsindex: aug {indexationInfo.startIndex} • Huidige index: aug {indexationInfo.currentIndex}
      </p>
    </div>
  )}
</div>
```

- [ ] **Step 4: Run dev server, verify the renewal page shows indexed price and tooltip**

Run: `npm run dev`
Navigate to a contract, click "Verlengen", verify the indexed price is filled in with the badge.

- [ ] **Step 5: Run test suite**

Run: `npm run test:run`
Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ContractRenewPage.tsx
git commit -m "feat(renew): auto-fill indexed rent with info tooltip when indexation enabled"
```

---

### Task 6: PropertiesPage — Indexation toggle and updated prices

**Files:**
- Modify: `src/pages/PropertiesPage.tsx`

**Interfaces:**
- Consumes: `getPropertyIndexation(propertyId)`, `savePropertyIndexation(propertyId, enabled)`, Property `indexationEnabled`
- Produces: Per-property indexation toggle visible alongside property name

- [ ] **Step 1: Add imports**

```typescript
import { getPropertyIndexation, savePropertyIndexation } from '../lib/data'
```

- [ ] **Step 2: Add indexation state per property**

```typescript
const [indexationStates, setIndexationStates] = useState<Record<string, boolean>>({})
```

Load in the properties loading effect:

```typescript
// After properties are loaded:
const indexStates: Record<string, boolean> = {}
for (const prop of loaded) {
  indexStates[prop.id] = prop.indexationEnabled ?? false
}
setIndexationStates(indexStates)
```

- [ ] **Step 3: Add toggle handler**

```typescript
async function handlePropertyIndexation(propertyId: string, enabled: boolean) {
  setIndexationStates(prev => ({ ...prev, [propertyId]: enabled }))
  try {
    await savePropertyIndexation(propertyId, enabled)
  } catch {
    setIndexationStates(prev => ({ ...prev, [propertyId]: !enabled }))
  }
}
```

- [ ] **Step 4: Add toggle next to property name in the UI**

In the property card header area, add the indexation toggle:

```tsx
<div className="flex items-center gap-2">
  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Indexatie</span>
  <button
    type="button"
    onClick={() => handlePropertyIndexation(property.id, !indexationStates[property.id])}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
      indexationStates[property.id] ? 'bg-blue-600' : 'bg-slate-200',
    )}
  >
    <span
      className={cn(
        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        indexationStates[property.id] ? 'translate-x-4' : 'translate-x-0',
      )}
    />
  </button>
</div>
```

- [ ] **Step 5: Ensure new rooms save base_rent and base_rent_year**

In the room creation handler (`handleSaveRoom` or equivalent), verify that `createRoomData` is called — Task 3 already ensures it persists `base_rent` and `base_rent_year` automatically.

- [ ] **Step 6: Run dev server, verify toggle appears on properties page**

Run: `npm run dev`
Navigate to Panden, verify toggle is visible per property.

- [ ] **Step 7: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PropertiesPage.tsx
git commit -m "feat(properties): add indexation toggle per property"
```

---

### Task 7: Final Integration — push to staging

**Files:** None new

**Interfaces:**
- Consumes: All previous tasks committed
- Produces: All code pushed to `origin/staging`

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass (104+ tests)

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 4: Push to staging**

```bash
git push origin staging
```

- [ ] **Step 5: Deploy Edge Function (manual step — document for user)**

After push, the Edge Function needs deployment:

```bash
npx supabase functions deploy sync-health-index
```

Then invoke it once to seed the health_index table:

```bash
npx supabase functions invoke sync-health-index
```

- [ ] **Step 6: Apply database migration**

```bash
npx supabase db push
```
