export interface Property {
  id: string
  name: string
  address: string
  createdAt: string
}

export interface Room {
  id: string
  propertyId: string
  roomNumber: string
  roomType: 'studio' | 'single' | 'double'
  monthlyRent: number
  studentTax: number
  fixedCosts: number
  deposit: number
}

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl?: string
  institution?: string
  faculty?: string
  studentNumber?: string
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  createdAt: string
}

export interface LandlordProfile {
  name: string
  dateOfBirth: string
  address: string
  phone: string
  email: string
  iban: string
  bic: string
  bank: string
  insuranceCompany: string
  policyNumber: string
  epcLabel: string
  epcNumber: string
}

export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
}

export interface Inspection {
  id: string
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  createdAt: string
}

export interface InspectionItem {
  id: string
  inspectionId: string
  category: string
  itemName: string
  condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
  keyCount?: number | null
  photoUrl?: string
  notes?: string
}

export interface StudentDashboardRow {
  studentId: string
  firstName: string
  lastName: string
  roomNumber: string
  contractId: string
  secondFirstName?: string
  secondLastName?: string
}
