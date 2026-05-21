import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROPERTIES, ROOMS } from '../lib/mockData'
import { createContractDraft } from '../lib/data'
import type { Room } from '../types'
import Step1Room from './wizard/Step1Room'
import Step2Student from './wizard/Step2Student'
import Step3SecondParty from './wizard/Step3SecondParty'
import Step4Review from './wizard/Step4Review'
import WizardLayout from './wizard/WizardLayout'
import {
  isMinor,
  isValidEmail,
  type GuardianData,
  type SecondPartyData,
  type StudentFormData,
} from './wizard/types'

const WIZARD_STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

type WizardStep = 1 | 2 | 3 | 4

function emptyStudent(): StudentFormData {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    photoUrl: null,
  }
}

function studentIsComplete(student: StudentFormData): boolean {
  return Boolean(
    student.firstName.trim() &&
      student.lastName.trim() &&
      isValidEmail(student.email) &&
      student.dateOfBirth,
  )
}

function secondPartyIsComplete(data: SecondPartyData | null): boolean {
  if (!data) return true
  return Boolean(data.name.trim() && isValidEmail(data.email))
}

function guardianIsComplete(hasMinor: boolean, guardian: GuardianData | null): boolean {
  if (!hasMinor) return true
  return Boolean(guardian?.name.trim() && guardian.email.trim() && isValidEmail(guardian.email))
}

export default function ContractNewPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentFormData[]>([emptyStudent()])
  const [secondLandlord, setSecondLandlord] = useState<SecondPartyData | null>(null)
  const [secondTenant, setSecondTenant] = useState<SecondPartyData | null>(null)
  const [guardian, setGuardian] = useState<GuardianData | null>(null)
  const [isSending, setIsSending] = useState(false)

  const propertyRooms = useMemo(
    () => ROOMS.filter(room => room.propertyId === PROPERTIES[0].id),
    [],
  )
  const selectedRoom: Room | null = propertyRooms.find(room => room.id === selectedRoomId) ?? null
  const hasMinor = students.some(student => isMinor(student.dateOfBirth))

  function handleRoomSelect(id: string) {
    setSelectedRoomId(id)

    const room = propertyRooms.find(item => item.id === id)
    setStudents(room?.roomType === 'double' ? [emptyStudent(), emptyStudent()] : [emptyStudent()])
    setSecondTenant(null)
    setGuardian(null)
  }

  function handleStudentChange(index: number, field: keyof StudentFormData, value: string | null) {
    setStudents(previous =>
      previous.map((student, studentIndex) =>
        studentIndex === index ? { ...student, [field]: value } : student,
      ),
    )
  }

  function canProceed(): boolean {
    if (currentStep === 1) return selectedRoomId !== null
    if (currentStep === 2) return students.every(studentIsComplete)
    if (currentStep === 3) {
      return (
        secondPartyIsComplete(secondLandlord) &&
        secondPartyIsComplete(secondTenant) &&
        guardianIsComplete(hasMinor, guardian)
      )
    }
    return Boolean(selectedRoom)
  }

  async function handleNext() {
    if (!canProceed()) return

    if (currentStep < 4) {
      setCurrentStep(previous => (previous + 1) as WizardStep)
      return
    }

    if (!selectedRoom) return

    setIsSending(true)
    try {
      await createContractDraft({
        roomId: selectedRoom.id,
        schoolYear: '2025–2026',
        students,
        secondLandlord,
        guardian,
      })
      window.setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      console.error('Contract opslaan mislukt:', err)
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
        isLastStep={currentStep === 4}
        isSending={isSending}
      >
        {currentStep === 1 && (
          <Step1Room rooms={propertyRooms} selectedRoomId={selectedRoomId} onSelect={handleRoomSelect} />
        )}

        {currentStep === 2 && <Step2Student students={students} onChange={handleStudentChange} />}

        {currentStep === 3 && (
          <Step3SecondParty
            roomType={selectedRoom?.roomType ?? 'single'}
            hasMinor={hasMinor}
            secondLandlord={secondLandlord}
            secondTenant={secondTenant}
            guardian={guardian}
            onSecondLandlordChange={setSecondLandlord}
            onSecondTenantChange={setSecondTenant}
            onGuardianChange={setGuardian}
          />
        )}

        {currentStep === 4 && selectedRoom && (
          <Step4Review
            room={selectedRoom}
            students={students}
            secondLandlord={secondLandlord}
            secondTenant={secondTenant}
            guardian={guardian}
          />
        )}
      </WizardLayout>
    </div>
  )
}
