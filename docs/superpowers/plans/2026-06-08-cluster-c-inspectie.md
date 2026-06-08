# Cluster C — Inspectie/Plaatsbeschrijving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the "Sleutels" inspection item from a condition rating to a key count, and
raise the overzichtsfoto requirement from exactly 1 photo to a 5-8 photo gallery.

**Architecture:** Both changes ripple through the same five layers in the same order: DB
schema → domain types → data layer (`data.ts` + `mockData.ts`) → wizard input
(`InspectionNewPage.tsx`) → read-side rendering (`InspectionDetailPage.tsx` +
`pdfDocuments.ts`). Each task below makes one layer consistent before moving to the next,
so the app keeps compiling at every commit.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (Postgres + Storage), Vitest +
Testing Library.

---

## Important note on the approved spec

While reading the code for this plan, one detail in
`docs/superpowers/specs/2026-06-08-cluster-c-inspectie-design.md` turned out to be
slightly off: `generateContractHtml` (the contract PDF) does **not** render the overview
photo(s) anywhere — it only reads `inspection.type` for the bijlage title. The
`inspectionTableRows` table in that same function **does** render `condition`/`Sleutels`
labels, so that part of the spec stands. Net effect: Task 8 below touches the
`inspectionTableRows` labels but does **not** add gallery rendering to the contract PDF —
there is nothing to render there.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260608140000_inspection_keycount_overview_photos.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Cluster C: sleutels als aantal i.p.v. conditie, en 5-8 overzichtsfoto's i.p.v. 1.
alter table inspection_items
  add column key_count integer check (key_count >= 0);

alter table inspections
  add column overview_photo_urls text[];

update inspections
  set overview_photo_urls = array[overview_photo_url]
  where overview_photo_url is not null;

alter table inspections
  drop column overview_photo_url;
```

- [ ] **Step 2: Apply the migration to the linked Supabase project**

Run via the `mcp__supabase__apply_migration` tool (name: `inspection_keycount_overview_photos`,
query: the SQL above), or paste it into the Supabase SQL editor if MCP is unavailable.
Verify with `mcp__supabase__list_tables` (schema `public`) that `inspection_items` now has
a `key_count` column and `inspections` has `overview_photo_urls` (array) but no longer
`overview_photo_url`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260608140000_inspection_keycount_overview_photos.sql
git commit -m "feat(db): add key_count to inspection_items and overview_photo_urls array to inspections"
```

---

### Task 2: Update domain types

**Files:**
- Modify: `src/types/index.ts:66-82`

- [ ] **Step 1: Change `Inspection.overviewPhotoUrl` to `overviewPhotoUrls` and widen `InspectionItem.condition`**

Replace lines 66-82:

```ts
export interface Inspection {
  id: string
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  createdAt: string
}

export interface InspectionItem {
  id: string
  inspectionId: string
  category: string
  itemName: string
  condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
  keyCount?: number | null
  photoUrl?: string
  notes?: string
}
```

(Only `overviewPhotoUrl?: string` → `overviewPhotoUrls: string[]` and
`condition: 'good' | 'moderate' | 'bad' | 'unusable'` → `condition: ... | null` plus the new
`keyCount?: number | null` field actually change; everything else stays identical.)

- [ ] **Step 2: Confirm the project still typechecks where it's expected to fail**

Run: `npx tsc -b --noEmit`
Expected: errors in `src/lib/data.ts`, `src/lib/mockData.ts`, `src/lib/pdfDocuments.ts`,
`src/pages/InspectionNewPage.tsx`, `src/pages/InspectionDetailPage.tsx` — these are the
files Tasks 3, 4, 5, 6 and 7 fix. No errors anywhere else should appear; if they do, the
type edit touched something unintended.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): model inspection overview photos as array and key count on InspectionItem"
```

---

### Task 3: Update the data layer (`data.ts`)

**Files:**
- Modify: `src/lib/data.ts:55-71` (row interfaces)
- Modify: `src/lib/data.ts:99-109` (`SaveInspectionInput`)
- Modify: `src/lib/data.ts:183-196` (storage URL resolution — add array helper)
- Modify: `src/lib/data.ts:268-302` (mappers)
- Modify: `src/lib/data.ts:746-785` (`saveInspectionData`)

- [ ] **Step 1: Update `InspectionRow` and `InspectionItemRow`**

In `InspectionRow` (line 59), replace:

```ts
  overview_photo_url: string | null
```

with:

```ts
  overview_photo_urls: string[] | null
```

In `InspectionItemRow` (lines 63-71), add a field after `condition`:

```ts
interface InspectionItemRow {
  id: string
  inspection_id: string
  category: string
  item_name: string
  condition: InspectionItem['condition']
  key_count: number | null
  photo_url: string | null
  notes: string | null
}
```

- [ ] **Step 2: Add a `resolveStorageUrls` helper next to `resolveStorageUrl`**

Insert after the closing brace of `resolveStorageUrl` (after line 196):

```ts
async function resolveStorageUrls(values: string[] | null | undefined): Promise<string[]> {
  if (!values || values.length === 0) return []

  const resolved = await Promise.all(values.map(value => resolveStorageUrl(value)))
  return resolved.filter((url): url is string => url !== undefined)
}
```

- [ ] **Step 3: Update `mapInspection` / `mapInspectionWithAssets` / `mapInspectionItem`**

Replace lines 268-295:

```ts
function mapInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    contractId: row.contract_id,
    type: row.type,
    overviewPhotoUrls: row.overview_photo_urls ?? [],
    createdAt: row.created_at,
  }
}

async function mapInspectionWithAssets(row: InspectionRow): Promise<Inspection> {
  return {
    ...mapInspection(row),
    overviewPhotoUrls: await resolveStorageUrls(row.overview_photo_urls),
  }
}

function mapInspectionItem(row: InspectionItemRow): InspectionItem {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    category: row.category,
    itemName: row.item_name,
    condition: row.condition,
    keyCount: row.key_count ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
  }
}
```

(`mapInspectionItemWithAssets` directly below stays unchanged — it only resolves `photoUrl`.)

- [ ] **Step 4: Update `SaveInspectionInput`**

Replace lines 99-109:

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
    photoUrl: string | null
  }>
}
```

- [ ] **Step 5: Update `saveInspectionData`**

Replace lines 746-785 (the whole function body) with:

```ts
export async function saveInspectionData(input: SaveInspectionInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const overviewPhotoUrls = (
    await Promise.all(input.overviewPhotoUrls.map(url => uploadDataUrl('inspection-photos', 'overview', url)))
  ).filter((url): url is string => url !== null)

  const itemsWithUploadedPhotos = await Promise.all(
    input.items.map(async item => ({
      ...item,
      photoUrl: await uploadDataUrl('inspection-photos', 'items', item.photoUrl),
    })),
  )

  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .insert({
      contract_id: input.contractId,
      type: input.type,
      overview_photo_urls: overviewPhotoUrls,
    })
    .select()
    .single()

  if (inspectionError) throw inspectionError
  const inspectionId = (inspection as { id: string }).id

  if (itemsWithUploadedPhotos.length > 0) {
    const { error: itemError } = await supabase.from('inspection_items').insert(
      itemsWithUploadedPhotos.map(item => ({
        inspection_id: inspectionId,
        category: item.category,
        item_name: item.itemName,
        condition: item.condition,
        key_count: item.keyCount,
        photo_url: item.photoUrl,
      })),
    )

    if (itemError) throw itemError
  }

  return inspectionId
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: remaining errors only in `mockData.ts`, `pdfDocuments.ts`, `InspectionNewPage.tsx`,
`InspectionDetailPage.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat(data): persist inspection overview photo arrays and key counts"
```

---

### Task 4: Update mock data

**Files:**
- Modify: `src/lib/mockData.ts:75-97`

- [ ] **Step 1: Update `MOCK_INSPECTIONS` and `MOCK_INSPECTION_ITEMS`**

Replace lines 75-97:

```ts
export const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'i1',
    contractId: 'c1',
    type: 'start',
    overviewPhotoUrls: [],
    createdAt: '2025-09-15T10:00:00.000Z',
  },
  {
    id: 'i2',
    contractId: 'c4',
    type: 'start',
    overviewPhotoUrls: [],
    createdAt: '2025-09-16T10:00:00.000Z',
  },
]

export const MOCK_INSPECTION_ITEMS: InspectionItem[] = [
  { id: 'ii1', inspectionId: 'i1', category: 'Kamer', itemName: 'Vloer', condition: 'good', photoUrl: undefined },
  { id: 'ii2', inspectionId: 'i1', category: 'Kamer', itemName: 'Muren', condition: 'moderate', photoUrl: undefined },
  { id: 'ii3', inspectionId: 'i1', category: 'Badkamer', itemName: 'Douche', condition: 'good', photoUrl: undefined },
  { id: 'ii4', inspectionId: 'i1', category: 'Badkamer', itemName: 'Toilet & toiletbril', condition: 'good', photoUrl: undefined },
  { id: 'ii5', inspectionId: 'i1', category: 'Algemeen', itemName: 'Sleutels', condition: null, keyCount: 3, photoUrl: undefined },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: remaining errors only in `pdfDocuments.ts`, `InspectionNewPage.tsx`,
`InspectionDetailPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mockData.ts
git commit -m "feat(mock): add Sleutels key-count item and switch overview photos to array"
```

---

### Task 5: Update `InspectionDetailPage.tsx` (read-side rendering)

**Files:**
- Modify: `src/pages/InspectionDetailPage.tsx:9-21` (label/colour maps)
- Modify: `src/pages/InspectionDetailPage.tsx:123-129` (overview photo)
- Modify: `src/pages/InspectionDetailPage.tsx:136-152` (item badge)
- Test: `src/__tests__/InspectionDetailPage.test.tsx:35-40`

- [ ] **Step 1: Extend the detail-page test for the new "stuks" badge and photo gallery**

Replace the test at lines 35-40:

```tsx
  it('toont conditiechips voor elk item', async () => {
    renderPage()

    expect(await screen.findAllByText('Goed')).toHaveLength(3)
    expect(screen.getByText('Matig')).toBeInTheDocument()
  })

  it('toont het aantal sleutels i.p.v. een conditiechip voor het Sleutels-item', async () => {
    renderPage()

    expect(await screen.findByText('Sleutels')).toBeInTheDocument()
    expect(screen.getByText('3 stuks')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx vitest run src/__tests__/InspectionDetailPage.test.tsx -t "aantal sleutels"`
Expected: FAIL — `screen.getByText('3 stuks')` not found (the page still renders a
condition badge using `item.condition`, which is `null` for the Sleutels mock item).

- [ ] **Step 3: Replace the condition label/colour maps and add an item-badge helper**

Replace lines 9-21:

```tsx
type Condition = NonNullable<InspectionItem['condition']>

const CONDITION_LABEL: Record<Condition, string> = {
  good: 'Goed',
  moderate: 'Matig',
  bad: 'Slecht',
  unusable: 'Onbruikbaar',
}

const CONDITION_COLOR: Record<Condition, string> = {
  good: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  bad: 'bg-orange-100 text-orange-700',
  unusable: 'bg-red-100 text-red-700',
}

function itemBadge(item: InspectionItem): { label: string; colorClass: string } {
  if (item.itemName === 'Sleutels') {
    const count = item.keyCount ?? 0
    return { label: `${count} ${count === 1 ? 'stuk' : 'stuks'}`, colorClass: 'bg-slate-100 text-slate-700' }
  }

  const condition = item.condition ?? 'good'
  return { label: CONDITION_LABEL[condition], colorClass: CONDITION_COLOR[condition] }
}
```

- [ ] **Step 4: Render the gallery for `overviewPhotoUrls` and use `itemBadge` per item**

Replace the single overview `<img>` at lines 123-129 with a gallery grid:

```tsx
            {inspection.overviewPhotoUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {inspection.overviewPhotoUrls.map((url, index) => (
                  <img
                    key={url}
                    src={url}
                    alt={`Overzichtsfoto ${index + 1}`}
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
```

Replace the item-rendering block at lines 136-152 to compute the badge once per item:

```tsx
                {categoryItems.map(item => {
                  const badge = itemBadge(item)
                  return (
                    <div key={item.id} className="rounded-xl border border-slate-100/70 bg-white/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{item.itemName}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', badge.colorClass)}>
                          {badge.label}
                        </span>
                      </div>
                      {item.photoUrl && (
                        <img
                          src={item.photoUrl}
                          alt={item.itemName}
                          className="mt-2 h-32 w-full rounded-lg object-cover"
                        />
                      )}
                    </div>
                  )
                })}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/InspectionDetailPage.test.tsx`
Expected: PASS — all 7 tests green, including the new "aantal sleutels" test.

- [ ] **Step 6: Commit**

```bash
git add src/pages/InspectionDetailPage.tsx src/__tests__/InspectionDetailPage.test.tsx
git commit -m "feat(inspection-detail): show key count badge for Sleutels and overview photo gallery"
```

---

### Task 6: Update `pdfDocuments.ts`

**Files:**
- Modify: `src/lib/pdfDocuments.ts:18-37` (document item/data types + label map)
- Modify: `src/lib/pdfDocuments.ts:154-172` (`inspectionTableRows` in `generateContractHtml`)
- Modify: `src/lib/pdfDocuments.ts:531-572` (`printInspectionDocument`)
- Test: `src/__tests__/pdfDocuments.test.ts:94-126`

- [ ] **Step 1: Update the existing inspection test fixture for the new `overviewPhotoUrls` shape**

In the test at lines 94-126, change line 101 from:

```ts
        overviewPhotoUrl: undefined,
```

to:

```ts
        overviewPhotoUrls: [],
```

This keeps the existing assertions (`toContain('Goed')`, `toContain('Matig')`) intact —
they exercise the `inspectionTableRows` condition-label path, which is untouched for
non-Sleutels items.

- [ ] **Step 2: Add a test asserting the "stuks" label for Sleutels in the contract PDF table**

Add a new test directly after the one ending at line 126:

```ts
  it('toont het aantal sleutels i.p.v. een conditielabel in de plaatsbeschrijvingstabel', () => {
    const bundleWithKeys = {
      ...mockBundle,
      inspection: {
        id: 'i1',
        contractId: 'c1',
        type: 'start' as const,
        overviewPhotoUrls: [],
        createdAt: '2025-09-23',
      },
      inspectionItems: [
        {
          id: 'ii1',
          inspectionId: 'i1',
          category: 'Algemeen',
          itemName: 'Sleutels',
          condition: null,
          keyCount: 2,
          photoUrl: undefined,
        },
      ],
    }
    const html = generateContractHtml(bundleWithKeys)
    expect(html).toContain('2 stuks')
  })
```

- [ ] **Step 3: Run the new test to verify it fails**

Run: `npx vitest run src/__tests__/pdfDocuments.test.ts -t "aantal sleutels"`
Expected: FAIL — the table still looks up `CONDITION_LABEL[found.condition]`, which is
`undefined` for `condition: null`, so `'2 stuks'` never appears.

- [ ] **Step 4: Add a shared value-label helper and widen the document item type**

Replace lines 18-37:

```ts
interface InspectionDocumentItem {
  category: string
  itemName: string
  condition: string | null
  keyCount: number | null
  photoUrl: string | null
}

interface InspectionDocumentData {
  title: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  items: InspectionDocumentItem[]
}

const CONDITION_LABEL: Record<string, string> = {
  good: 'Goed',
  moderate: 'Matig',
  bad: 'Slecht',
  unusable: 'Onbruikbaar',
}

function inspectionValueLabel(itemName: string, condition: string | null, keyCount: number | null | undefined): string {
  if (itemName === 'Sleutels') {
    const count = keyCount ?? 0
    return `${count} ${count === 1 ? 'stuk' : 'stuks'}`
  }

  return condition ? (CONDITION_LABEL[condition] ?? condition) : ''
}
```

- [ ] **Step 5: Use the helper in `inspectionTableRows`**

Replace lines 160-161 (inside `generateContractHtml`'s `inspectionTableRows`):

```ts
          const found = inspectionLookup.get(`${defaultItem.category}|${defaultItem.itemName}`)
          const valueLabel = found ? inspectionValueLabel(found.itemName, found.condition, found.keyCount) : ''
```

and update the corresponding `<td>` (was using `conditionLabel`) at line 165 to reference
`valueLabel` instead:

```ts
            <td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${escapeHtml(valueLabel)}</td>
```

- [ ] **Step 6: Use the helper and render a gallery in `printInspectionDocument`**

Replace the function body at lines 531-572:

```ts
export function printInspectionDocument({ title, type, overviewPhotoUrls, items }: InspectionDocumentData) {
  const grouped = items.reduce<Record<string, InspectionDocumentItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  const overviewGallery = overviewPhotoUrls.length
    ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0;">
        ${overviewPhotoUrls
          .map(url => `<img style="width:100%;height:160px;object-fit:cover;border-radius:6px;" src="${url}" alt="Overzichtsfoto" />`)
          .join('')}
      </div>`
    : ''

  const body = `
    <main style="font-family:Arial,sans-serif;font-size:10pt;color:#000;margin:2cm;">
      <h1 style="font-size:15pt;">${escapeHtml(title)}</h1>
      <p style="color:#444;">${type === 'start' ? 'Startplaatsbeschrijving' : 'Eindplaatsbeschrijving'} — ${new Date().toLocaleDateString('nl-BE')}</p>

      ${overviewGallery}

      ${Object.entries(grouped)
        .map(
          ([category, categoryItems]) => `
          <h2 style="font-size:11pt;margin:20px 0 6px;">${escapeHtml(category)}</h2>
          ${categoryItems
            .map(
              item => `
              <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;">
                  <span style="font-weight:bold;">${escapeHtml(item.itemName)}</span>
                  <span>${escapeHtml(inspectionValueLabel(item.itemName, item.condition, item.keyCount))}</span>
                </div>
                ${item.photoUrl ? `<img style="width:100%;max-height:220px;object-fit:cover;margin-top:8px;border-radius:6px;" src="${item.photoUrl}" alt="${escapeHtml(item.itemName)}" />` : ''}
              </div>
            `,
            )
            .join('')}
        `,
        )
        .join('')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
        <div style="border-top:1px solid #000;padding-top:8px;font-size:9pt;">Handtekening verhuurder</div>
        <div style="border-top:1px solid #000;padding-top:8px;font-size:9pt;">Handtekening huurder</div>
      </div>
    </main>`

  openPrintableDocument(title, `<!doctype html><html lang="nl"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>@media print{@page{size:A4;margin:2cm;}button{display:none;}}</style></head><body>${body}</body></html>`)
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/pdfDocuments.test.ts`
Expected: PASS — all tests green, including the new "aantal sleutels" test.

- [ ] **Step 8: Commit**

```bash
git add src/lib/pdfDocuments.ts src/__tests__/pdfDocuments.test.ts
git commit -m "feat(pdf): render key counts for Sleutels and overview photo galleries in inspection documents"
```

---

### Task 7: Update `InspectionNewPage.tsx` (wizard input)

**Files:**
- Modify: `src/pages/InspectionNewPage.tsx` (multiple sections, see steps)
- Test: `src/__tests__/InspectionNewPage.test.tsx`

This is the largest task because the wizard both collects the key count and the photo
gallery. It's split into two sub-parts: Sleutels stepper first, then overview-photo
gallery.

#### Part A — Sleutels stepper

- [ ] **Step 1: Update the wizard test to drive the Sleutels item via a stepper instead of a condition button**

In `src/__tests__/InspectionNewPage.test.tsx`, add `within` to the testing-library import
(line 1):

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
```

Then add a helper after `selectAllGoodInCurrentCategory`
(after line 20):

```tsx
async function rateAllExceptSleutels(expectedItems: number) {
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: 'Goed' })).toHaveLength(expectedItems)
  })

  screen.getAllByRole('button', { name: 'Goed' }).forEach(button => fireEvent.click(button))
}

async function setSleutelsCount(times: number) {
  const plusButton = await screen.findByRole('button', { name: /aantal sleutels vermeerderen/i })
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(plusButton)
  }
}
```

Then change the `categories` arrays in both `'gaat naar de laatste stap na alle categorieen'`
(lines 72-78) and `'toont een PDF voorbeeld knop op de laatste stap'` (lines 94-100) from:

```tsx
      { title: 'Algemeen', itemCount: 5 },
```

to:

```tsx
      { title: 'Algemeen', itemCount: 4 },
```

and change the loop body in both tests from:

```tsx
    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      await selectAllGoodInCurrentCategory(category.itemCount)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }
```

to:

```tsx
    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      if (category.title === 'Algemeen') {
        await rateAllExceptSleutels(category.itemCount)
        await setSleutelsCount(2)
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }
```

Add a new test after `'toont foto-upload bij slechte toestand'` (after line 67):

```tsx
  it('toont een aantal-stepper voor Sleutels i.p.v. conditieknoppen', async () => {
    renderPage()

    const categories = ['Keuken', 'Badkamer', 'Kamer', 'Inkom']
    for (const title of categories) {
      await screen.findByRole('heading', { name: title })
      await selectAllGoodInCurrentCategory(title === 'Keuken' || title === 'Badkamer' || title === 'Kamer' ? 7 : 5)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    await screen.findByRole('heading', { name: 'Algemeen' })
    const sleutelsCard = screen.getByText('Sleutels').closest('.rounded-2xl') as HTMLElement
    expect(within(sleutelsCard).queryByRole('button', { name: 'Goed' })).not.toBeInTheDocument()
    expect(within(sleutelsCard).queryByRole('button', { name: 'Onbruikbaar' })).not.toBeInTheDocument()

    const plusButton = screen.getByRole('button', { name: /aantal sleutels vermeerderen/i })
    const minusButton = screen.getByRole('button', { name: /aantal sleutels verminderen/i })
    expect(screen.getByText('0 stuks')).toBeInTheDocument()

    fireEvent.click(plusButton)
    fireEvent.click(plusButton)
    expect(screen.getByText('2 stuks')).toBeInTheDocument()

    fireEvent.click(minusButton)
    expect(screen.getByText('1 stuk')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `npx vitest run src/__tests__/InspectionNewPage.test.tsx -t "aantal-stepper voor Sleutels"`
Expected: FAIL — "Sleutels" still renders the four condition buttons, so
`getByRole('button', { name: /aantal sleutels vermeerderen/i })` throws "Unable to find role".

- [ ] **Step 3: Add `keyCount` to wizard item state and the `Minus`/`Plus` icons**

Change the `lucide-react` import (line 4) to add `Minus`, `Plus`, and `X`:

```tsx
import { ArrowLeft, ArrowRight, Camera, Check, Download, Loader2, Minus, Plus, X } from 'lucide-react'
```

Change `InspectionItemState` (lines 18-21):

```tsx
interface InspectionItemState {
  condition: Condition | null
  keyCount: number | null
  photoUrl: string | null
}
```

Change `createInitialItems` (lines 62-69) to seed `keyCount: null`:

```tsx
function createInitialItems(): Record<string, InspectionItemState> {
  return CATEGORIES.reduce<Record<string, InspectionItemState>>((acc, category) => {
    category.items.forEach(item => {
      acc[`${category.id}:${item}`] = { condition: null, keyCount: null, photoUrl: null }
    })
    return acc
  }, {})
}
```

- [ ] **Step 4: Add an `isItemComplete` helper and use it for category-completion checks**

Replace `currentCategoryComplete` (lines 108-111):

```tsx
  function isItemComplete(categoryId: string, itemName: string) {
    const state = items[itemKey(categoryId, itemName)]
    if (itemName === 'Sleutels') return state.keyCount !== null
    return state.condition !== null
  }

  function currentCategoryComplete() {
    if (!currentCategory) return false
    return currentCategory.items.every(item => isItemComplete(currentCategory.id, item))
  }
```

- [ ] **Step 5: Replace the condition-button grid with a stepper for the Sleutels item**

In the category-step JSX (inside the `{currentCategory.items.map(item => { ... })}` block,
lines 221-294), the per-item card currently always renders the `CONDITION_OPTIONS` grid
(lines 238-254). Wrap that grid in a conditional and add the stepper branch:

```tsx
                      {item === 'Sleutels' ? (
                        <div className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-white/80 bg-white/60 py-2">
                          <button
                            type="button"
                            aria-label="Aantal sleutels verminderen"
                            disabled={(state.keyCount ?? 0) <= 0}
                            onClick={() =>
                              updateItem(currentCategory.id, item, { keyCount: Math.max(0, (state.keyCount ?? 0) - 1) })
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
                            aria-label="Aantal sleutels vermeerderen"
                            onClick={() => updateItem(currentCategory.id, item, { keyCount: (state.keyCount ?? 0) + 1 })}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/70 text-slate-600"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {CONDITION_OPTIONS.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateItem(currentCategory.id, item, { condition: option.value })}
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

This replaces the previously unconditional `<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">...CONDITION_OPTIONS...</div>` block. Also update the "Ingevuld"
checkmark condition just above it (around line 233) from `{state.condition && (...)}` to
`{isItemComplete(currentCategory.id, item) && (...)}`. The existing `needsPhoto` flag
(line 224, `state.condition === 'bad' || state.condition === 'unusable'`) needs no change —
Sleutels never sets `condition`, so it stays `null` and `needsPhoto` is naturally `false`
for that item.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/InspectionNewPage.test.tsx -t "aantal-stepper voor Sleutels"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/InspectionNewPage.tsx src/__tests__/InspectionNewPage.test.tsx
git commit -m "feat(inspection-wizard): replace Sleutels condition rating with a key-count stepper"
```

#### Part B — Overview photo gallery (5-8 photos)

- [ ] **Step 8: Update the wizard test to upload 5 photos and assert gallery affordances**

Replace the photo-upload section of `'toont een PDF voorbeeld knop op de laatste stap'`
(originally lines 108-126, now shifted by the Part A edits — locate by the
`expect(await screen.findByRole('button', { name: /pdf voorbeeld maken/i })).toBeDisabled()`
line) with:

```tsx
    expect(await screen.findByRole('button', { name: /pdf voorbeeld maken/i })).toBeDisabled()
    expect(screen.getByText(/0\/8 foto's/)).toBeInTheDocument()

    for (let index = 0; index < 5; index += 1) {
      const overviewPhotoInput = screen
        .getAllByLabelText(/overzichtsfoto toevoegen/i)
        .find(element => element.tagName === 'INPUT')

      if (!overviewPhotoInput) throw new Error('Overzichtsfoto input niet gevonden')

      fireEvent.change(overviewPhotoInput, {
        target: { files: [new File([`foto${index}`], `foto${index}.png`, { type: 'image/png' })] },
      })

      await waitFor(() => {
        expect(screen.getAllByAltText(/^overzichtsfoto \d+$/i)).toHaveLength(index + 1)
      })
    }

    expect(screen.getByText(/5\/8 foto's/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pdf voorbeeld maken/i })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /pdf voorbeeld maken/i }))

    expect(write).toHaveBeenCalledWith(expect.stringContaining('Plaatsbeschrijving'))
```

Add a new test after it asserting removal works:

```tsx
  it('laat een toegevoegde overzichtsfoto verwijderen', async () => {
    renderPage()

    const categories = [
      { title: 'Keuken', itemCount: 7 },
      { title: 'Badkamer', itemCount: 7 },
      { title: 'Kamer', itemCount: 7 },
      { title: 'Inkom', itemCount: 5 },
      { title: 'Algemeen', itemCount: 4 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      if (category.title === 'Algemeen') {
        await rateAllExceptSleutels(category.itemCount)
        await setSleutelsCount(1)
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    await screen.findByRole('heading', { name: 'Overzichtsfoto' })
    const overviewPhotoInput = screen
      .getAllByLabelText(/overzichtsfoto toevoegen/i)
      .find(element => element.tagName === 'INPUT')
    if (!overviewPhotoInput) throw new Error('Overzichtsfoto input niet gevonden')

    fireEvent.change(overviewPhotoInput, {
      target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Overzichtsfoto 1')

    fireEvent.click(screen.getByRole('button', { name: /overzichtsfoto 1 verwijderen/i }))

    await waitFor(() => {
      expect(screen.queryByAltText('Overzichtsfoto 1')).not.toBeInTheDocument()
      expect(screen.getByText(/0\/8 foto's/)).toBeInTheDocument()
    })
  })
```

- [ ] **Step 9: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/InspectionNewPage.test.tsx`
Expected: FAIL — the page still has a single `overviewPhotoUrl` and shows
"Overzichtsfoto" (singular heading), no "N/8 foto's" text, and no per-photo remove buttons.

- [ ] **Step 10: Replace single-photo state with a gallery array and update validation**

Change the `overviewPhotoUrl` state declaration (line 90):

```tsx
  const [overviewPhotoUrls, setOverviewPhotoUrls] = useState<string[]>([])
```

Add a removal helper next to `updateItem` (after line 106):

```tsx
  function removeOverviewPhoto(index: number) {
    setOverviewPhotoUrls(previous => previous.filter((_, photoIndex) => photoIndex !== index))
  }
```

Change `canProceed` (lines 113-115):

```tsx
  function canProceed() {
    return isFinalStep ? overviewPhotoUrls.length >= 5 : currentCategoryComplete()
  }
```

In `handleNext`, change the `saveInspectionData` call's `overviewPhotoUrl` field (around
line 130) to `overviewPhotoUrls`, and change the `items` mapping (lines 131-149) plus the
`inspectionDocumentItems` function (lines 167-187) — both build the same shape — into one
shared helper placed directly above `handleNext` (replacing both blocks' bodies):

```tsx
  function buildInspectionItems() {
    return CATEGORIES.flatMap(category =>
      category.items
        .map(item => {
          const state = items[itemKey(category.id, item)]
          if (!isItemComplete(category.id, item)) return null
          return {
            category: category.label,
            itemName: item,
            condition: item === 'Sleutels' ? null : state.condition,
            keyCount: item === 'Sleutels' ? state.keyCount : null,
            photoUrl: state.photoUrl,
          }
        })
        .filter((entry): entry is {
          category: string
          itemName: string
          condition: Condition | null
          keyCount: number | null
          photoUrl: string | null
        } => entry !== null),
    )
  }
```

Then in `handleNext`, replace the `items: CATEGORIES.flatMap(...)` argument (lines 131-149)
with `items: buildInspectionItems(),`, and replace the entire `inspectionDocumentItems`
function body (lines 167-187) with:

```tsx
  function inspectionDocumentItems() {
    return buildInspectionItems()
  }
```

Also update the `saveInspectionData` call's photo field from `overviewPhotoUrl,` to
`overviewPhotoUrls,`.

- [ ] **Step 11: Replace the final-step JSX with a photo gallery**

Replace the `{isFinalStep && (...)}` block (lines 298-359) with:

```tsx
            {isFinalStep && (
              <section className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Laatste stap
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">Overzichtsfoto&apos;s</h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Voeg 5 tot 8 foto&apos;s toe van de volledige ruimte om de plaatsbeschrijving af te ronden.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {overviewPhotoUrls.map((url, index) => (
                      <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                        <img
                          src={url}
                          alt={`Overzichtsfoto ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Overzichtsfoto ${index + 1} verwijderen`}
                          onClick={() => removeOverviewPhoto(index)}
                          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {overviewPhotoUrls.length < 8 && (
                      <label
                        aria-label="Overzichtsfoto toevoegen"
                        className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-100/70 text-slate-400"
                      >
                        <Camera size={24} />
                        <span className="text-xs font-bold">Foto toevoegen</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={event => readImage(event, url => setOverviewPhotoUrls(previous => [...previous, url]))}
                        />
                      </label>
                    )}
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {overviewPhotoUrls.length}/8 foto&apos;s
                    {overviewPhotoUrls.length < 5 && ` — voeg nog minstens ${5 - overviewPhotoUrls.length} toe`}
                  </p>

                  <button
                    type="button"
                    disabled={overviewPhotoUrls.length < 5}
                    onClick={() =>
                      printInspectionDocument({
                        title: 'Plaatsbeschrijving',
                        type: inspectionContext?.type ?? 'start',
                        overviewPhotoUrls,
                        items: inspectionDocumentItems(),
                      })
                    }
                    className={cn(
                      'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/65 px-4 py-3 text-sm font-bold text-slate-700',
                      overviewPhotoUrls.length < 5 && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Download size={16} />
                    PDF voorbeeld maken
                  </button>
                </div>
              </section>
            )}
```

- [ ] **Step 12: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/InspectionNewPage.test.tsx`
Expected: PASS — all tests green, including the new gallery and removal tests.

- [ ] **Step 13: Commit**

```bash
git add src/pages/InspectionNewPage.tsx src/__tests__/InspectionNewPage.test.tsx
git commit -m "feat(inspection-wizard): require 5-8 overview photos with an addable/removable gallery"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole project**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:run`
Expected: all test files pass (was 22 files / 104 tests before this change; expect ~3-4
new tests added across `InspectionDetailPage.test.tsx`, `pdfDocuments.test.ts` and
`InspectionNewPage.test.tsx`).

- [ ] **Step 3: Manually exercise the flow**

Run `npm run dev`, open a contract's startplaatsbeschrijving (`/inspections/new`), and
confirm:
- The "Sleutels" item in the "Algemeen" stap shows a `-`/`+` stepper showing "N stuks"
  (or "1 stuk" for exactly one) instead of condition buttons, and the step only unlocks
  once every item — including Sleutels — has a value.
- The final "Overzichtsfoto's" step blocks "Plaatsbeschrijving afronden" and "PDF
  voorbeeld maken" until at least 5 photos are added, allows up to 8, and lets you remove
  individual photos via the ✕ button.
- The generated PDF preview (and the saved inspection's detail page / contract PDF table)
  show "N stuks" for Sleutels and a photo gallery for the overzichtsfoto's.

- [ ] **Step 4: No commit needed for this task — it is verification-only.**

---

## Spec coverage check

- #2 (Sleutels: aantal i.p.v. staat) → Tasks 1, 2, 3, 4, 5 (`itemBadge`), 6
  (`inspectionValueLabel`), 7 Part A
- #1 (overzichtsfoto's 5-8) → Tasks 1, 2, 3, 4, 5 (gallery), 6 (gallery), 7 Part B
- Test/mock updates called out in the spec → Tasks 4, 5, 6, 7 (each touches its own test file)
