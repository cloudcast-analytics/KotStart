# Schooljaar- en pand-dropdowns + zelf schooljaren toevoegen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cyclic `Chip` selectors in the TopBar with a real `FilterDropdown` component for schooljaar and pand, and let verhuurders add new schooljaren (persisted per owner in a new `school_years` Supabase table).

**Architecture:** New `FilterDropdown` component (`src/components/ui/FilterDropdown.tsx`) renders a toggleable overlay list, reusing the `InstitutionSelect` "list + extra action" pattern. `TopBar.tsx` swaps its two `Chip` instances for `FilterDropdown`, adding an `onAddSchoolYear` prop and an `extraAction` on the schooljaar dropdown computed via `nextSchoolYear`. `AppShell.tsx` owns the schooljaren list (fetched via new `getSchoolYears()`, extended via new `addSchoolYear()`) and the add-handler. `Chip` is deleted (no longer used anywhere).

**Tech Stack:** React 18 + TypeScript + Tailwind, Vitest + Testing Library, Supabase (Postgres + RLS).

---

## File Structure

- **`src/components/ui/FilterDropdown.tsx`** (new) — generic dropdown control: shows `label` on a button, toggles an option list, supports an optional `extraAction` row. Replaces `Chip`.
- **`src/__tests__/FilterDropdown.test.tsx`** (new) — behavior tests for the dropdown.
- **`src/components/ui/Chip.tsx`** (delete) — superseded by `FilterDropdown`.
- **`src/__tests__/Chip.test.tsx`** (delete) — tests for the deleted component.
- **`src/lib/data.ts`** — add `getSchoolYears()`, `addSchoolYear()`, and internal `mergeSchoolYears()`.
- **`src/lib/mockData.ts`** — no change (already exports `SCHOOL_YEARS`), but `data.ts` needs to import it.
- **`src/__tests__/data.test.ts`** — add demo-mode tests for `getSchoolYears`/`addSchoolYear`.
- **`src/components/layout/TopBar.tsx`** — use `FilterDropdown` instead of `Chip`; new required `onAddSchoolYear` prop; computes the "+ Volgend schooljaar toevoegen (20XX–20XX)" extra action via `nextSchoolYear`.
- **`src/components/layout/AppShell.tsx`** — fetches the full schooljarenlijst on mount via `getSchoolYears()`, implements `handleAddSchoolYear` using `addSchoolYear()`, passes both down to `TopBar`.
- **`src/__tests__/DashboardPage.test.tsx`** — update the empty-state test to use the new dropdown interaction instead of relying on cyclic `Chip` behavior.
- **`supabase/migrations/20260612000000_school_years.sql`** (new) — `school_years` table + RLS policy.
- **`supabase/staging-bootstrap.sql`** — mirror the new table as item 14.

---

## Task 1: `FilterDropdown` component

**Files:**
- Create: `src/components/ui/FilterDropdown.tsx`
- Test: `src/__tests__/FilterDropdown.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/FilterDropdown.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterDropdown from '../components/ui/FilterDropdown'

describe('FilterDropdown', () => {
  it('toont het label op de knop', () => {
    render(<FilterDropdown label="2025–2026" options={['2025–2026', '2026–2027']} onSelect={() => {}} />)
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
  })

  it('opent de optielijst bij klik en toont alle options', () => {
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027', '2027–2028']}
        onSelect={() => {}}
      />,
    )
    expect(screen.queryByText('2027–2028')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('2025–2026'))

    expect(screen.getByText('2026–2027')).toBeInTheDocument()
    expect(screen.getByText('2027–2028')).toBeInTheDocument()
  })

  it('klik op een optie roept onSelect aan met die waarde en sluit de lijst', () => {
    const onSelect = vi.fn()
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027', '2027–2028']}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByText('2025–2026'))
    fireEvent.click(screen.getByText('2026–2027'))

    expect(onSelect).toHaveBeenCalledWith('2026–2027')
    expect(screen.queryByText('2027–2028')).not.toBeInTheDocument()
  })

  it('toont de extra actie onderaan en roept extraAction.onClick aan bij klik', () => {
    const onExtraClick = vi.fn()
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027']}
        onSelect={() => {}}
        extraAction={{ label: '+ Volgend schooljaar toevoegen (2026–2027)', onClick: onExtraClick }}
      />,
    )

    fireEvent.click(screen.getByText('2025–2026'))
    expect(screen.getByText('+ Volgend schooljaar toevoegen (2026–2027)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('+ Volgend schooljaar toevoegen (2026–2027)'))
    expect(onExtraClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('2026–2027')).not.toBeInTheDocument()
  })

  it('klik buiten de dropdown sluit de lijst', () => {
    render(<FilterDropdown label="2025–2026" options={['2025–2026', '2026–2027']} onSelect={() => {}} />)

    fireEvent.click(screen.getByText('2025–2026'))
    expect(screen.getByText('2026–2027')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('2026–2027')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- FilterDropdown`
Expected: FAIL — `Failed to resolve import "../components/ui/FilterDropdown"`

- [ ] **Step 3: Create the component**

Create `src/components/ui/FilterDropdown.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface FilterDropdownExtraAction {
  label: string
  onClick: () => void
}

interface FilterDropdownProps {
  label: string
  options: string[]
  onSelect: (value: string) => void
  extraAction?: FilterDropdownExtraAction
  className?: string
}

export default function FilterDropdown({ label, options, onSelect, extraAction, className }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'glass-chip flex items-center gap-1.5 px-2.5 py-2 rounded-xl w-full',
          'text-slate-800 text-xs font-semibold',
          'hover:bg-white/80 transition-colors duration-150',
          'min-h-[36px]',
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={12} className="text-slate-400 flex-shrink-0 ml-auto" />
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/90 bg-white shadow-xl">
          {options.map(option => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onSelect(option)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm font-medium hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none',
                  option === label ? 'font-semibold text-accent' : 'text-slate-700',
                )}
              >
                {option}
              </button>
            </li>
          ))}
          {extraAction && (
            <li>
              <button
                type="button"
                onClick={() => {
                  extraAction.onClick()
                  setOpen(false)
                }}
                className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none"
              >
                {extraAction.label}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- FilterDropdown`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/FilterDropdown.tsx src/__tests__/FilterDropdown.test.tsx
git commit -m "feat(topbar): add FilterDropdown component"
```

---

## Task 2: `data.ts` — `getSchoolYears` / `addSchoolYear`

**Files:**
- Modify: `src/lib/data.ts:2` (import), `src/lib/data.ts:378-385` (insert after `nextSchoolYear`)
- Test: `src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/data.test.ts`, update the import line at the top (line 2-3) to add `addSchoolYear`, `getSchoolYears`, and import `SCHOOL_YEARS`:

```ts
import { describe, expect, it } from 'vitest'
import { addSchoolYear, createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, getSchoolYears, nextSchoolYear, saveInspectionCategories } from '../lib/data'
import { DEFAULT_INSPECTION_CATEGORIES, SCHOOL_YEARS } from '../lib/mockData'
```

Append at the end of the file (after the `createContractRenewal` describe block):

```ts

describe('getSchoolYears', () => {
  it('geeft SCHOOL_YEARS terug in demo-modus', async () => {
    const years = await getSchoolYears()

    expect(years).toEqual(SCHOOL_YEARS)
    expect(years[0]).toContain('–')
  })
})

describe('addSchoolYear', () => {
  it('geeft null terug in demo-modus', async () => {
    await expect(addSchoolYear('2028–2029')).resolves.toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- data.test`
Expected: FAIL — `getSchoolYears is not a function` / `addSchoolYear is not a function` (not exported yet)

- [ ] **Step 3: Implement the functions in `data.ts`**

In `src/lib/data.ts`, change line 2 to add `SCHOOL_YEARS` to the `mockData` import:

```ts
import { CONTRACTS, DEFAULT_INSPECTION_CATEGORIES, MOCK_INSPECTION_ITEMS, MOCK_INSPECTIONS, MOCK_LANDLORD_PROFILE, PROPERTIES, ROOMS, SCHOOL_YEARS, STUDENTS } from './mockData'
```

Then, immediately after the existing `nextSchoolYear` function (currently lines 378-385), insert:

```ts

function mergeSchoolYears(base: string[], custom: string[]): string[] {
  const unique = Array.from(new Set([...base, ...custom]))
  return unique.sort((a, b) => {
    const yearA = Number(a.match(/^(\d{4})/)?.[1] ?? 0)
    const yearB = Number(b.match(/^(\d{4})/)?.[1] ?? 0)
    return yearA - yearB
  })
}

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- data.test`
Expected: PASS (all `data.test.ts` tests, including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts src/__tests__/data.test.ts
git commit -m "feat(data): add getSchoolYears and addSchoolYear helpers"
```

---

## Task 3: `TopBar` + `AppShell` integration, remove `Chip`

**Files:**
- Modify: `src/components/layout/TopBar.tsx` (full rewrite, 70 lines)
- Modify: `src/components/layout/AppShell.tsx` (full rewrite, 63 lines)
- Modify: `src/__tests__/DashboardPage.test.tsx:49-54`
- Delete: `src/components/ui/Chip.tsx`
- Delete: `src/__tests__/Chip.test.tsx`

- [ ] **Step 1: Update the `DashboardPage.test.tsx` empty-state test (will fail until Steps 2-3 land)**

In `src/__tests__/DashboardPage.test.tsx`, replace lines 49-54:

```tsx
  it('toont lege staat als er geen data is voor de selectie', async () => {
    renderDashboard()
    const propertyChip = await screen.findByText('Residentie De Linde')
    fireEvent.click(propertyChip)
    expect(await screen.findByText('Nog geen studenten')).toBeInTheDocument()
  })
```

with:

```tsx
  it('toont lege staat als er geen data is voor de selectie', async () => {
    renderDashboard()
    const propertyButton = await screen.findByText('Residentie De Linde')
    fireEvent.click(propertyButton)
    const option = await screen.findByText('Kot Guldensporenstraat')
    fireEvent.click(option)
    expect(await screen.findByText('Nog geen studenten')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- DashboardPage`
Expected: FAIL — `findByText('Kot Guldensporenstraat')` times out (the old `Chip` has no option list, it cycles directly on click)

- [ ] **Step 3: Rewrite `TopBar.tsx`**

Replace the full contents of `src/components/layout/TopBar.tsx`:

```tsx
import { Menu } from 'lucide-react'
import FilterDropdown from '../ui/FilterDropdown'
import { nextSchoolYear } from '../../lib/data'

interface TopBarProps {
  schoolYear: string
  propertyName: string
  schoolYears: string[]
  propertyNames: string[]
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (name: string) => void
  onAddSchoolYear: () => void
  onMenuClick: () => void
  showMenuButton: boolean
  showSchoolYearFilter?: boolean
  showPropertyFilter?: boolean
}

export default function TopBar({
  schoolYear,
  propertyName,
  schoolYears,
  propertyNames,
  onSchoolYearChange,
  onPropertyChange,
  onAddSchoolYear,
  onMenuClick,
  showMenuButton,
  showSchoolYearFilter = true,
  showPropertyFilter = true,
}: TopBarProps) {
  return (
    <div className="bg-white/38 backdrop-blur-xl border-b border-white/65 px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-2">
        {showMenuButton && (
          <button
            type="button"
            aria-label="Menu openen"
            onClick={onMenuClick}
            className="glass-chip w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center"
          >
            <Menu size={16} className="text-slate-500" />
          </button>
        )}
        <div className="flex gap-1.5 flex-1 min-w-0">
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
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `AppShell.tsx`**

Replace the full contents of `src/components/layout/AppShell.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import Drawer from './Drawer'
import TopBar from './TopBar'
import { addSchoolYear, getSchoolYears, nextSchoolYear } from '../../lib/data'
import { PROPERTIES, SCHOOL_YEARS } from '../../lib/mockData'
import type { Property } from '../../types'

interface AppShellProps {
  children: ReactNode
  schoolYear: string
  propertyId: string
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (id: string) => void
  properties?: Property[]
  schoolYears?: string[]
  showSchoolYearFilter?: boolean
  showPropertyFilter?: boolean
}

export default function AppShell({
  children,
  schoolYear,
  propertyId,
  onSchoolYearChange,
  onPropertyChange,
  properties = PROPERTIES,
  schoolYears: schoolYearsProp = SCHOOL_YEARS,
  showSchoolYearFilter = true,
  showPropertyFilter = true,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [schoolYears, setSchoolYears] = useState<string[]>(schoolYearsProp)

  useEffect(() => {
    let cancelled = false
    getSchoolYears().then(years => {
      if (!cancelled) setSchoolYears(years)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedProperty = properties.find(p => p.id === propertyId) ?? properties[0] ?? PROPERTIES[0]

  function handlePropertyChange(name: string) {
    const found = properties.find(p => p.name === name)
    if (found) onPropertyChange(found.id)
  }

  async function handleAddSchoolYear() {
    const last = schoolYears[schoolYears.length - 1] ?? schoolYear
    const newYear = nextSchoolYear(last)
    const updated = await addSchoolYear(newYear)
    if (updated) {
      setSchoolYears(updated)
    } else {
      setSchoolYears(prev => (prev.includes(newYear) ? prev : [...prev, newYear]))
    }
    onSchoolYearChange(newYear)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          schoolYear={schoolYear}
          propertyName={selectedProperty.name}
          schoolYears={schoolYears}
          propertyNames={properties.map(p => p.name)}
          onSchoolYearChange={onSchoolYearChange}
          onPropertyChange={handlePropertyChange}
          onAddSchoolYear={handleAddSchoolYear}
          onMenuClick={() => setDrawerOpen(true)}
          showMenuButton={true}
          showSchoolYearFilter={showSchoolYearFilter}
          showPropertyFilter={showPropertyFilter}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Delete the unused `Chip` component and its test**

```bash
git rm src/components/ui/Chip.tsx src/__tests__/Chip.test.tsx
```

- [ ] **Step 6: Run the full test suite and type check**

Run: `npm run test:run`
Expected: PASS — all test files (including `FilterDropdown.test.tsx`, `data.test.ts`, `DashboardPage.test.tsx`), `Chip.test.tsx` no longer present

Run: `npx tsc -b`
Expected: PASS — no type errors (in particular, no leftover reference to `Chip` or to the old `TopBar`/`AppShell` prop shapes)

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/layout/AppShell.tsx src/__tests__/DashboardPage.test.tsx
git add -u src/components/ui/Chip.tsx src/__tests__/Chip.test.tsx
git commit -m "feat(topbar): replace Chip with FilterDropdown and add school year management"
```

---

## Task 4: Supabase migration — `school_years` table

**Files:**
- Create: `supabase/migrations/20260612000000_school_years.sql`
- Modify: `supabase/staging-bootstrap.sql` (append after item 13, `landlord_profiles`, currently ending at line 640)

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260612000000_school_years.sql`:

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

- [ ] **Step 2: Mirror the new table in `staging-bootstrap.sql`**

Append to the end of `supabase/staging-bootstrap.sql` (after the item 13 `landlord_profiles` block, currently ending at line 640):

```sql


-- ---------------------------------------------------------------------
-- 14) 20260612000000_school_years
-- ---------------------------------------------------------------------
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

- [ ] **Step 3: Apply the migration to the Supabase staging project via MCP**

Use `mcp__supabase__apply_migration` with project ref `tsieqsxzjrfnevcrbswg`, name `school_years`, and the SQL from Step 1.

- [ ] **Step 4: Verify the migration was applied**

Use `mcp__supabase__list_migrations` (project ref `tsieqsxzjrfnevcrbswg`) and confirm `school_years` is listed. Optionally run `mcp__supabase__execute_sql` with `select * from school_years limit 1;` to confirm the table exists and RLS doesn't error on an empty select.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260612000000_school_years.sql supabase/staging-bootstrap.sql
git commit -m "feat(db): add school_years table for per-owner schooljaren"
```

---

## Task 5: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: PASS — all test files pass (104+ tests, minus the 3 removed `Chip.test.tsx` tests, plus the 5 new `FilterDropdown.test.tsx` tests and 2 new `data.test.ts` tests)

- [ ] **Step 2: Run the type checker**

Run: `npx tsc -b`
Expected: PASS — no type errors

- [ ] **Step 3: Manually confirm no remaining references to `Chip`**

Run: `git grep -n "Chip" -- src`
Expected: no output (no remaining references anywhere in `src/`)

No commit needed for this task — it is a verification gate only.

---

## Spec Coverage Check

- §1 `FilterDropdown` component → Task 1
- §2 `TopBar.tsx` (FilterDropdown + `onAddSchoolYear` + `nextSchoolYear` extra action) → Task 3
- §3 `AppShell.tsx` (fetch schooljarenlijst, `handleAddSchoolYear`) → Task 3
- §4 `data.ts` (`getSchoolYears`, `addSchoolYear`, `mergeSchoolYears`) → Task 2
- §5 Database `school_years` table + RLS + `staging-bootstrap.sql` → Task 4
- §6 Tests (`FilterDropdown.test.tsx`, `data.test.ts`, `DashboardPage.test.tsx`, `Chip.test.tsx` removal, full suite + `tsc -b`) → Tasks 1, 2, 3, 5
