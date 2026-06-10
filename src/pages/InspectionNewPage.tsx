import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Minus, Plus, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { getInspectionCategories, saveInspectionData } from '../lib/data'
import { DEFAULT_INSPECTION_CATEGORIES } from '../lib/mockData'
import type { InspectionMeterUnit, InspectionTemplateCategory, InspectionTemplateItem } from '../types'
import StepIndicator from './wizard/StepIndicator'

type Condition = 'good' | 'moderate' | 'bad' | 'unusable'

interface InspectionItemState {
  condition: Condition | null
  keyCount: number | null
  meterValue: number | null
  photoUrl: string | null
}

const CONDITION_OPTIONS: Array<{
  value: Condition
  label: string
  activeClass: string
}> = [
  { value: 'good', label: 'Goed', activeClass: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'moderate', label: 'Matig', activeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'bad', label: 'Slecht', activeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'unusable', label: 'Onbruikbaar', activeClass: 'bg-red-100 text-red-800 border-red-300' },
]

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

function readImage(event: ChangeEvent<HTMLInputElement>, onLoad: (url: string) => void) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => onLoad(reader.result as string)
  reader.readAsDataURL(file)
}

export default function InspectionNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const inspectionContext = location.state as { contractId?: string; type?: 'start' | 'end' } | null
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

  const isFinalStep = categories.length > 0 && currentIndex === categories.length
  const currentCategory = categories[currentIndex]
  const steps = useMemo(() => [...categories.map(category => category.label), 'Foto'], [categories])

  function updateItem(categoryId: string, itemName: string, patch: Partial<InspectionItemState>) {
    const key = itemKey(categoryId, itemName)
    setItems(previous => ({
      ...previous,
      [key]: {
        ...previous[key],
        ...patch,
      },
    }))
  }

  function removeOverviewPhoto(index: number) {
    setOverviewPhotoUrls(previous => previous.filter((_, photoIndex) => photoIndex !== index))
  }

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

  function canProceed() {
    if (categoriesLoading) return false
    return isFinalStep ? overviewPhotoUrls.length >= 5 : currentCategoryComplete()
  }

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

  async function handleNext() {
    if (!canProceed()) return

    if (!isFinalStep) {
      setCurrentIndex(index => index + 1)
      return
    }

    setIsFinishing(true)
    setSaveError(null)
    try {
      await saveInspectionData({
        contractId: inspectionContext?.contractId ?? 'c1',
        type: inspectionContext?.type ?? 'start',
        overviewPhotoUrls,
        items: buildInspectionItems(),
      })
      window.setTimeout(() => navigate('/'), 1000)
    } catch (err) {
      console.error('Plaatsbeschrijving opslaan mislukt:', err)
      setIsFinishing(false)
      setSaveError(err instanceof Error ? err.message : 'Plaatsbeschrijving opslaan is mislukt. Probeer het opnieuw.')
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      navigate(-1)
      return
    }

    setCurrentIndex(index => index - 1)
  }

  if (categoriesLoading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Plaatsbeschrijving laden...</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 backdrop-blur-xl">
        <StepIndicator steps={steps} currentStep={currentIndex + 1} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -90 && canProceed() && !isFinishing) handleNext()
              if (info.offset.x > 90 && !isFinishing) handleBack()
            }}
            className="min-h-full p-4"
          >
            {!isFinalStep && currentCategory && (
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Plaatsbeschrijving
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">{currentCategory.label}</h1>
                </div>

                {currentCategory.items.map(item => {
                  const key = itemKey(currentCategory.id, item.name)
                  const state = items[key]
                  const needsPhoto = state.condition === 'bad' || state.condition === 'unusable'

                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        {isItemComplete(currentCategory.id, item) && (
                          <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-label="Ingevuld" />
                        )}
                      </div>

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

                      <AnimatePresence initial={false}>
                        {needsPhoto && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 rounded-xl border border-orange-200/70 bg-orange-50/55 p-3">
                              {state.photoUrl ? (
                                <img
                                  src={state.photoUrl}
                                  alt={`Foto ${item.name}`}
                                  className="mb-3 h-28 w-full rounded-xl object-cover"
                                />
                              ) : null}
                              <label
                                aria-label={`Foto toevoegen voor ${item.name}`}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/75 px-3 py-2 text-xs font-bold text-orange-700"
                              >
                                <Camera size={14} />
                                {state.photoUrl ? 'Foto wijzigen' : 'Foto toevoegen'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={event =>
                                    readImage(event, url => updateItem(currentCategory.id, item.name, { photoUrl: url }))
                                  }
                                />
                              </label>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </section>
            )}

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
                      <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-100/70 text-slate-400">
                        <Camera size={24} />
                        <span className="text-xs font-bold">Foto toevoegen</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          aria-label="Overzichtsfoto toevoegen"
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

                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        {saveError && (
          <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {saveError}
          </div>
        )}
        <div className="flex gap-3">
        <button
          type="button"
          aria-label="Vorige"
          onClick={handleBack}
          disabled={isFinishing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/60 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={15} />
          Vorige
        </button>

        <button
          type="button"
          aria-label={isFinalStep ? 'Plaatsbeschrijving afronden' : 'Volgende'}
          onClick={handleNext}
          disabled={!canProceed() || isFinishing}
          className={cn(
            'btn-primary flex flex-[2] items-center justify-center gap-2 py-3 text-sm transition-opacity',
            (!canProceed() || isFinishing) && 'cursor-not-allowed opacity-50',
          )}
        >
          {isFinishing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt afgerond...
            </>
          ) : isFinalStep ? (
            'Plaatsbeschrijving afronden'
          ) : (
            <>
              Volgende
              <ArrowRight size={15} />
            </>
          )}
        </button>
        </div>
      </div>
    </div>
  )
}
