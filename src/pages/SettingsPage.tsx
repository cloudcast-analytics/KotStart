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
