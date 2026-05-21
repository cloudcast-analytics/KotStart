import { type ChangeEvent, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, Download, Loader2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { saveInspectionData } from '../lib/data'
import { printInspectionDocument } from '../lib/pdfDocuments'
import StepIndicator from './wizard/StepIndicator'

type Condition = 'good' | 'moderate' | 'bad' | 'unusable'

interface InspectionCategory {
  id: string
  label: string
  items: string[]
}

interface InspectionItemState {
  condition: Condition | null
  photoUrl: string | null
}

const CATEGORIES: InspectionCategory[] = [
  {
    id: 'kitchen',
    label: 'Keuken',
    items: ['Aanrecht', 'Gootsteen & kraan', 'Oven/kookplaat', 'Koelkast', 'Microgolf', 'Kasten', 'Vloer'],
  },
  {
    id: 'bathroom',
    label: 'Badkamer',
    items: ['Wastafel & kraan', 'Douche/bad', 'Toilet', 'Toiletbril', 'Spiegel', 'Afvoer', 'Vloer'],
  },
  {
    id: 'living',
    label: 'Kamer',
    items: ['Vloer', 'Muren', 'Plafond', 'Raam/ramen', 'Gordijnen/rolgordijnen', 'Deur', 'Kledingkast'],
  },
  {
    id: 'hall',
    label: 'Inkom',
    items: ['Vloer', 'Muren', 'Voordeur', 'Brievenbus', 'Deurbel'],
  },
  {
    id: 'general',
    label: 'Algemeen',
    items: ['Verwarming', 'Elektriciteitsmeter', 'Watermeter', 'Rookmelder', 'Sleutels'],
  },
]

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

function createInitialItems(): Record<string, InspectionItemState> {
  return CATEGORIES.reduce<Record<string, InspectionItemState>>((acc, category) => {
    category.items.forEach(item => {
      acc[`${category.id}:${item}`] = { condition: null, photoUrl: null }
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState(() => createInitialItems())
  const [overviewPhotoUrl, setOverviewPhotoUrl] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  const isFinalStep = currentIndex === CATEGORIES.length
  const currentCategory = CATEGORIES[currentIndex]
  const steps = useMemo(() => [...CATEGORIES.map(category => category.label), 'Foto'], [])

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

  function currentCategoryComplete() {
    if (!currentCategory) return false
    return currentCategory.items.every(item => items[itemKey(currentCategory.id, item)].condition)
  }

  function canProceed() {
    return isFinalStep ? Boolean(overviewPhotoUrl) : currentCategoryComplete()
  }

  async function handleNext() {
    if (!canProceed()) return

    if (!isFinalStep) {
      setCurrentIndex(index => index + 1)
      return
    }

    setIsFinishing(true)
    try {
      await saveInspectionData({
        contractId: inspectionContext?.contractId ?? 'c1',
        type: inspectionContext?.type ?? 'start',
        overviewPhotoUrl,
        items: CATEGORIES.flatMap(category =>
          category.items
            .map(item => {
              const state = items[itemKey(category.id, item)]
              if (!state.condition) return null
              return {
                category: category.label,
                itemName: item,
                condition: state.condition,
                photoUrl: state.photoUrl,
              }
            })
            .filter((item): item is {
              category: string
              itemName: string
              condition: Condition
              photoUrl: string | null
            } => item !== null),
        ),
      })
      window.setTimeout(() => navigate('/'), 1000)
    } catch (err) {
      console.error('Plaatsbeschrijving opslaan mislukt:', err)
      setIsFinishing(false)
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      navigate(-1)
      return
    }

    setCurrentIndex(index => index - 1)
  }

  function inspectionDocumentItems() {
    return CATEGORIES.flatMap(category =>
      category.items
        .map(item => {
          const state = items[itemKey(category.id, item)]
          if (!state.condition) return null
          return {
            category: category.label,
            itemName: item,
            condition: state.condition,
            photoUrl: state.photoUrl,
          }
        })
        .filter((item): item is {
          category: string
          itemName: string
          condition: Condition
          photoUrl: string | null
        } => item !== null),
    )
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
                  const key = itemKey(currentCategory.id, item)
                  const state = items[key]
                  const needsPhoto = state.condition === 'bad' || state.condition === 'unusable'

                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">{item}</p>
                        {state.condition && (
                          <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-label="Ingevuld" />
                        )}
                      </div>

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
                                  alt={`Foto ${item}`}
                                  className="mb-3 h-28 w-full rounded-xl object-cover"
                                />
                              ) : null}
                              <label
                                aria-label={`Foto toevoegen voor ${item}`}
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
                                    readImage(event, url => updateItem(currentCategory.id, item, { photoUrl: url }))
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
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">Overzichtsfoto</h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Voeg een foto toe van de volledige ruimte om de plaatsbeschrijving af te ronden.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
                  {overviewPhotoUrl ? (
                    <img
                      src={overviewPhotoUrl}
                      alt="Overzichtsfoto"
                      className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-100/70">
                      <Camera size={32} className="text-slate-400" />
                    </div>
                  )}

                  <label
                    aria-label="Overzichtsfoto toevoegen"
                    className="btn-primary inline-flex w-full cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm"
                  >
                    <Camera size={16} />
                    {overviewPhotoUrl ? 'Overzichtsfoto wijzigen' : 'Overzichtsfoto toevoegen'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={event => readImage(event, setOverviewPhotoUrl)}
                    />
                  </label>

                  <button
                    type="button"
                    disabled={!overviewPhotoUrl}
                    onClick={() =>
                      printInspectionDocument({
                        title: 'Plaatsbeschrijving',
                        type: inspectionContext?.type ?? 'start',
                        overviewPhotoUrl,
                        items: inspectionDocumentItems(),
                      })
                    }
                    className={cn(
                      'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/65 px-4 py-3 text-sm font-bold text-slate-700',
                      !overviewPhotoUrl && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Download size={16} />
                    PDF voorbeeld maken
                  </button>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
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
  )
}
