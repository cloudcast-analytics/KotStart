export interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
  institution: string
  faculty: string
  studentNumber: string
  residenceStreet: string
  residenceNumber: string
  residenceBox: string
  residencePostalCode: string
  residenceCity: string
}

export interface SecondPartyData {
  name: string
  email: string
}

export interface GuardianData {
  name: string
  email: string
  phone: string
}

export function parseDateOfBirth(value: string): Date | null {
  if (!value) return null

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const localMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  const match = isoMatch ?? localMatch
  if (!match) return null

  const year = isoMatch ? Number(match[1]) : Number(match[3])
  const month = isoMatch ? Number(match[2]) : Number(match[2])
  const day = isoMatch ? Number(match[3]) : Number(match[1])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export function isValidDateOfBirth(value: string): boolean {
  return parseDateOfBirth(value) !== null
}

export function toIsoDateOfBirth(value: string): string {
  const date = parseDateOfBirth(value)
  if (!date) return value

  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateOfBirthForInput(value: string): string {
  const date = parseDateOfBirth(value)
  if (!date) return value

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString().padStart(4, '0')
  return `${day}-${month}-${year}`
}

export function isMinor(dateOfBirth: string): boolean {
  const dob = parseDateOfBirth(dateOfBirth)
  if (!dob) return false

  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()

  return (
    age < 18 ||
    (age === 18 && monthDelta < 0) ||
    (age === 18 && monthDelta === 0 && today.getDate() < dob.getDate())
  )
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
