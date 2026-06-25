import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createContractDraft, getAvailableRoomsForNewContract, getHealthIndex, getLatestHealthIndex, getProperties, getPropertyIndexation, getSchoolYears } from '../lib/data'
import { calculateIndexedRentPure } from '../lib/indexation'
import { isValidBelgianPostalCode } from '../lib/residence'
import type { Room } from '../types'
import Step1Room from './wizard/Step1Room'
import Step2Student from './wizard/Step2Student'
import Step4Review from './wizard/Step4Review'
import WizardLayout from './wizard/WizardLayout'
import {
  isMinor,
  isValidDateOfBirth,
  isValidEmail,
  type StudentFormData,
} from './wizard/types'

const WIZARD_STEPS = ['Kamer', 'Student', 'Overzicht']

type WizardStep = 1 | 2 | 3

function emptyStudent(): StudentFormData {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    photoUrl: null,
    institution: '',
    faculty: '',
    studentNumber: '',
    residenceStreet: '',
    residenceNumber: '',
    residenceBox: '',
    residencePostalCode: '',
    residenceCity: '',
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '',
  }
}

function studentIsComplete(student: StudentFormData): boolean {
  const minor = isMinor(student.dateOfBirth)
  return Boolean(
    student.firstName.trim() &&
      student.lastName.trim() &&
      isValidEmail(student.email) &&
      isValidDateOfBirth(student.dateOfBirth) &&
      student.institution.trim() &&
      student.studentNumber.trim() &&
      student.residenceStreet.trim() &&
      student.residenceNumber.trim() &&
      isValidBelgianPostalCode(student.residencePostalCode) &&
      student.residenceCity.trim() &&
      (!minor || (student.guardianName?.trim() && isValidEmail(student.guardianEmail ?? ''))),
  )
}

export default function ContractNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navState = location.state as { propertyId?: string; schoolYear?: string } | null
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  const [isSending, setIsSending] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [propertyId, setPropertyId] = useState<string | null>(navState?.propertyId ?? null)
  const [schoolYear, setSchoolYear] = useState<string | null>(navState?.schoolYear ?? null)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indexedRent, setIndexedRent] = useState<number | null>(null)

  useEffect(() => {
    if (propertyId && schoolYear) return
    let cancelled = false

    async function resolveContext() {
      const [properties, schoolYears] = await Promise.all([getProperties(), getSchoolYears()])
      if (cancelled) return
      if (!propertyId) setPropertyId(properties[0]?.id ?? null)
      if (!schoolYear) setSchoolYear(schoolYears[schoolYears.length - 1] ?? null)
    }

    resolveContext()
    return () => { cancelled = true }
  }, [propertyId, schoolYear])

  useEffect(() => {
    const currentPropertyId = propertyId
    const currentSchoolYear = schoolYear
    if (!currentPropertyId || !currentSchoolYear) return
    let cancelled = false

    async function loadRooms(forPropertyId: string, forSchoolYear: string) {
      setLoadingRooms(true)
      setError(null)
      try {
        const nextRooms = await getAvailableRoomsForNewContract(forPropertyId, forSchoolYear)
        if (!cancelled) setRooms(nextRooms)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kamers konden niet geladen worden')
      } finally {
        if (!cancelled) setLoadingRooms(false)
      }
    }

    loadRooms(currentPropertyId, currentSchoolYear)
    return () => { cancelled = true }
  }, [propertyId, schoolYear])

  useEffect(() => {
    if (!selectedRoomId || !schoolYear || !propertyId) {
      setIndexedRent(null)
      return
    }

    let cancelled = false
    const room = rooms.find(r => r.id === selectedRoomId)
    if (!room) return

    async function calcIndexed() {
      const enabled = await getPropertyIndexation(propertyId!)
      if (cancelled || !enabled) { setIndexedRent(null); return }

      const baseRent = room!.baseRent ?? room!.monthlyRent
      const baseYear = room!.baseRentYear ?? new Date().getFullYear()
      const targetYear = Number(schoolYear!.match(/^(\d{4})/)?.[1] ?? new Date().getFullYear())

      const startIndex = await getHealthIndex(baseYear, 8)
      let currentIndex = await getHealthIndex(targetYear, 8)
      if (!currentIndex) {
        const latest = await getLatestHealthIndex()
        if (latest) currentIndex = latest.value
      }

      if (!cancelled && startIndex && currentIndex && startIndex !== currentIndex) {
        setIndexedRent(calculateIndexedRentPure(baseRent, startIndex, currentIndex))
      } else if (!cancelled) {
        setIndexedRent(null)
      }
    }

    calcIndexed()
    return () => { cancelled = true }
  }, [selectedRoomId, schoolYear, propertyId, rooms])

  const propertyRooms = useMemo(() => rooms, [rooms])
  const selectedRoom: Room | null = propertyRooms.find(room => room.id === selectedRoomId) ?? null
  const effectiveRoom = selectedRoom && indexedRent != null
    ? { ...selectedRoom, monthlyRent: indexedRent }
    : selectedRoom

  function handleRoomSelect(id: string) {
    setSelectedRoomId(id)

    const room = propertyRooms.find(item => item.id === id)
    setStudents(room?.roomType === 'double' ? [emptyStudent(), emptyStudent()] : [emptyStudent()])
  }

  function handleStudentChange(index: number, field: keyof StudentFormData, value: string | null) {
    setStudents(previous =>
      previous.map((student, studentIndex) =>
        studentIndex === index ? { ...student, [field]: value } : student,
      ),
    )
  }

  function canProceed(): boolean {
    if (loadingRooms || error) return false
    if (currentStep === 1) return selectedRoomId !== null
    if (currentStep === 2) return students.every(studentIsComplete)
    if (currentStep === 3) return Boolean(effectiveRoom)
    return Boolean(effectiveRoom)
  }

  async function handleNext() {
    if (!canProceed()) return

    if (currentStep < 3) {
      setCurrentStep(previous => (previous + 1) as WizardStep)
      return
    }

    if (!effectiveRoom || !schoolYear) return

    setIsSending(true)
    try {
      const contractId = await createContractDraft({
        roomId: effectiveRoom.id,
        schoolYear,
        students,
        monthlyRent: effectiveRoom.monthlyRent,
        fixedCosts: effectiveRoom.fixedCosts,
        studentTax: effectiveRoom.studentTax,
      })
      navigate(contractId ? `/contracts/${contractId}` : '/', { state: { savedDraft: true } })
    } catch (err) {
      console.error('Contract opslaan mislukt:', err)
      setError(err instanceof Error ? err.message : 'Contract opslaan mislukt')
      setIsSending(false)
    }
  }

  function handleBack() {
    if (currentStep === 1) {
      navigate(-1)
      return
    }

    setCurrentStep(previous => (previous - 1) as WizardStep)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <WizardLayout
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onBack={handleBack}
        onNext={handleNext}
        canProceed={canProceed()}
        isLastStep={currentStep === 3}
        isSending={isSending}
      >
        {error && (
          <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {currentStep === 1 && (
          loadingRooms ? (
            <div className="p-4 text-sm font-semibold text-slate-500">Kamers laden...</div>
          ) : propertyRooms.length === 0 ? (
            <div className="m-4 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-800">
              Geen vrije kamers voor dit schooljaar in dit pand. Maak een nieuwe kamer aan bij Panden of kies een ander pand of schooljaar.
            </div>
          ) : (
            <Step1Room rooms={propertyRooms} selectedRoomId={selectedRoomId} onSelect={handleRoomSelect} />
          )
        )}

        {currentStep === 2 && <Step2Student students={students} onChange={handleStudentChange} />}

        {currentStep === 3 && effectiveRoom && (
          <Step4Review room={effectiveRoom} students={students} />
        )}
      </WizardLayout>
    </div>
  )
}
