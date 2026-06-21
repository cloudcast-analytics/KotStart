import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ClipboardCopy, Loader2, Minus, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import {
  createInspectionToken,
  getContractBundleData,
  getInspectionCategories,
  getInspectionTokenForContract,
  sendInspectionDelegationEmail,
} from '../lib/data'
import type { InspectionTemplateCategory, InspectionTemplateItem } from '../types'

interface MeterItemState {
  meterValue: number | null
  keyCount: number | null
}

function itemKey(categoryId: string, itemName: string) {
  return `${categoryId}:${itemName}`
}

export default function InspectionDelegatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { contractId?: string } | null
  const contractId = state?.contractId

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [meterItems, setMeterItems] = useState<Array<{ category: InspectionTemplateCategory; item: InspectionTemplateItem }>>([])
  const [itemStates, setItemStates] = useState<Record<string, MeterItemState>>({})
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ email: string; expiresAt: string; link: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!contractId) {
        setLoading(false)
        return
      }

      try {
        // Check for existing pending token first
        const existingToken = await getInspectionTokenForContract(contractId)
        if (cancelled) return

        if (existingToken && existingToken.status === 'pending') {
          const tokenUrl = `${window.location.origin}/inspection/student/${existingToken.token}`
          // Load bundle for student email display
          const bundle = await getContractBundleData(contractId)
          if (cancelled) return
          setConfirmation({
            email: bundle?.student.email ?? '',
            expiresAt: existingToken.expiresAt,
            link: tokenUrl,
          })
          setLoading(false)
          return
        }

        const bundle = await getContractBundleData(contractId)
        if (cancelled || !bundle) {
          if (!cancelled) setLoading(false)
          return
        }

        setStudentName(`${bundle.student.firstName} ${bundle.student.lastName}`)
        setStudentEmail(bundle.student.email)
        setPropertyName(bundle.property.name)
        setPropertyId(bundle.property.id)
        setRoomNumber(bundle.room.roomNumber)

        const categories = await getInspectionCategories(bundle.property.id)
        if (cancelled) return

        // Filter to only meter and count items
        const filtered: Array<{ category: InspectionTemplateCategory; item: InspectionTemplateItem }> = []
        const initialStates: Record<string, MeterItemState> = {}

        for (const category of categories) {
          for (const item of category.items) {
            if (item.type === 'meter' || item.type === 'count') {
              filtered.push({ category, item })
              initialStates[itemKey(category.id, item.name)] = { meterValue: null, keyCount: null }
            }
          }
        }

        setMeterItems(filtered)
        setItemStates(initialStates)
      } catch (err) {
        console.error('Fout bij laden delegatiepagina:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [contractId])

  function updateItem(categoryId: string, itemName: string, patch: Partial<MeterItemState>) {
    const key = itemKey(categoryId, itemName)
    setItemStates(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  function allItemsFilled(): boolean {
    return meterItems.every(({ category, item }) => {
      const state = itemStates[itemKey(category.id, item.name)]
      if (!state) return false
      if (item.type === 'meter') return state.meterValue !== null
      if (item.type === 'count') return state.keyCount !== null
      return false
    })
  }

  function buildLandlordItems() {
    return meterItems.map(({ category, item }) => {
      const state = itemStates[itemKey(category.id, item.name)]
      return {
        category: category.label,
        itemName: item.name,
        condition: null,
        keyCount: item.type === 'count' ? state.keyCount : null,
        meterValue: item.type === 'meter' ? state.meterValue : null,
        meterUnit: item.type === 'meter' ? (item.unit ?? null) : null,
        photoUrl: null,
      }
    })
  }

  async function handleSend() {
    if (!contractId || !allItemsFilled()) return
    setIsSending(true)
    setSendError(null)

    try {
      const landlordItems = buildLandlordItems()
      const result = await createInspectionToken(contractId, propertyId, landlordItems)

      if (result) {
        const tokenUrl = `${window.location.origin}/inspection/student/${result.token}`

        try {
          await sendInspectionDelegationEmail(
            studentEmail,
            studentName,
            propertyName,
            roomNumber,
            tokenUrl,
            result.expiresAt,
          )
        } catch (emailErr) {
          // Email failure is non-blocking; token was already created
          console.error('E-mail versturen mislukt:', emailErr)
        }

        setConfirmation({
          email: studentEmail,
          expiresAt: result.expiresAt,
          link: tokenUrl,
        })
      } else {
        // Demo mode: show mock confirmation
        setConfirmation({
          email: studentEmail || 'student@voorbeeld.be',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          link: `${window.location.origin}/inspection/student/demo-token`,
        })
      }
    } catch (err) {
      console.error('Token aanmaken mislukt:', err)
      setSendError(err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCopyLink() {
    if (!confirmation) return
    try {
      await navigator.clipboard.writeText(confirmation.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: do nothing
    }
  }

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Laden...</div>
  }

  if (!contractId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm font-semibold text-slate-500">Geen contract geselecteerd.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-semibold text-accent hover:underline"
        >
          Terug naar dashboard
        </button>
      </div>
    )
  }

  // Confirmation screen
  if (confirmation) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600"
          >
            <ArrowLeft size={15} />
            Dashboard
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl border border-white/70 bg-white/45 p-5 backdrop-blur-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check size={24} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Link verstuurd</h1>
            <p className="mt-2 text-sm font-medium text-slate-600">
              De student ontvangt een e-mail met de link om de plaatsbeschrijving in te vullen.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Student e-mail</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{confirmation.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Geldig tot</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {new Date(confirmation.expiresAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Link</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate rounded-lg border border-white/80 bg-white/60 px-3 py-2 text-xs font-medium text-slate-600">
                    {confirmation.link}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      copied
                        ? 'border-green-300 bg-green-50 text-green-600'
                        : 'border-white/80 bg-white/60 text-slate-500 hover:bg-white/80',
                    )}
                    aria-label="Link kopieren"
                  >
                    {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-primary flex w-full items-center justify-center py-3 text-sm"
          >
            Terug naar dashboard
          </button>
        </div>
      </div>
    )
  }

  // Meter entry form
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Plaatsbeschrijving delegeren
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Meterstanden & sleutels</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Vul de meterstanden en het aantal sleutels in. De student vult daarna de rest van de plaatsbeschrijving in.
            </p>
            {studentName && (
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Student: {studentName} — Kamer {roomNumber}
              </p>
            )}
          </div>

          {meterItems.map(({ category, item }) => {
            const key = itemKey(category.id, item.name)
            const state = itemStates[key]

            return (
              <div
                key={key}
                className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl"
              >
                <p className="text-sm font-bold text-slate-900">{item.name}</p>

                {item.type === 'count' ? (
                  <div className="mt-3 flex items-center justify-center gap-4 rounded-xl border border-white/80 bg-white/60 py-2">
                    <button
                      type="button"
                      aria-label={`Aantal ${item.name.toLowerCase()} verminderen`}
                      disabled={(state.keyCount ?? 0) <= 0}
                      onClick={() =>
                        updateItem(category.id, item.name, { keyCount: Math.max(0, (state.keyCount ?? 0) - 1) })
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
                      onClick={() => updateItem(category.id, item.name, { keyCount: (state.keyCount ?? 0) + 1 })}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/90 bg-white/70 text-slate-600"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      aria-label={`Meterstand voor ${item.name}`}
                      value={state.meterValue ?? ''}
                      onChange={event => {
                        const raw = event.target.value
                        updateItem(category.id, item.name, { meterValue: raw === '' ? null : Number(raw) })
                      }}
                      className="w-full rounded-lg border border-white/90 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="shrink-0 text-sm font-bold text-slate-500">{item.unit}</span>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        {sendError && (
          <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {sendError}
          </div>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={!allItemsFilled() || isSending}
          className={cn(
            'btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm transition-opacity',
            (!allItemsFilled() || isSending) && 'cursor-not-allowed opacity-50',
          )}
        >
          {isSending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt verstuurd...
            </>
          ) : (
            'Verstuur naar student'
          )}
        </button>
      </div>
    </div>
  )
}
