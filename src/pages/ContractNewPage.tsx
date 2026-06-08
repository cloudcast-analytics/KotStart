import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createContractDraft, getLandlordProfile, getRooms, isLandlordProfileComplete } from '../lib/data'
import { isValidBelgianPostalCode } from '../lib/residence'
import type { Room } from '../types'
import type { LandlordProfile } from '../types'
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
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  const [isSending, setIsSending] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [landlordProfile, setLandlordProfile] = useState<LandlordProfile>(getLandlordProfile)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRooms() {
      setLoadingRooms(true)
      setError(null)
      try {
        const nextRooms = await getRooms()
        if (!cancelled) setRooms(nextRooms)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Kamers konden niet geladen worden')
      } finally {
        if (!cancelled) setLoadingRooms(false)
      }
    }

    loadRooms()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setLandlordProfile(getLandlordProfile())
  }, [currentStep])

  const propertyRooms = useMemo(() => rooms, [rooms])
  const selectedRoom: Room | null = propertyRooms.find(room => room.id === selectedRoomId) ?? null

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
    if (currentStep === 3) return Boolean(selectedRoom) && isLandlordProfileComplete(landlordProfile)
    return Boolean(selectedRoom)
  }

  async function handleNext() {
    if (!canProceed()) return

    if (currentStep < 3) {
      setCurrentStep(previous => (previous + 1) as WizardStep)
      return
    }

    if (!selectedRoom) return
    if (!isLandlordProfileComplete(landlordProfile)) {
      setError('Vul eerst alle verhuurdergegevens in bij Instellingen voordat je een contract aanmaakt.')
      return
    }

    setIsSending(true)
    try {
      const contractId = await createContractDraft({
        roomId: selectedRoom.id,
        schoolYear: '2025–2026',
        students,
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
              Geen kamers gevonden. Maak eerst een kamer aan bij Panden.
            </div>
          ) : (
            <Step1Room rooms={propertyRooms} selectedRoomId={selectedRoomId} onSelect={handleRoomSelect} />
          )
        )}

        {currentStep === 2 && <Step2Student students={students} onChange={handleStudentChange} />}

        {currentStep === 3 && selectedRoom && (
          <>
            {!isLandlordProfileComplete(landlordProfile) && (
              <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Vul eerst alle verhuurdergegevens in bij Instellingen voordat je een contract aanmaakt.
              </div>
            )}
            <Step4Review room={selectedRoom} students={students} />
          </>
        )}
      </WizardLayout>
    </div>
  )
}
