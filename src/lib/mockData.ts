import type { Property, Room, Student, Contract, StudentDashboardRow } from '../types'

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
  { id: 's1', firstName: 'Emma', lastName: 'Janssen', email: 'emma.janssen@student.ugent.be', phone: '0470 11 22 33', dateOfBirth: '2005-03-14', createdAt: '2025-08-15' },
  { id: 's2', firstName: 'Liam', lastName: 'Pieters', email: 'liam.pieters@student.ugent.be', phone: '0471 44 55 66', dateOfBirth: '2004-07-22', createdAt: '2025-08-16' },
  { id: 's3', firstName: 'Sara', lastName: 'Bogaert', email: 'sara.bogaert@student.ugent.be', phone: '0472 77 88 99', dateOfBirth: '2005-11-03', createdAt: '2025-08-17' },
  { id: 's4', firstName: 'Noah', lastName: 'De Smedt', email: 'noah.desmedt@student.ugent.be', phone: '0473 00 11 22', dateOfBirth: '2004-05-18', createdAt: '2025-08-18' },
  { id: 's5', firstName: 'Fien', lastName: 'Vandenberghe', email: 'fien.vandenberghe@student.ugent.be', phone: '0474 33 44 55', dateOfBirth: '2005-09-27', createdAt: '2025-08-19' },
]

export const CONTRACTS: Contract[] = [
  { id: 'c1', roomId: 'r1', schoolYear: '2025–2026', studentId: 's1', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c2', roomId: 'r2', schoolYear: '2025–2026', studentId: 's2', status: 'signed', createdAt: '2025-08-20' },
  { id: 'c3', roomId: 'r4', schoolYear: '2025–2026', studentId: 's3', status: 'sent', createdAt: '2025-08-21' },
  { id: 'c4', roomId: 'r5', schoolYear: '2025–2026', studentId: 's4', status: 'draft', createdAt: '2025-08-22' },
  { id: 'c5', roomId: 'r7', schoolYear: '2025–2026', studentId: 's5', status: 'signed', createdAt: '2025-08-22' },
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
