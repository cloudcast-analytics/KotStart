import { type ChangeEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle, Loader2, X } from 'lucide-react'
import { cn } from '../lib/cn'

type Condition = 'good' | 'moderate' | 'bad' | 'unusable'

interface CategoryItem {
  name: string
  type: 'condition'
}

interface Category {
  id: string
  label: string
  items: CategoryItem[]
}

interface ValidateResponse {
  propertyName: string
  roomNumber: string
  studentFirstName: string
  categories: Category[]
}

interface ItemState {
  condition: Condition | null
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

export default function InspectionStudentPage() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ValidateResponse | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState<Record<string, ItemState>>({})
  const [overviewPhotoUrls, setOverviewPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const baseUrl = import.meta.env.VITE_SUPABASE_URL

  useEffect(() => {
    if (!token) {
      setError('Ongeldige link.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function validate() {
      try {
        const res = await fetch(`${baseUrl}/functions/v1/inspection-token-validate?token=${encodeURIComponent(token!)}`)
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          const message = body?.error || 'Ongeldige link.'
          if (res.status === 410) {
            if (!cancelled) setError('Deze link is verlopen.')
          } else if (res.status === 409) {
            if (!cancelled) setError('Deze inspectie is al ingevuld.')
          } else {
            if (!cancelled) setError(message)
          }
          if (!cancelled) setLoading(false)
          return
        }
        const result: ValidateResponse = await res.json()
        if (!cancelled) {
          setData(result)
          const initial: Record<string, ItemState> = {}
          for (const cat of result.categories) {
            for (const item of cat.items) {
              initial[itemKey(cat.id, item.name)] = { condition: null, photoUrl: null }
            }
          }
          setItems(initial)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('Kon de link niet valideren. Controleer je internetverbinding.')
          setLoading(false)
        }
      }
    }

    validate()
    return () => { cancelled = true }
  }, [token, baseUrl])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-4">
        <Loader2 size={28} className="animate-spin text-slate-400" />
        <p className="text-sm font-semibold text-slate-500">Link valideren...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <p className="mt-2 text-xs text-red-600">Neem contact op met je verhuurder als je denkt dat dit een fout is.</p>
        </div>
        <p className="text-xs font-semibold text-slate-400">KotStart</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <CheckCircle size={48} className="text-green-500" />
        <h1 className="text-xl font-bold text-slate-900">Plaatsbeschrijving ingediend!</h1>
        <p className="text-sm text-slate-600">
          Bedankt, {data?.studentFirstName}. Je verhuurder ontvangt je inspectie.
        </p>
        <p className="mt-4 text-xs font-semibold text-slate-400">KotStart</p>
      </div>
    )
  }

  if (!data) return null

  const categories = data.categories
  const isFinalStep = currentIndex === categories.length
  const currentCategory = categories[currentIndex]

  function updateItem(categoryId: string, itemName: string, patch: Partial<ItemState>) {
    const key = itemKey(categoryId, itemName)
    setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function removeOverviewPhoto(index: number) {
    setOverviewPhotoUrls(prev => prev.filter((_, i) => i !== index))
  }

  function currentCategoryComplete() {
    if (!currentCategory) return false
    return currentCategory.items.every(item => items[itemKey(currentCategory.id, item.name)]?.condition !== null)
  }

  function canProceed() {
    return isFinalStep ? overviewPhotoUrls.length >= 5 : currentCategoryComplete()
  }

  async function handleNext() {
    if (!canProceed()) return
    if (!isFinalStep) {
      setCurrentIndex(i => i + 1)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const studentItems = categories.flatMap(cat =>
      cat.items.map(item => {
        const state = items[itemKey(cat.id, item.name)]
        return {
          category: cat.label,
          itemName: item.name,
          condition: state.condition!,
          photoUrl: state.photoUrl || undefined,
        }
      }),
    )

    try {
      const res = await fetch(`${baseUrl}/functions/v1/inspection-token-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          studentItems,
          studentPhotoUrls: overviewPhotoUrls,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Indienen mislukt.')
      }

      setSuccess(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Indienen mislukt. Probeer het opnieuw.')
      setIsSubmitting(false)
    }
  }

  function handleBack() {
    if (currentIndex === 0) return
    setCurrentIndex(i => i - 1)
  }

  const totalSteps = categories.length + 1

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-center text-lg font-bold text-slate-900">
          <span className="text-slate-900">Kot</span>
          <span className="text-accent">Start</span>
        </p>
        <p className="mt-1 text-center text-xs text-slate-500">
          Plaatsbeschrijving — {data.propertyName}, kamer {data.roomNumber}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {!isFinalStep && currentCategory && (
              <section className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Stap {currentIndex + 1} van {totalSteps}
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
                      className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        {state.condition !== null && (
                          <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-label="Ingevuld" />
                        )}
                      </div>

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
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
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
                                  alt={`Foto ${item.name}`}
                                  className="mb-3 h-28 w-full rounded-xl bg-slate-100 object-contain"
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
                    Voeg 5 tot 8 foto&apos;s toe van de volledige ruimte.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {overviewPhotoUrls.map((url, index) => (
                      <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                        <img
                          src={url}
                          alt={`Overzichtsfoto ${index + 1}`}
                          className="h-full w-full bg-slate-100 object-contain"
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
                          onChange={event => readImage(event, url => setOverviewPhotoUrls(prev => [...prev, url]))}
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

      {/* Bottom bar */}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3">
        {submitError && (
          <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {submitError}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="Vorige"
            onClick={handleBack}
            disabled={currentIndex === 0 || isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={15} />
            Vorige
          </button>

          <button
            type="button"
            aria-label={isFinalStep ? 'Inspectie indienen' : 'Volgende'}
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className={cn(
              'btn-primary flex flex-[2] items-center justify-center gap-2 py-3 text-sm transition-opacity',
              (!canProceed() || isSubmitting) && 'cursor-not-allowed opacity-50',
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Wordt ingediend...
              </>
            ) : isFinalStep ? (
              'Inspectie indienen'
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
