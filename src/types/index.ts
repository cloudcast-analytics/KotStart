export interface Property {
  id: string
  name: string
  street: string
  number: string
  postalCode: string
  city: string
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
  firstName: string
  lastName: string
  street: string
  number: string
  postalCode: string
  city: string
  phone: string
  email: string
  ibanCountry: 'BE' | 'NL'
  iban: string
}

export interface Contract {
  id: string
  roomId: string
  schoolYear: string
  studentId: string
  secondStudentId?: string
  status: 'draft' | 'sent' | 'signed'
  createdAt: string
  signedAt?: string
  sentAt?: string
  conceptSentAt?: string
  monthlyRent?: number
  fixedCosts?: number
  studentTax?: number
}

export interface Inspection {
  id: string
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  createdAt: string
}

export type InspectionItemType = 'condition' | 'count' | 'meter'
export type InspectionMeterUnit = 'kWh' | 'm³'

export interface InspectionTemplateItem {
  name: string
  type: InspectionItemType
  unit?: InspectionMeterUnit
}

export interface InspectionTemplateCategory {
  id: string
  label: string
  items: InspectionTemplateItem[]
}

export interface InspectionItem {
  id: string
  inspectionId: string
  category: string
  itemName: string
  condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
  keyCount?: number | null
  meterValue?: number | null
  meterUnit?: InspectionMeterUnit | null
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
  startInspectionDone?: boolean
  renewDone?: boolean
  endInspectionDone?: boolean
}
