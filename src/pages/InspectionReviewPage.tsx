import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { getInspectionTokenForContract, getContractBundleData, approveInspectionToken, rejectInspectionToken } from '../lib/data'
import { cn } from '../lib/cn'
import type { InspectionToken } from '../types'

interface StudentItem {
  category: string
  itemName: string
  condition: string
  photoUrl?: string
}

interface LandlordItem {
  category: string
  itemName: string
  meterValue?: number
  meterUnit?: string
  keyCount?: number
}

type Condition = 'good' | 'moderate' | 'bad' | 'unusable'

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

function landlordItemBadge(item: LandlordItem): { label: string; colorClass: string } {
  if (item.meterValue != null) {
    return { label: `${item.meterValue} ${item.meterUnit ?? ''}`.trim(), colorClass: 'bg-blue-100 text-blue-700' }
  }
  if (item.keyCount != null) {
    return { label: `${item.keyCount} ${item.keyCount === 1 ? 'stuk' : 'stuks'}`, colorClass: 'bg-slate-100 text-slate-700' }
  }
  return { label: '', colorClass: '' }
}

export default function InspectionReviewPage() {
  const { contractId } = useParams()
  const navigate = useNavigate()
  const [token, setToken] = useState<InspectionToken | null>(null)
  const [studentName, setStudentName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tokenData, bundleData] = await Promise.all([
          getInspectionTokenForContract(contractId ?? ''),
          getContractBundleData(contractId),
        ])

        if (cancelled) return

        if (!tokenData) {
          setError('Geen ingediende inspectie gevonden voor dit contract')
          return
        }
        if (tokenData.status !== 'submitted') {
          setError('Deze inspectie is nog niet ingediend door de student')
          return
        }

        setToken(tokenData)

        if (bundleData) {
          setStudentName(`${bundleData.student.firstName} ${bundleData.student.lastName}`)
          setRoomNumber(bundleData.room.roomNumber)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kon inspectie niet laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [contractId])

  async function handleApprove() {
    if (!token || !contractId) return
    setSubmitting(true)
    try {
      await approveInspectionToken(token.id, contractId, 'start')
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Goedkeuring mislukt')
      setSubmitting(false)
    }
  }

  async function handleReject() {
    if (!token) return
    setSubmitting(true)
    try {
      await rejectInspectionToken(token.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Afwijzing mislukt')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Inspectie laden...</div>
  }

  if (error || !token) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error ?? 'Inspectie niet gevonden'}</div>
  }

  const studentItems = (token.studentItems as StudentItem[] | null) ?? []
  const landlordItems = (token.landlordItems as LandlordItem[] | null) ?? []
  const overviewPhotos = token.studentPhotoUrls ?? []

  const groupedStudentItems = studentItems.reduce<Record<string, StudentItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  const groupedLandlordItems = landlordItems.reduce<Record<string, LandlordItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate(`/contracts/${contractId}`)}
          className="text-sm font-bold text-accent"
        >
          &larr; Contract
        </button>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {/* Header */}
          <section className="rounded-xl border border-slate-200 bg-white/70 p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-accent" />
              <h1 className="text-xl font-bold text-slate-900">Inspectie beoordelen</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {studentName && `Ingediend door ${studentName}`}
              {roomNumber && ` — Kamer ${roomNumber}`}
            </p>
            {token.submittedAt && (
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date(token.submittedAt).toLocaleDateString('nl-BE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </section>

          {/* Overview Photos */}
          {overviewPhotos.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                Overzichtsfoto&apos;s
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {overviewPhotos.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Overzichtsfoto ${index + 1}`}
                    className="aspect-[4/3] w-full rounded-xl bg-slate-100 object-contain"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Student Items by Category */}
          {Object.entries(groupedStudentItems).map(([category, items]) => (
            <section key={category} className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{category}</h2>
              <div className="flex flex-col gap-2">
                {items.map((item, idx) => {
                  const condition = item.condition as Condition
                  const label = CONDITION_LABEL[condition] ?? item.condition
                  const colorClass = CONDITION_COLOR[condition] ?? 'bg-slate-100 text-slate-700'
                  return (
                    <div key={`${category}-${idx}`} className="rounded-xl border border-slate-100/70 bg-white/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                          {item.itemName}
                        </span>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', colorClass)}>
                          {label}
                        </span>
                      </div>
                      {item.photoUrl && (
                        <img
                          src={item.photoUrl}
                          alt={item.itemName}
                          className="mt-2 h-32 w-full rounded-lg bg-slate-100 object-contain"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {/* Landlord Items (meters + keys) */}
          {Object.keys(groupedLandlordItems).length > 0 && (
            <>
              {Object.entries(groupedLandlordItems).map(([category, items]) => (
                <section key={`landlord-${category}`} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{category}</h2>
                  <div className="flex flex-col gap-2">
                    {items.map((item, idx) => {
                      const badge = landlordItemBadge(item)
                      return (
                        <div key={`landlord-${category}-${idx}`} className="rounded-xl border border-slate-100/70 bg-white/40 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                              {item.itemName}
                            </span>
                            {badge.label && (
                              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', badge.colorClass)}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </>
          )}

          {studentItems.length === 0 && landlordItems.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Geen inspectiepunten gevonden.</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pb-4">
            <button
              type="button"
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Afwijzen
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Goedkeuren
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
