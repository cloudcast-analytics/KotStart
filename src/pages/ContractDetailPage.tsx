import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building2, CalendarPlus, Check, ClipboardList, Download, Home, User } from 'lucide-react'
import { getContractBundleData, sendContractEmail, updateContractStatus } from '../lib/data'
import { cn } from '../lib/cn'
import type { Contract, Inspection, InspectionItem, LandlordProfile, Property, Room, Student } from '../types'
import { generateContractHtml, printContractDocument } from '../lib/pdfDocuments'
import SignatureModal from '../components/SignatureModal'

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
    startInspection?: Inspection
    startInspectionItems?: InspectionItem[]
    endInspection?: Inspection
    landlord?: LandlordProfile
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>(undefined)
  const [_signStatus, setSignStatus] = useState<'idle' | 'signing' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

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
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-8 text-sm font-semibold text-slate-500">Contract laden...</div>
  }

  if (error) {
    return <div className="p-8 text-sm font-semibold text-red-600">{error}</div>
  }

  if (!bundle) return <Navigate to="/" replace />

  const { contract, room, student, property, startInspection, startInspectionItems, endInspection, landlord } = bundle

  const startDone = !!startInspection
  const signedDone = contract.status === 'signed' || contract.status === 'sent'
  const sentDone = contract.status === 'sent'

  async function handleSignatureConfirm(sig: string) {
    setShowSignatureModal(false)
    setSignStatus('signing')
    try {
      await updateContractStatus(contract.id, 'signed')
      setSignatureDataUrl(sig)
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, status: 'signed' } } : null)
      setSignStatus('idle')
    } catch (err) {
      setSignStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Ondertekenen mislukt.')
    }
  }

  async function handleSend() {
    if (!student.email) {
      setSendStatus('error')
      setStatusMessage('Geen e-mailadres gevonden voor deze student.')
      return
    }
    setSendStatus('sending')
    setStatusMessage('Contract wordt verstuurd...')
    try {
      const html = generateContractHtml({
        contract,
        room,
        student,
        property,
        inspection: startInspection,
        inspectionItems: startInspectionItems,
        landlord,
        signatureDataUrl,
      })
      await sendContractEmail(student.email, `${student.firstName} ${student.lastName}`, html)
      await updateContractStatus(contract.id, 'sent')
      setBundle(prev => prev ? { ...prev, contract: { ...prev.contract, status: 'sent' } } : null)
      setSendStatus('sent')
      setStatusMessage(`Contract is verstuurd naar ${student.email}.`)
    } catch (err) {
      setSendStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Contract kon niet verstuurd worden.')
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
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Kamer {room.roomNumber}, {property.name}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton
                label="Verlengen"
                icon={CalendarPlus}
                onClick={() => navigate(`/contracts/${contract.id}/renew`)}
              />
              <ActionButton
                label="PDF maken"
                icon={Download}
                onClick={() => printContractDocument({
                  contract,
                  room,
                  student,
                  property,
                  inspection: startInspection,
                  inspectionItems: startInspectionItems,
                  landlord,
                })}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2">
              <Home size={16} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Voortgang</h2>
            </div>
            <div className="flex flex-col gap-2">
              <ProgressRow
                label="Contract aangemaakt"
                done={true}
                date={contract.createdAt}
              />
              <ProgressRow
                label="Startplaatsbeschrijving"
                done={startDone}
                date={startInspection?.createdAt}
                primaryAction={startDone ? undefined : () => navigate('/inspections/new', { state: { contractId: contract.id, type: 'start' } })}
                primaryLabel={startDone ? undefined : 'Starten'}
                secondaryAction={startDone && startInspection ? () => navigate(`/inspections/${startInspection.id}`) : undefined}
                secondaryLabel={startDone ? 'Bekijken →' : undefined}
              />
              <ProgressRow
                label="Handtekening verhuurder"
                done={signedDone}
                blocked={!startDone}
                primaryAction={!signedDone && startDone ? () => setShowSignatureModal(true) : undefined}
                primaryLabel={!signedDone && startDone ? 'Ondertekenen' : undefined}
              />
              <ProgressRow
                label="Versturen naar student"
                done={sentDone}
                blocked={!signedDone}
                primaryAction={signedDone && !sentDone ? handleSend : undefined}
                primaryLabel={signedDone && !sentDone ? (sendStatus === 'sending' ? 'Versturen...' : 'Versturen') : undefined}
              />
            </div>
            {statusMessage && (
              <div
                role="status"
                className={cn(
                  'mt-3 rounded-xl border px-3 py-2 text-sm font-semibold',
                  sendStatus === 'sent'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : sendStatus === 'sending'
                      ? 'border-slate-200 bg-white/65 text-slate-600'
                      : 'border-red-200 bg-red-50 text-red-700',
                )}
              >
                {statusMessage}
              </div>
            )}
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
            <InspectionRow
              label="Eindplaatsbeschrijving"
              inspection={endInspection}
              onStart={() => navigate('/inspections/new', { state: { contractId: contract.id, type: 'end' } })}
              onView={() => { if (endInspection) navigate(`/inspections/${endInspection.id}`) }}
            />
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

function ProgressRow({
  label,
  done,
  blocked,
  date,
  primaryAction,
  primaryLabel,
  secondaryAction,
  secondaryLabel,
}: {
  label: string
  done: boolean
  blocked?: boolean
  date?: string
  primaryAction?: () => void
  primaryLabel?: string
  secondaryAction?: () => void
  secondaryLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100/70 bg-white/40 px-4 py-3">
      <div className="flex items-center gap-3">
        {done ? (
          <Check size={15} className="shrink-0 text-green-500" />
        ) : (
          <div className={cn('h-4 w-4 shrink-0 rounded-full border-2', blocked ? 'border-slate-200' : 'border-accent')} />
        )}
        <div>
          <p className={cn('text-sm font-bold', blocked && !done ? 'text-slate-400' : 'text-slate-800')}>{label}</p>
          {done && date && (
            <p className="text-xs text-slate-500">
              {new Date(date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {!done && blocked && <p className="text-xs text-slate-400">Wacht op vorige stap</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {secondaryAction && secondaryLabel && (
          <button
            type="button"
            onClick={secondaryAction}
            className="glass-chip rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            {secondaryLabel}
          </button>
        )}
        {primaryAction && primaryLabel && (
          <button type="button" onClick={primaryAction} className="btn-primary px-3 py-1.5 text-xs">
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
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

function InspectionRow({
  label,
  inspection,
  onStart,
  onView,
}: {
  label: string
  inspection?: { id: string; createdAt: string }
  onStart: () => void
  onView: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100/70 bg-white/40 px-4 py-3">
      <div className="flex items-center gap-3">
        {inspection ? (
          <Check size={15} className="shrink-0 text-green-500" />
        ) : (
          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
        )}
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {inspection ? (
            <p className="text-xs text-slate-500">
              {new Date(inspection.createdAt).toLocaleDateString('nl-BE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Nog niet gedaan</p>
          )}
        </div>
      </div>
      {inspection ? (
        <button
          type="button"
          onClick={onView}
          className="glass-chip rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700"
        >
          Bekijken →
        </button>
      ) : (
        <button type="button" onClick={onStart} className="btn-primary px-3 py-1.5 text-xs">
          Starten
        </button>
      )}
    </div>
  )
}
