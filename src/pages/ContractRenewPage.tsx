import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Send } from 'lucide-react'
import StepIndicator from './wizard/StepIndicator'
import { createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, nextSchoolYear } from '../lib/data'
import { cn } from '../lib/cn'
import type { Contract, Property, Room, Student } from '../types'

interface RenewForm {
  roomId: string
  monthlyRent: string
  fixedCosts: string
  studentTax: string
}

const STEPS = ['Gegevens', 'Overzicht']

export default function ContractRenewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<{
    contract: Contract
    room: Room
    student: Student
    property: Property
  } | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [step, setStep] = useState<1 | 2>(1)
  const [isSending, setIsSending] = useState(false)
  const [form, setForm] = useState<RenewForm>({
    roomId: '',
    monthlyRent: '',
    fixedCosts: '',
    studentTax: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadContract() {
      setLoading(true)
      setError(null)
      try {
        const nextBundle = await getContractBundleData(id)
        if (cancelled) return
        setBundle(nextBundle)
        if (nextBundle) {
          const upcomingSchoolYear = nextSchoolYear(nextBundle.contract.schoolYear)
          const rooms = await getAvailableRoomsForRenewal(nextBundle.property.id, upcomingSchoolYear, nextBundle.contract.id)
          if (cancelled) return
          setAvailableRooms(rooms)
          const defaultRoom = rooms.find(room => room.id === nextBundle.room.id) ?? rooms[0]
          setForm({
            roomId: defaultRoom?.id ?? '',
            monthlyRent: String(defaultRoom?.monthlyRent ?? nextBundle.room.monthlyRent),
            fixedCosts: String(defaultRoom?.fixedCosts ?? nextBundle.room.fixedCosts),
            studentTax: String(defaultRoom?.studentTax ?? nextBundle.room.studentTax),
          })
        }
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

  const { contract, room, student, property } = bundle
  const upcomingSchoolYear = nextSchoolYear(contract.schoolYear)
  const selectedRoom = availableRooms.find(availableRoom => availableRoom.id === form.roomId)

  function updateField<K extends keyof RenewForm>(field: K, value: RenewForm[K]) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleRoomChange(roomId: string) {
    const selected = availableRooms.find(availableRoom => availableRoom.id === roomId)
    if (!selected) return
    setForm({
      roomId: selected.id,
      monthlyRent: String(selected.monthlyRent),
      fixedCosts: String(selected.fixedCosts),
      studentTax: String(selected.studentTax),
    })
  }

  function canProceed() {
    return Boolean(form.roomId && form.monthlyRent && form.fixedCosts && form.studentTax)
  }

  async function handleNext() {
    if (!canProceed()) return
    if (step === 1) {
      setStep(2)
      return
    }

    setIsSending(true)
    try {
      const newContractId = await createContractRenewal({
        previousContractId: contract.id,
        roomId: form.roomId,
        schoolYear: upcomingSchoolYear,
        monthlyRent: Number(form.monthlyRent),
        fixedCosts: Number(form.fixedCosts),
        studentTax: Number(form.studentTax),
      })
      if (newContractId) {
        navigate(`/contracts/${newContractId}`, { state: { savedDraft: true } })
      } else {
        window.setTimeout(() => navigate('/'), 1200)
      }
    } catch (err) {
      setIsSending(false)
      setError(err instanceof Error ? err.message : 'Verlenging opslaan mislukt')
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b border-white/65 bg-white/38 backdrop-blur-xl">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contract verlengen</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {student.firstName} {student.lastName}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Kamer {room.roomNumber}, {property.name}
              </p>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Alleen verlenggegevens zijn bewerkbaar
              </p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <ReadonlyField label="Student" value={`${student.firstName} ${student.lastName}`} />
                  <ReadonlyField label="Huidig schooljaar" value={contract.schoolYear} />
                </div>
                <ReadonlyField label="Nieuw schooljaar" value={upcomingSchoolYear} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
              <div className="grid gap-3">
                {availableRooms.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                    Geen beschikbare kamers voor het volgende schooljaar.
                  </p>
                ) : (
                  <label className="grid gap-1">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Kamer</span>
                    <select
                      aria-label="Kamer"
                      value={form.roomId}
                      onChange={event => handleRoomChange(event.target.value)}
                      className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {availableRooms.map(availableRoom => (
                        <option key={availableRoom.id} value={availableRoom.id}>
                          Kamer {availableRoom.roomNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <MoneyField
                    label="Huurprijs"
                    value={form.monthlyRent}
                    onChange={value => updateField('monthlyRent', value)}
                  />
                  <MoneyField
                    label="Vaste kosten"
                    value={form.fixedCosts}
                    onChange={value => updateField('fixedCosts', value)}
                  />
                  <MoneyField
                    label="Studentenbelasting"
                    value={form.studentTax}
                    onChange={value => updateField('studentTax', value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overzicht</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Nieuwe verlenging</h1>
            </div>

            <SummaryCard
              rows={[
                ['Student', `${student.firstName} ${student.lastName}`],
                ['Pand', property.name],
                ['Kamer', selectedRoom?.roomNumber ?? room.roomNumber],
                ['Schooljaar', upcomingSchoolYear],
                ['Huurprijs', `€ ${form.monthlyRent}/maand`],
                ['Vaste kosten', `€ ${form.fixedCosts}/maand`],
                ['Studentenbelasting', `€ ${form.studentTax}/maand`],
              ]}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 border-t border-white/65 bg-white/38 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Terug"
          onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
          disabled={isSending}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/90 bg-white/60 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={15} />
          Terug
        </button>
        <button
          type="button"
          aria-label={step === 2 ? 'Verlenging versturen' : 'Volgende'}
          onClick={handleNext}
          disabled={!canProceed() || isSending}
          className={cn(
            'btn-primary flex flex-[2] items-center justify-center gap-2 py-3 text-sm transition-opacity',
            (!canProceed() || isSending) && 'cursor-not-allowed opacity-50',
          )}
        >
          {isSending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Wordt verstuurd...
            </>
          ) : step === 2 ? (
            <>
              Verlenging versturen
              <Send size={15} />
            </>
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/45 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        aria-label={label}
        type="number"
        min="0"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  )
}

function SummaryCard({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 border-b border-slate-100/70 py-2 last:border-0">
          <span className="text-xs font-semibold text-slate-400">{label}</span>
          <span className="text-right text-sm font-bold text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  )
}
