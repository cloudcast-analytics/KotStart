export interface StudentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
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

export function isMinor(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false

  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return false

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
