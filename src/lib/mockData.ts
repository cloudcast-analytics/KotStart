import type { Contract, Inspection, InspectionItem, LandlordProfile, Property, Room, Student, StudentDashboardRow } from '../types'

export const SCHOOL_YEARS = ['2024–2025', '2025–2026']

export const PROPERTIES: Property[] = [
  { id: 'p1', name: 'Residentie De Linde', address: 'Lindestraat 12, 9000 Gent', createdAt: '2024-08-01' },
  { id: 'p2', name: 'Kot Guldensporenstraat', address: 'Guldensporenstraat 45, 9000 Gent', createdAt: '2024-08-01' },
]

export const ROOMS: Room[] = [
  { id: 'r1', propertyId: 'p1', roomNumber: '01', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
  { id: 'r2', propertyId: 'p1', roomNumber: '02', roomType: 'single', monthlyRent: 470, studentTax: 12, fixedCosts: 60, deposit: 940 },
  { id: 'r3', propertyId: 'p1', roomNumber: '03', roomType: 'studio', monthlyRent: 550, studentTax: 12, fixedCosts: 80, deposit: 1100 },
  { id: 'r4', propertyId: 'p1', roomNumber: '04', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
  { id: 'r5', propertyId: 'p1', roomNumber: '05', roomType: 'single', monthlyRent: 460, studentTax: 12, fixedCosts: 60, deposit: 920 },
  { id: 'r6', propertyId: 'p1', roomNumber: '06', roomType: 'double', monthlyRent: 600, studentTax: 24, fixedCosts: 80, deposit: 1200 },
  { id: 'r7', propertyId: 'p1', roomNumber: '07', roomType: 'single', monthlyRent: 450, studentTax: 12, fixedCosts: 60, deposit: 900 },
]

export const STUDENTS: Student[] = [
  { id: 's1', firstName: 'Emma', lastName: 'Janssen', email: 'emma.janssen@student.ugent.be', phone: '0470 11 22 33', dateOfBirth: '2005-03-14', nationalRegistryNumber: '05.03.14-234.56', institution: 'Universiteit Gent (UGent) — Faculteit Ingenieurswetenschappen', studentNumber: '202401234', primaryResidence: 'Kerkstraat 22, 9200 Dendermonde', createdAt: '2025-08-15' },
  { id: 's2', firstName: 'Liam', lastName: 'Pieters', email: 'liam.pieters@student.ugent.be', phone: '0471 44 55 66', dateOfBirth: '2004-07-22', nationalRegistryNumber: '04.07.22-345.67', institution: 'Universiteit Gent (UGent) — Faculteit Economie', studentNumber: '202401235', primaryResidence: 'Molenstraat 5, 9000 Gent', createdAt: '2025-08-16' },
  { id: 's3', firstName: 'Sara', lastName: 'Bogaert', email: 'sara.bogaert@student.ugent.be', phone: '0472 77 88 99', dateOfBirth: '2005-11-03', nationalRegistryNumber: '05.11.03-456.78', institution: 'Hogeschool Gent (HoGent) — Faculteit Gezondheid', studentNumber: '202401236', primaryResidence: 'Gentstraat 88, 9800 Deinze', createdAt: '2025-08-17' },
  { id: 's4', firstName: 'Noah', lastName: 'De Smedt', email: 'noah.desmedt@student.ugent.be', phone: '0473 00 11 22', dateOfBirth: '2004-05-18', nationalRegistryNumber: '04.05.18-567.89', institution: 'Universiteit Gent (UGent) — Faculteit Recht', studentNumber: '202401237', primaryResidence: 'Stationslaan 12, 9300 Aalst', createdAt: '2025-08-18' },
  { id: 's5', firstName: 'Fien', lastName: 'Vandenberghe', email: 'fien.vandenberghe@student.ugent.be', phone: '0474 33 44 55', dateOfBirth: '2005-09-27', nationalRegistryNumber: '05.09.27-678.90', institution: 'Universiteit Gent (UGent) — Faculteit Wetenschappen', studentNumber: '202401238', primaryResidence: 'Dorpsstraat 3, 9830 Sint-Martens-Latem', createdAt: '2025-08-19' },
  { id: 's-demo-student', firstName: 'Vincent', lastName: 'Grobben', email: 'vincent.grobben@example.com', phone: '0470 00 00 00', dateOfBirth: '2005-01-01', nationalRegistryNumber: '05.01.01-000.00', institution: 'Demo Hogeschool', studentNumber: 'DEMO-001', primaryResidence: 'Teststraat 1, 9000 Gent', createdAt: '2025-08-23' },
]

export const MOCK_LANDLORD_PROFILE: LandlordProfile = {
  name: '',
  dateOfBirth: '',
  nationalRegistryNumber: '',
  address: '',
  phone: '',
  email: '',
  iban: '',
  bic: '',
  bank: '',
  insuranceCompany: '',
  policyNumber: '',
  epcLabel: '',
  epcNumber: '',
}

export const CONTRACTS: Contract[] = [
  { id: 'c1', roomId: 'r1', schoolYear: '2025–2026', studentId: 's1', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c2', roomId: 'r2', schoolYear: '2025–2026', studentId: 's2', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c3', roomId: 'r4', schoolYear: '2025–2026', studentId: 's3', status: 'sent', createdAt: '2025-08-21' },
  { id: 'c4', roomId: 'r5', schoolYear: '2025–2026', studentId: 's4', status: 'draft', createdAt: '2025-08-22' },
  { id: 'c5', roomId: 'r7', schoolYear: '2025–2026', studentId: 's5', status: 'signed', createdAt: '2025-08-22' },
  { id: 'c-demo-student', roomId: 'r6', schoolYear: '2025–2026', studentId: 's-demo-student', status: 'sent', createdAt: '2025-08-23' },
]

export function getDashboardRows(propertyId: string, schoolYear: string): StudentDashboardRow[] {
  const propertyRooms = ROOMS.filter(r => r.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(r => r.id))
  const activeContracts = CONTRACTS.filter(c => roomIds.has(c.roomId) && c.schoolYear === schoolYear)

  return activeContracts.map(contract => {
    const student = STUDENTS.find(s => s.id === contract.studentId)!
    const room = ROOMS.find(r => r.id === contract.roomId)!
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      roomNumber: room.roomNumber,
      contractId: contract.id,
    }
  }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

export const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: 'i1',
    contractId: 'c1',
    type: 'start',
    overviewPhotoUrl: undefined,
    createdAt: '2025-09-15T10:00:00.000Z',
  },
]

export const MOCK_INSPECTION_ITEMS: InspectionItem[] = [
  { id: 'ii1', inspectionId: 'i1', category: 'Kamer', itemName: 'Vloer', condition: 'good', photoUrl: undefined },
  { id: 'ii2', inspectionId: 'i1', category: 'Kamer', itemName: 'Muren', condition: 'moderate', photoUrl: undefined },
  { id: 'ii3', inspectionId: 'i1', category: 'Badkamer', itemName: 'Douche', condition: 'good', photoUrl: undefined },
  { id: 'ii4', inspectionId: 'i1', category: 'Badkamer', itemName: 'Toilet & toiletbril', condition: 'good', photoUrl: undefined },
]
