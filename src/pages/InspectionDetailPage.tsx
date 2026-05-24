import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, Download } from 'lucide-react'
import { getInspectionData } from '../lib/data'
import { printInspectionDocument } from '../lib/pdfDocuments'
import { cn } from '../lib/cn'
import type { Inspection, InspectionItem } from '../types'

const CONDITION_LABEL: Record<InspectionItem['condition'], string> = {
  good: 'Goed',
  moderate: 'Matig',
  bad: 'Slecht',
  unusable: 'Onbruikbaar',
}

const CONDITION_COLOR: Record<InspectionItem['condition'], string> = {
  good: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  bad: 'bg-orange-100 text-orange-700',
  unusable: 'bg-red-100 text-red-700',
}

export default function InspectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [items, setItems] = useState<InspectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getInspectionData(id)
        if (!cancelled) {
          if (data) {
            setInspection(data.inspection)
            setItems(data.items)
          } else {
            setError('Inspectie niet gevonden')
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kon inspectie niet laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Inspectie laden...</div>
  }

  if (error || !inspection) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error ?? 'Inspectie niet gevonden'}</div>
  }

  const grouped = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {})

  const typeLabel = inspection.type === 'start' ? 'Startplaatsbeschrijving' : 'Eindplaatsbeschrijving'
  const dateLabel = new Date(inspection.createdAt).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate(`/contracts/${inspection.contractId}`)}
          className="text-sm font-bold text-accent"
        >
          ← Contract
        </button>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <section className="glass rounded-2xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ClipboardList size={18} className="text-accent" />
                  <h1 className="text-xl font-bold text-slate-900">{typeLabel}</h1>
                </div>
                <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  printInspectionDocument({
                    title: typeLabel,
                    type: inspection.type,
                    overviewPhotoUrl: inspection.overviewPhotoUrl ?? null,
                    items: items.map(item => ({
                      category: item.category,
                      itemName: item.itemName,
                      condition: item.condition,
                      photoUrl: item.photoUrl ?? null,
                    })),
                  })
                }
                className="glass-chip flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
              >
                <Download size={15} className="text-accent" />
                PDF
              </button>
            </div>

            {inspection.overviewPhotoUrl && (
              <img
                src={inspection.overviewPhotoUrl}
                alt="Overzichtsfoto"
                className="mt-4 h-48 w-full rounded-xl object-cover"
              />
            )}
          </section>

          {Object.entries(grouped).map(([category, categoryItems]) => (
            <section key={category} className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{category}</h2>
              <div className="flex flex-col gap-2">
                {categoryItems.map(item => (
                  <div key={item.id} className="rounded-xl border border-slate-100/70 bg-white/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{item.itemName}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', CONDITION_COLOR[item.condition])}>
                        {CONDITION_LABEL[item.condition]}
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
                ))}
              </div>
            </section>
          ))}

          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Geen inspectiepunten gevonden.</p>
          )}
        </div>
      </main>
    </div>
  )
}
