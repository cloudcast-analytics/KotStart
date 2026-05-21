import type { Contract, Property, Room, Student, StudentDashboardRow } from '../types'
import { CONTRACTS, PROPERTIES, ROOMS, STUDENTS } from './mockData'
import { isSupabaseConfigured, supabase } from './supabase'

interface PropertyRow {
  id: string
  name: string
  address: string | null
  created_at: string
}

interface RoomRow {
  id: string
  property_id: string
  room_number: string
  room_type: Room['roomType']
  monthly_rent: number | string | null
  student_tax: number | string | null
  fixed_costs: number | string | null
  deposit: number | string | null
}

interface StudentRow {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  photo_url: string | null
  created_at: string
}

interface ContractRow {
  id: string
  room_id: string
  school_year: string
  student_id: string
  second_student_id: string | null
  second_landlord_name: string | null
  second_landlord_email: string | null
  guardian_name: string | null
  guardian_email: string | null
  guardian_phone: string | null
  status: Contract['status']
  created_at: string
}

interface ContractDraftStudent {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  photoUrl: string | null
}

interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
  secondLandlord: { name: string; email: string } | null
  guardian: { name: string; email: string; phone: string } | null
}

interface SaveInspectionInput {
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrl: string | null
  items: Array<{
    category: string
    itemName: string
    condition: 'good' | 'moderate' | 'bad' | 'unusable'
    photoUrl: string | null
  }>
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null

  const [, mimeType, base64] = match
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

function extensionForMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  return 'jpg'
}

async function uploadDataUrl(bucket: string, folder: string, value: string | null): Promise<string | null> {
  if (!value) return null
  if (!isSupabaseConfigured) return value
  if (!value.startsWith('data:')) return value

  const blob = dataUrlToBlob(value)
  if (!blob) return value

  const extension = extensionForMime(blob.type)
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

function asNumber(value: number | string | null): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    createdAt: row.created_at,
  }
}

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomNumber: row.room_number,
    roomType: row.room_type,
    monthlyRent: asNumber(row.monthly_rent),
    studentTax: asNumber(row.student_tax),
    fixedCosts: asNumber(row.fixed_costs),
    deposit: asNumber(row.deposit),
  }
}

function mapStudent(row: StudentRow): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    dateOfBirth: row.date_of_birth ?? '',
    photoUrl: row.photo_url ?? undefined,
    createdAt: row.created_at,
  }
}

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    roomId: row.room_id,
    schoolYear: row.school_year,
    studentId: row.student_id,
    secondStudentId: row.second_student_id ?? undefined,
    secondLandlordName: row.second_landlord_name ?? undefined,
    secondLandlordEmail: row.second_landlord_email ?? undefined,
    guardianName: row.guardian_name ?? undefined,
    guardianEmail: row.guardian_email ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  }
}

function buildDashboardRows(
  propertyId: string,
  schoolYear: string,
  rooms: Room[],
  contracts: Contract[],
  students: Student[],
): StudentDashboardRow[] {
  const propertyRooms = rooms.filter(room => room.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(room => room.id))
  const activeContracts = contracts.filter(contract => roomIds.has(contract.roomId) && contract.schoolYear === schoolYear)

  return activeContracts
    .map(contract => {
      const student = students.find(item => item.id === contract.studentId)
      const room = rooms.find(item => item.id === contract.roomId)
      if (!student || !room) return null

      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        roomNumber: room.roomNumber,
        contractId: contract.id,
      }
    })
    .filter((row): row is StudentDashboardRow => row !== null)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
}

export async function getProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured) return PROPERTIES

  const { data, error } = await supabase.from('properties').select('*').order('name')
  if (error) throw error
  return (data as PropertyRow[]).map(mapProperty)
}

export async function getRooms(): Promise<Room[]> {
  if (!isSupabaseConfigured) return ROOMS

  const { data, error } = await supabase.from('rooms').select('*').order('room_number')
  if (error) throw error
  return (data as RoomRow[]).map(mapRoom)
}

export async function getStudents(): Promise<Student[]> {
  if (!isSupabaseConfigured) return STUDENTS

  const { data, error } = await supabase.from('students').select('*').order('last_name')
  if (error) throw error
  return (data as StudentRow[]).map(mapStudent)
}

export async function getContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured) return CONTRACTS

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as ContractRow[]).map(mapContract)
}

export async function getDashboardRowsData(propertyId: string, schoolYear: string): Promise<StudentDashboardRow[]> {
  const [rooms, contracts, students] = await Promise.all([getRooms(), getContracts(), getStudents()])
  return buildDashboardRows(propertyId, schoolYear, rooms, contracts, students)
}

export async function getContractBundleData(contractId: string | undefined) {
  if (!contractId) return null

  const [contracts, rooms, students, properties] = await Promise.all([
    getContracts(),
    getRooms(),
    getStudents(),
    getProperties(),
  ])

  const contract = contracts.find(item => item.id === contractId)
  if (!contract) return null

  const room = rooms.find(item => item.id === contract.roomId)
  const student = students.find(item => item.id === contract.studentId)
  const property = room ? properties.find(item => item.id === room.propertyId) : null

  if (!room || !student || !property) return null
  return { contract, room, student, property }
}

export async function updateRoomData(room: Room): Promise<Room> {
  if (!isSupabaseConfigured) return room

  const { data, error } = await supabase
    .from('rooms')
    .update({
      room_number: room.roomNumber,
      room_type: room.roomType,
      monthly_rent: room.monthlyRent,
      student_tax: room.studentTax,
      fixed_costs: room.fixedCosts,
      deposit: room.deposit,
    })
    .eq('id', room.id)
    .select()
    .single()

  if (error) throw error
  return mapRoom(data as RoomRow)
}

export async function createContractDraft(input: CreateContractDraftInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const studentsWithUploadedPhotos = await Promise.all(
    input.students.map(async student => ({
      ...student,
      photoUrl: await uploadDataUrl('student-photos', 'students', student.photoUrl),
    })),
  )

  const { data: insertedStudents, error: studentError } = await supabase
    .from('students')
    .insert(
      studentsWithUploadedPhotos.map(student => ({
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        phone: student.phone || null,
        date_of_birth: student.dateOfBirth,
        photo_url: student.photoUrl,
      })),
    )
    .select()

  if (studentError) throw studentError

  const students = (insertedStudents as StudentRow[]).map(mapStudent)
  const primaryStudent = students[0]
  if (!primaryStudent) throw new Error('Geen student aangemaakt')

  const { data: insertedContract, error: contractError } = await supabase
    .from('contracts')
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: primaryStudent.id,
      second_student_id: students[1]?.id ?? null,
      second_landlord_name: input.secondLandlord?.name ?? null,
      second_landlord_email: input.secondLandlord?.email ?? null,
      guardian_name: input.guardian?.name ?? null,
      guardian_email: input.guardian?.email ?? null,
      guardian_phone: input.guardian?.phone ?? null,
      status: 'sent',
    })
    .select()
    .single()

  if (contractError) throw contractError
  return (insertedContract as ContractRow).id
}

export async function saveInspectionData(input: SaveInspectionInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const overviewPhotoUrl = await uploadDataUrl('inspection-photos', 'overview', input.overviewPhotoUrl)
  const itemsWithUploadedPhotos = await Promise.all(
    input.items.map(async item => ({
      ...item,
      photoUrl: await uploadDataUrl('inspection-photos', 'items', item.photoUrl),
    })),
  )

  const { data: inspection, error: inspectionError } = await supabase
    .from('inspections')
    .insert({
      contract_id: input.contractId,
      type: input.type,
      overview_photo_url: overviewPhotoUrl,
    })
    .select()
    .single()

  if (inspectionError) throw inspectionError
  const inspectionId = (inspection as { id: string }).id

  if (itemsWithUploadedPhotos.length > 0) {
    const { error: itemError } = await supabase.from('inspection_items').insert(
      itemsWithUploadedPhotos.map(item => ({
        inspection_id: inspectionId,
        category: item.category,
        item_name: item.itemName,
        condition: item.condition,
        photo_url: item.photoUrl,
      })),
    )

    if (itemError) throw itemError
  }

  return inspectionId
}
