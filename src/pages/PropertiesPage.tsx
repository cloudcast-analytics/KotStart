import { useEffect, useMemo, useState } from 'react'
import { Building2, ChevronLeft, DoorOpen, Edit3, FileText, Home, MapPin, User, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { CONTRACTS, PROPERTIES, ROOMS, SCHOOL_YEARS, STUDENTS } from '../lib/mockData'
import { getContracts, getProperties, getRooms, getStudents, updateRoomData } from '../lib/data'
import type { Contract, Property, Room, Student } from '../types'

const ROOM_TYPE_LABEL: Record<Room['roomType'], string> = {
  studio: 'Studio',
  single: 'Enkel',
  double: 'Dubbel',
}

const CONTRACT_STATUS_LABEL: Record<Contract['status'], string> = {
  draft: 'Concept',
  sent: 'Verstuurd',
  signed: 'Ondertekend',
}

interface EditableRoom {
  roomNumber: string
  roomType: Room['roomType']
  monthlyRent: string
  fixedCosts: string
  studentTax: string
  deposit: string
}

function toEditableRoom(room: Room): EditableRoom {
  return {
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    monthlyRent: String(room.monthlyRent),
    fixedCosts: String(room.fixedCosts),
    studentTax: String(room.studentTax),
    deposit: String(room.deposit),
  }
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function RoomEditModal({
  room,
  onClose,
  onSave,
}: {
  room: Room
  onClose: () => void
  onSave: (room: Room) => void
}) {
  const [form, setForm] = useState(() => toEditableRoom(room))

  function updateField<K extends keyof EditableRoom>(field: K, value: EditableRoom[K]) {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  function handleSave() {
    onSave({
      ...room,
      roomNumber: form.roomNumber.trim() || room.roomNumber,
      roomType: form.roomType,
      monthlyRent: toNumber(form.monthlyRent),
      fixedCosts: toNumber(form.fixedCosts),
      studentTax: toNumber(form.studentTax),
      deposit: toNumber(form.deposit),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/25 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full rounded-t-3xl border border-white/80 bg-white/80 p-4 shadow-2xl backdrop-blur-3xl sm:max-w-md sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kamer bewerken</p>
            <h2 className="text-xl font-bold text-slate-900">Kamer {room.roomNumber}</h2>
          </div>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={onClose}
            className="glass-chip flex h-9 w-9 items-center justify-center rounded-xl"
          >
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Kamernummer</span>
            <input
              aria-label="Kamernummer"
              value={form.roomNumber}
              onChange={event => updateField('roomNumber', event.target.value)}
              className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Type</span>
            <select
              aria-label="Kamertype"
              value={form.roomType}
              onChange={event => updateField('roomType', event.target.value as Room['roomType'])}
              className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="single">Enkel</option>
              <option value="studio">Studio</option>
              <option value="double">Dubbel</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['monthlyRent', 'Huurprijs'],
              ['fixedCosts', 'Vaste kosten'],
              ['studentTax', 'Studentenbelasting'],
              ['deposit', 'Waarborg'],
            ].map(([field, label]) => (
              <label key={field} className="grid gap-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <input
                  aria-label={label}
                  type="number"
                  min="0"
                  value={form[field as keyof EditableRoom]}
                  onChange={event => updateField(field as keyof EditableRoom, event.target.value)}
                  className="rounded-xl border border-white/90 bg-white/65 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/90 bg-white/60 py-3 text-sm font-bold text-slate-600"
          >
            Annuleren
          </button>
          <button type="button" onClick={handleSave} className="btn-primary flex-[2] py-3 text-sm">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}

const DISABLED = true as boolean

export default function PropertiesPage() {
  const navigate = useNavigate()
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [properties, setProperties] = useState<Property[]>(PROPERTIES)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>(ROOMS)
  const [contracts, setContracts] = useState<Contract[]>(CONTRACTS)
  const [students, setStudents] = useState<Student[]>(STUDENTS)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedProperty = selectedPropertyId
    ? properties.find(property => property.id === selectedPropertyId) ?? null
    : null

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [nextProperties, nextRooms, nextContracts, nextStudents] = await Promise.all([
          getProperties(),
          getRooms(),
          getContracts(),
          getStudents(),
        ])
        if (cancelled) return
        setProperties(nextProperties)
        setRooms(nextRooms)
        setContracts(nextContracts)
        setStudents(nextStudents)
        if (!nextProperties.some(property => property.id === propertyId)) {
          setPropertyId(nextProperties[0]?.id ?? PROPERTIES[0].id)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Panden konden niet geladen worden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const selectedRooms = useMemo(
    () => rooms.filter(room => room.propertyId === selectedPropertyId).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)),
    [rooms, selectedPropertyId],
  )

  function getRoomOccupancy(room: Room) {
    const contract = contracts.find(item => item.roomId === room.id && item.schoolYear === schoolYear)
    if (!contract) return null

    const primaryStudent = students.find(student => student.id === contract.studentId)
    const secondStudent = contract.secondStudentId
      ? students.find(student => student.id === contract.secondStudentId)
      : null

    const studentNames = [primaryStudent, secondStudent]
      .filter((student): student is Student => Boolean(student))
      .map(student => `${student.firstName} ${student.lastName}`)

    return {
      contract,
      studentName: studentNames.join(' & ') || 'Student onbekend',
    }
  }

  async function handleSaveRoom(updatedRoom: Room) {
    try {
      const savedRoom = await updateRoomData(updatedRoom)
      setRooms(previous => previous.map(room => (room.id === savedRoom.id ? savedRoom : room)))
      setEditingRoom(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kamer kon niet opgeslagen worden')
    }
  }

  if (DISABLED) {
    return (
      <div className="p-8 text-slate-600">
        <h1 className="text-2xl font-bold">Panden</h1>
        <p className="mt-2 text-sm">Komt later.</p>
      </div>
    )
  }

  return (
    <AppShell
      schoolYear={schoolYear}
      propertyId={propertyId}
      onSchoolYearChange={setSchoolYear}
      onPropertyChange={setPropertyId}
      properties={properties}
      schoolYears={SCHOOL_YEARS}
      showPropertyFilter={false}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200/45 bg-white/22 px-4 py-3">
          {selectedProperty ? (
            <button
              type="button"
              onClick={() => setSelectedPropertyId(null)}
              className="inline-flex items-center gap-2 text-sm font-bold text-accent"
            >
              <ChevronLeft size={16} />
              Panden
            </button>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Beheer</p>
              <h1 className="text-2xl font-bold text-slate-900">Panden</h1>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && <div className="text-sm font-semibold text-slate-500">Panden laden...</div>}
          {error && <div className="mb-3 text-sm font-semibold text-red-600">{error}</div>}

          {!loading && !selectedProperty && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {properties.map((property: Property) => {
                const propertyRooms = rooms.filter(room => room.propertyId === property.id)
                const occupiedRooms = propertyRooms.filter(room =>
                  contracts.some(contract => contract.roomId === room.id && contract.schoolYear === schoolYear),
                )

                return (
                  <button
                    key={property.id}
                    type="button"
                    aria-label={`Open ${property.name}`}
                    onClick={() => setSelectedPropertyId(property.id)}
                    className="glass rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <Building2 size={18} className="text-accent" />
                      </div>
                      <span className="rounded-full border border-white/80 bg-white/60 px-2.5 py-1 text-xs font-bold text-slate-500">
                        {propertyRooms.length} kamers
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{property.name}</h2>
                    <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-slate-500">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      {property.address}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-white/45 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bezet</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{occupiedRooms.length}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50/80 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Vrij</p>
                        <p className="mt-1 text-sm font-bold text-emerald-700">
                          {propertyRooms.length - occupiedRooms.length}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && selectedProperty && (
            <div className="flex flex-col gap-4">
              <div className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Home size={18} className="text-accent" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">{selectedProperty.name}</h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">{selectedProperty.address}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {selectedRooms.map(room => {
                  const occupancy = getRoomOccupancy(room)

                  return (
                    <div key={room.id} className="rounded-2xl border border-white/70 bg-white/45 p-4 backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                            <DoorOpen size={16} className="text-slate-500" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-bold text-slate-900">Kamer {room.roomNumber}</h2>
                              {occupancy ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                  {CONTRACT_STATUS_LABEL[occupancy.contract.status]}
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                  Vrij
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-500">{ROOM_TYPE_LABEL[room.roomType]}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Kamer ${room.roomNumber} bewerken`}
                          onClick={() => setEditingRoom(room)}
                          className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        >
                          <Edit3 size={15} className="text-slate-500" />
                        </button>
                      </div>

                      <div className="mt-4 rounded-xl bg-white/45 p-3">
                        {occupancy ? (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <User size={15} className="shrink-0 text-accent" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Naam</p>
                                <p className="truncate text-sm font-bold text-slate-900">{occupancy.studentName}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/contracts/${occupancy.contract.id}`)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-accent"
                            >
                              <FileText size={14} />
                              Koppeling openen
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                            <DoorOpen size={16} />
                            Deze kamer is vrij in {schoolYear}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ['Huurprijs', `€ ${room.monthlyRent}/maand`],
                          ['Vaste kosten', `€ ${room.fixedCosts}/maand`],
                          ['Studentenbelasting', `€ ${room.studentTax}/maand`],
                          ['Waarborg', `€ ${room.deposit}`],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl bg-white/45 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                        </div>
            </div>
          )}
        </div>
      </div>

      {editingRoom && (
        <RoomEditModal room={editingRoom} onClose={() => setEditingRoom(null)} onSave={handleSaveRoom} />
      )}
    </AppShell>
  )
}
