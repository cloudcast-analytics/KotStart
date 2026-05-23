import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarPlus, Check, CheckCircle, ClipboardList, Download, FileText, Home, Loader2, PenLine, User, XCircle } from 'lucide-react'
import { getContractBundleData, sendContractEmail } from '../lib/data'
import { cn } from '../lib/cn'
import type { Contract, Inspection, InspectionItem, LandlordProfile, Property, Room, Student } from '../types'
import { generateContractHtml, printContractDocument } from '../lib/pdfDocuments'
import SignatureModal from '../components/SignatureModal'

const STATUS_LABEL: Record<Contract['status'], string> = {
  draft: 'Concept',
  sent: 'Verstuurd',
  signed: 'Ondertekend',
}

const STATUS_STEPS: Array<{ status: Contract['status']; label: string }> = [
  { status: 'draft', label: 'Concept' },
  { status: 'sent', label: 'Verstuurd' },
  { status: 'signed', label: 'Ondertekend' },
]

const ROOM_TYPE_LABEL = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

export default function ContractDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<{
    contract: Contract
    room: Room
    student: Student
    property: Property
    inspection?: Inspection
    inspectionItems?: InspectionItem[]
    landlord?: LandlordProfile
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadContract() {
      setLoading(true)
      setError(null)
      try {
        const nextBundle = await getContractBundleData(id)
        if (!cancelled) setBundle(nextBundle)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Contract kon niet geladen worden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContract()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Contract laden...</div>
  }

  if (error) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error}</div>
  }

  if (!bundle) return <Navigate to="/" replace />

  const { contract, room, student, property, inspection, inspectionItems, landlord } = bundle
  const activeStatusIndex = STATUS_STEPS.findIndex(step => step.status === contract.status)

  async function handleSignatureConfirm(signatureDataUrl: string) {
    setShowSignatureModal(false)
    setEmailStatus('sending')
    try {
      const html = generateContractHtml({ contract, room, student, property, inspection, inspectionItems, landlord, signatureDataUrl })
      await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html)
      setEmailStatus('sent')
      setTimeout(() => setEmailStatus('idle'), 4000)
    } catch {
      setEmailStatus('error')
      setTimeout(() => setEmailStatus('idle'), 4000)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-bold text-accent"
        >
          Contracten
        </button>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <section className="glass rounded-2xl p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt="Student" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <User size={26} className="text-accent" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {STATUS_LABEL[contract.status]}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Kamer {room.roomNumber}, {property.name}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ActionButton label="Verlengen" icon={CalendarPlus} onClick={() => navigate(`/contracts/${contract.id}/renew`)} />
              <ActionButton label="Startplaatsbeschrijving" icon={ClipboardList} onClick={() => navigate('/inspections/new', { state: { contractId: contract.id, type: 'start' } })} />
              <ActionButton label="PDF maken" icon={Download} onClick={() => printContractDocument({ contract, room, student, property, inspection, inspectionItems, landlord })} />
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                disabled={emailStatus === 'sending'}
                className="glass-chip flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                {emailStatus === 'sending' && <Loader2 size={16} className="animate-spin text-accent" />}
                {emailStatus === 'sent' && <CheckCircle size={16} className="text-green-500" />}
                {emailStatus === 'error' && <XCircle size={16} className="text-red-500" />}
                {emailStatus === 'idle' && <PenLine size={16} className="text-accent" />}
                {emailStatus === 'sending' ? 'Versturen...' : emailStatus === 'sent' ? 'Verstuurd!' : emailStatus === 'error' ? 'Fout' : 'Ondertekenen'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={16} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Status</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_STEPS.map((step, index) => {
                const isDone = index <= activeStatusIndex
                return (
                  <div key={step.status} className="flex flex-col items-center text-center">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold',
                        isDone ? 'border-accent bg-accent text-white' : 'border-slate-200 bg-slate-100 text-slate-400',
                      )}
                    >
                      {isDone ? <Check size={15} /> : index + 1}
                    </div>
                    <p className={cn('mt-2 text-xs font-bold', isDone ? 'text-accent' : 'text-slate-400')}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <InfoCard
              icon={Building2}
              title="Kamer"
              rows={[
                ['Pand', property.name],
                ['Adres', property.address],
                ['Kamer', room.roomNumber],
                ['Type', ROOM_TYPE_LABEL[room.roomType]],
              ]}
            />
            <InfoCard
              icon={Home}
              title="Contract"
              rows={[
                ['Schooljaar', contract.schoolYear],
                ['Huurprijs', `€ ${room.monthlyRent}/maand`],
                ['Vaste kosten', `€ ${room.fixedCosts}/maand`],
                ['Studentenbelasting', `€ ${room.studentTax}/maand`],
                ['Waarborg', `€ ${room.deposit}`],
              ]}
            />
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Inspectiepaspoort</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Koppel start- en eindplaatsbeschrijvingen aan dit contract zodra ze afgerond zijn.
            </p>
            <button
              type="button"
              onClick={() => navigate('/inspections/new', { state: { contractId: contract.id, type: 'start' } })}
              className="btn-primary mt-4 px-4 py-3 text-sm"
            >
              Nieuwe plaatsbeschrijving
            </button>
          </section>
        </div>
      </main>

      {showSignatureModal && (
        <SignatureModal
          onConfirm={handleSignatureConfirm}
          onClose={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ElementType
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-chip flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
    >
      <Icon size={16} className="text-accent" />
      {label}
    </button>
  )
}

function InfoCard({
  icon: Icon,
  title,
  rows,
}: {
  icon: React.ElementType
  title: string
  rows: Array<[string, string]>
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-accent" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-slate-100/70 py-2 last:border-0">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <span className="text-right text-sm font-bold text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  )
}
