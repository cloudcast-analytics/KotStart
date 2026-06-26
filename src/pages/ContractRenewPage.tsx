import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, Info, Loader2, Send } from 'lucide-react'
import StepIndicator from './wizard/StepIndicator'
import { createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, getHealthIndex, getLatestHealthIndex, getPropertyIndexation, nextSchoolYear, updateStudentData } from '../lib/data'
import { calculateIndexedRentPure } from '../lib/indexation'
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
  const [indexationEnabled, setIndexationEnabled] = useState(false)
  const [indexationInfo, setIndexationInfo] = useState<{
    baseRent: number
    startIndex: number
    currentIndex: number
    indexedRent: number
  } | null>(null)
  const [showIndexInfo, setShowIndexInfo] = useState(false)
  const [showStudentEdit, setShowStudentEdit] = useState(false)
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  })

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
          setStudentForm({
            firstName: nextBundle.student.firstName,
            lastName: nextBundle.student.lastName,
            email: nextBundle.student.email,
            phone: nextBundle.student.phone,
            dateOfBirth: nextBundle.student.dateOfBirth,
          })
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

          const indexEnabled = await getPropertyIndexation(nextBundle.property.id)
          if (cancelled) return
          setIndexationEnabled(indexEnabled)

          if (indexEnabled && defaultRoom) {
            const baseRent = defaultRoom.baseRent ?? defaultRoom.monthlyRent
            const baseYear = defaultRoom.baseRentYear ?? 2024
            const targetYear = Number(upcomingSchoolYear.match(/^(\d{4})/)?.[1] ?? 2026)

            const startIndex = await getHealthIndex(baseYear, 8)
            let currentIndex = await getHealthIndex(targetYear, 8)
            if (!currentIndex) {
              const latest = await getLatestHealthIndex()
              if (latest) currentIndex = latest.value
            }

            if (startIndex && currentIndex && !cancelled) {
              const indexedRent = calculateIndexedRentPure(baseRent, startIndex, currentIndex)
              setIndexationInfo({ baseRent, startIndex, currentIndex, indexedRent })
              setForm(prev => ({ ...prev, monthlyRent: String(indexedRent) }))
            }
          }
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

  async function handleRoomChange(roomId: string) {
    const selected = availableRooms.find(availableRoom => availableRoom.id === roomId)
    if (!selected) return
    setForm({
      roomId: selected.id,
      monthlyRent: String(selected.monthlyRent),
      fixedCosts: String(selected.fixedCosts),
      studentTax: String(selected.studentTax),
    })

    if (indexationEnabled) {
      const baseRent = selected.baseRent ?? selected.monthlyRent
      const baseYear = selected.baseRentYear ?? 2024
      const targetYear = Number(upcomingSchoolYear.match(/^(\d{4})/)?.[1] ?? 2026)
      const startIndex = await getHealthIndex(baseYear, 8)
      let currentIndex = await getHealthIndex(targetYear, 8)
      if (!currentIndex) {
        const latest = await getLatestHealthIndex()
        if (latest) currentIndex = latest.value
      }
      if (startIndex && currentIndex) {
        const indexedRent = calculateIndexedRentPure(baseRent, startIndex, currentIndex)
        setIndexationInfo({ baseRent, startIndex, currentIndex, indexedRent })
        setForm(prev => ({ ...prev, monthlyRent: String(indexedRent) }))
      } else {
        setIndexationInfo(null)
      }
    }
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
      const studentChanged =
        studentForm.firstName !== student.firstName ||
        studentForm.lastName !== student.lastName ||
        studentForm.email !== student.email ||
        studentForm.phone !== student.phone ||
        studentForm.dateOfBirth !== student.dateOfBirth
      if (studentChanged) {
        await updateStudentData(student.id, studentForm)
      }

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
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <ReadonlyField label="Huidig schooljaar" value={contract.schoolYear} />
                  <ReadonlyField label="Nieuw schooljaar" value={upcomingSchoolYear} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentEdit(!showStudentEdit)}
                  className="flex items-center gap-2 text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Studentgegevens</span>
                  <ChevronDown size={12} className={cn('text-slate-400 transition-transform', showStudentEdit && 'rotate-180')} />
                  <span className="ml-auto text-[10px] font-semibold text-accent">{showStudentEdit ? 'Inklappen' : 'Bewerken'}</span>
                </button>
                {showStudentEdit ? (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Voornaam</span>
                        <input
                          value={studentForm.firstName}
                          onChange={e => setStudentForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Achternaam</span>
                        <input
                          value={studentForm.lastName}
                          onChange={e => setStudentForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">E-mail</span>
                      <input
                        type="email"
                        value={studentForm.email}
                        onChange={e => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                        className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Telefoon</span>
                        <input
                          type="tel"
                          value={studentForm.phone}
                          onChange={e => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Geboortedatum</span>
                        <input
                          type="date"
                          value={studentForm.dateOfBirth}
                          onChange={e => setStudentForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <ReadonlyField label="Student" value={`${studentForm.firstName} ${studentForm.lastName}`} />
                )}
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

                {indexationInfo && showIndexInfo && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-slate-700">
                    <p className="font-semibold">
                      €{indexationInfo.baseRent} × ({indexationInfo.currentIndex} / {indexationInfo.startIndex}) = €{indexationInfo.indexedRent}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Aanvangsindex: aug {indexationInfo.startIndex} • Huidige index: aug {indexationInfo.currentIndex}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Huurprijs</span>
                      {indexationInfo && (
                        <>
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">Geïndexeerd</span>
                          <button
                            type="button"
                            onClick={() => setShowIndexInfo(!showIndexInfo)}
                            className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"
                          >
                            <Info size={8} />
                          </button>
                        </>
                      )}
                    </span>
                    <input
                      aria-label="Huurprijs"
                      type="number"
                      min="0"
                      value={form.monthlyRent}
                      onChange={event => updateField('monthlyRent', event.target.value)}
                      className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </label>
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
                ['Student', `${studentForm.firstName} ${studentForm.lastName}`],
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
