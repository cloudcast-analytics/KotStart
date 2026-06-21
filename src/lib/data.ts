import type { Contract, Inspection, InspectionItem, InspectionMeterUnit, InspectionTemplateCategory, InspectionToken, LandlordProfile, Property, Room, Student, StudentDashboardRow } from '../types'
import { CONTRACTS, DEFAULT_INSPECTION_CATEGORIES, MOCK_INSPECTION_ITEMS, MOCK_INSPECTIONS, MOCK_LANDLORD_PROFILE, PROPERTIES, ROOMS, STUDENTS } from './mockData'
import { isSupabaseConfigured, supabase } from './supabase'

interface PropertyRow {
  id: string
  name: string
  street?: string | null
  number?: string | null
  postal_code?: string | null
  city?: string | null
  created_at: string
  inspection_delegation?: 'together' | 'delegate' | null
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
  institution: string | null
  faculty: string | null
  student_number: string | null
  residence_street: string | null
  residence_number: string | null
  residence_box: string | null
  residence_postal_code: string | null
  residence_city: string | null
  guardian_name: string | null
  guardian_email: string | null
  guardian_phone: string | null
  created_at: string
}

interface ContractRow {
  id: string
  room_id: string
  school_year: string
  student_id: string
  second_student_id: string | null
  status: Contract['status']
  created_at: string
  signed_at?: string | null
  sent_at?: string | null
  concept_sent_at?: string | null
  monthly_rent?: number | string | null
  fixed_costs?: number | string | null
  student_tax?: number | string | null
}

interface InspectionRow {
  id: string
  contract_id: string
  type: 'start' | 'end'
  overview_photo_urls: string[] | null
  created_at: string
}

interface InspectionItemRow {
  id: string
  inspection_id: string
  category: string
  item_name: string
  condition: InspectionItem['condition']
  key_count: number | null
  meter_value: number | string | null
  meter_unit: string | null
  photo_url: string | null
  notes: string | null
}

interface LandlordProfileRow {
  first_name: string
  last_name: string
  street: string
  number: string
  postal_code: string
  city: string
  phone: string
  email: string
  iban_country: string
  iban: string
}

interface InspectionTokenRow {
  id: string
  token: string
  contract_id: string
  property_id: string
  owner_id: string
  status: 'pending' | 'submitted' | 'approved' | 'rejected'
  expires_at: string
  landlord_items: unknown
  student_items: unknown
  student_photo_urls: string[] | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
}

interface ContractDraftStudent {
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
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
}

interface CreateContractDraftInput {
  roomId: string
  schoolYear: string
  students: ContractDraftStudent[]
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}

interface SaveInspectionInput {
  contractId: string
  type: 'start' | 'end'
  overviewPhotoUrls: string[]
  items: Array<{
    category: string
    itemName: string
    condition: 'good' | 'moderate' | 'bad' | 'unusable' | null
    keyCount: number | null
    meterValue: number | null
    meterUnit: InspectionMeterUnit | null
    photoUrl: string | null
  }>
}

interface PropertyInput {
  name: string
  street: string
  number: string
  postalCode: string
  city: string
}

interface RoomInput {
  propertyId: string
  roomNumber: string
  roomType: Room['roomType']
  monthlyRent: number
  studentTax: number
  fixedCosts: number
  deposit: number
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

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Geen ingelogde gebruiker voor upload')

  const extension = extensionForMime(blob.type)
  const path = `${userData.user.id}/${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })

  if (error) throw error

  return `storage://${bucket}/${path}`
}

function parseStorageReference(value: string | null | undefined): { bucket: string; path: string } | null {
  if (!value?.startsWith('storage://')) return null

  const withoutProtocol = value.slice('storage://'.length)
  const separatorIndex = withoutProtocol.indexOf('/')
  if (separatorIndex === -1) return null

  return {
    bucket: withoutProtocol.slice(0, separatorIndex),
    path: withoutProtocol.slice(separatorIndex + 1),
  }
}

async function resolveStorageUrl(value: string | null | undefined): Promise<string | undefined> {
  if (!value) return undefined
  if (!isSupabaseConfigured) return value

  const reference = parseStorageReference(value)
  if (!reference) return value

  const { data, error } = await supabase.storage
    .from(reference.bucket)
    .createSignedUrl(reference.path, 60 * 60)

  if (error) throw error
  return data.signedUrl
}

async function resolveStorageUrls(values: string[] | null | undefined): Promise<string[]> {
  if (!values || values.length === 0) return []

  const resolved = await Promise.all(values.map(value => resolveStorageUrl(value)))
  return resolved.filter((url): url is string => url !== undefined)
}

function asNumber(value: number | string | null): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === '42703' ||
    maybeError.code === 'PGRST204' ||
    Boolean(maybeError.message?.includes('column') && maybeError.message.includes('schema cache'))
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    street: row.street ?? '',
    number: row.number ?? '',
    postalCode: row.postal_code ?? '',
    city: row.city ?? '',
    createdAt: row.created_at,
    inspectionDelegation: row.inspection_delegation ?? undefined,
  }
}

function mapInspectionToken(row: InspectionTokenRow): InspectionToken {
  return {
    id: row.id,
    token: row.token,
    contractId: row.contract_id,
    propertyId: row.property_id,
    status: row.status,
    expiresAt: row.expires_at,
    landlordItems: row.landlord_items,
    studentItems: row.student_items,
    studentPhotoUrls: row.student_photo_urls ?? [],
    submittedAt: row.submitted_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
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
    institution: row.institution ?? undefined,
    faculty: row.faculty ?? undefined,
    studentNumber: row.student_number ?? undefined,
    residenceStreet: row.residence_street ?? undefined,
    residenceNumber: row.residence_number ?? undefined,
    residenceBox: row.residence_box ?? undefined,
    residencePostalCode: row.residence_postal_code ?? undefined,
    residenceCity: row.residence_city ?? undefined,
    guardianName: row.guardian_name ?? undefined,
    guardianEmail: row.guardian_email ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    createdAt: row.created_at,
  }
}

function mapLandlordProfile(row: LandlordProfileRow): LandlordProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    street: row.street,
    number: row.number,
    postalCode: row.postal_code,
    city: row.city,
    phone: row.phone,
    email: row.email,
    ibanCountry: row.iban_country === 'NL' ? 'NL' : 'BE',
    iban: row.iban,
  }
}

async function mapStudentWithAssets(row: StudentRow): Promise<Student> {
  return {
    ...mapStudent(row),
    photoUrl: await resolveStorageUrl(row.photo_url),
  }
}

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    roomId: row.room_id,
    schoolYear: row.school_year,
    studentId: row.student_id,
    secondStudentId: row.second_student_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    signedAt: row.signed_at ?? undefined,
    sentAt: row.sent_at ?? undefined,
    conceptSentAt: row.concept_sent_at ?? undefined,
    monthlyRent: row.monthly_rent != null ? asNumber(row.monthly_rent) : undefined,
    fixedCosts: row.fixed_costs != null ? asNumber(row.fixed_costs) : undefined,
    studentTax: row.student_tax != null ? asNumber(row.student_tax) : undefined,
  }
}

function mapInspection(row: InspectionRow): Inspection {
  return {
    id: row.id,
    contractId: row.contract_id,
    type: row.type,
    overviewPhotoUrls: row.overview_photo_urls ?? [],
    createdAt: row.created_at,
  }
}

async function mapInspectionWithAssets(row: InspectionRow): Promise<Inspection> {
  return {
    ...mapInspection(row),
    overviewPhotoUrls: await resolveStorageUrls(row.overview_photo_urls),
  }
}

function mapInspectionItem(row: InspectionItemRow): InspectionItem {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    category: row.category,
    itemName: row.item_name,
    condition: row.condition,
    keyCount: row.key_count ?? undefined,
    meterValue: row.meter_value !== null && row.meter_value !== undefined ? Number(row.meter_value) : undefined,
    meterUnit: (row.meter_unit as InspectionMeterUnit | null) ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    notes: row.notes ?? undefined,
  }
}

async function mapInspectionItemWithAssets(row: InspectionItemRow): Promise<InspectionItem> {
  return {
    ...mapInspectionItem(row),
    photoUrl: await resolveStorageUrl(row.photo_url),
  }
}

export function nextSchoolYear(current: string): string {
  const match = current.match(/^(\d{4})[–-](\d{4})$/)
  if (!match) return current

  const start = Number(match[1]) + 1
  const end = Number(match[2]) + 1
  return `${start}–${end}`
}

function mergeSchoolYears(base: string[], custom: string[]): string[] {
  const unique = Array.from(new Set([...base, ...custom]))
  return unique.sort((a, b) => {
    const yearA = Number(a.match(/^(\d{4})/)?.[1] ?? 0)
    const yearB = Number(b.match(/^(\d{4})/)?.[1] ?? 0)
    return yearA - yearB
  })
}

export async function getSchoolYears(): Promise<string[]> {
  const contracts = await getContracts()
  const contractYears = Array.from(new Set(contracts.map(contract => contract.schoolYear)))

  let custom: string[] = []
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { data, error } = await supabase
        .from('school_years')
        .select('label')
        .eq('owner_id', userData.user.id)

      if (!error && data) {
        custom = data.map(row => row.label as string)
      }
    }
  }

  return mergeSchoolYears(contractYears, custom)
}

export async function addSchoolYear(label: string): Promise<string[] | null> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      const { error } = await supabase
        .from('school_years')
        .upsert({ owner_id: userData.user.id, label }, { onConflict: 'owner_id,label' })

      if (error) throw error
      return getSchoolYears()
    }
  }

  return null
}

async function getInspectionFlagsByContract(contractIds: string[]): Promise<Map<string, { start: boolean; end: boolean }>> {
  const flags = new Map<string, { start: boolean; end: boolean }>()
  if (contractIds.length === 0) return flags

  let rows: Array<{ contractId: string; type: 'start' | 'end' }>

  if (!isSupabaseConfigured) {
    rows = MOCK_INSPECTIONS.filter(inspection => contractIds.includes(inspection.contractId))
      .map(inspection => ({ contractId: inspection.contractId, type: inspection.type }))
  } else {
    const { data, error } = await supabase.from('inspections').select('contract_id, type').in('contract_id', contractIds)
    if (error) throw error
    rows = ((data as Array<{ contract_id: string; type: 'start' | 'end' }>) ?? [])
      .map(row => ({ contractId: row.contract_id, type: row.type }))
  }

  for (const row of rows) {
    const entry = flags.get(row.contractId) ?? { start: false, end: false }
    if (row.type === 'start') entry.start = true
    if (row.type === 'end') entry.end = true
    flags.set(row.contractId, entry)
  }

  return flags
}

function buildDashboardRows(
  propertyId: string,
  schoolYear: string,
  rooms: Room[],
  contracts: Contract[],
  students: Student[],
  inspectionFlags: Map<string, { start: boolean; end: boolean }>,
  tokenStatuses?: Map<string, 'pending' | 'submitted'>,
): StudentDashboardRow[] {
  const propertyRooms = rooms.filter(room => room.propertyId === propertyId)
  const roomIds = new Set(propertyRooms.map(room => room.id))
  const activeContracts = contracts.filter(contract => roomIds.has(contract.roomId) && contract.schoolYear === schoolYear)

  return activeContracts
    .map((contract): StudentDashboardRow | null => {
      const student = students.find(item => item.id === contract.studentId)
      const room = rooms.find(item => item.id === contract.roomId)
      if (!student || !room) return null

      const secondStudent = contract.secondStudentId
        ? students.find(item => item.id === contract.secondStudentId)
        : undefined

      const flags = inspectionFlags.get(contract.id)
      const renewalSchoolYear = nextSchoolYear(contract.schoolYear)
      const renewDone = contracts.some(
        other => other.studentId === contract.studentId && other.roomId === contract.roomId && other.schoolYear === renewalSchoolYear,
      )

      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        roomNumber: room.roomNumber,
        contractId: contract.id,
        secondFirstName: secondStudent?.firstName,
        secondLastName: secondStudent?.lastName,
        startInspectionDone: flags?.start ?? false,
        inspectionTokenStatus: tokenStatuses?.get(contract.id),
        renewDone,
        endInspectionDone: flags?.end ?? false,
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
  return Promise.all((data as StudentRow[]).map(mapStudentWithAssets))
}

export async function getContracts(): Promise<Contract[]> {
  if (!isSupabaseConfigured) return CONTRACTS

  const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as ContractRow[]).map(mapContract)
}

const ROOM_CAPACITY: Record<Room['roomType'], number> = {
  studio: 1,
  single: 1,
  double: 2,
}

function isRoomAvailable(
  room: Room,
  schoolYear: string,
  contracts: Contract[],
  excludeContractId?: string,
): boolean {
  const occupants = contracts.filter(
    contract =>
      contract.roomId === room.id &&
      contract.schoolYear === schoolYear &&
      contract.id !== excludeContractId &&
      (contract.status === 'signed' || contract.status === 'sent'),
  ).length
  return occupants < ROOM_CAPACITY[room.roomType]
}

export async function getAvailableRoomsForRenewal(
  propertyId: string,
  schoolYear: string,
  currentContractId: string,
): Promise<Room[]> {
  const [rooms, contracts] = await Promise.all([getRooms(), getContracts()])
  return rooms
    .filter(room => room.propertyId === propertyId)
    .filter(room => isRoomAvailable(room, schoolYear, contracts, currentContractId))
}

export async function getAvailableRoomsForNewContract(
  propertyId: string,
  schoolYear: string,
): Promise<Room[]> {
  const [rooms, contracts] = await Promise.all([getRooms(), getContracts()])
  return rooms
    .filter(room => room.propertyId === propertyId)
    .filter(room => isRoomAvailable(room, schoolYear, contracts))
}

async function getTokenStatusesByContract(contractIds: string[]): Promise<Map<string, 'pending' | 'submitted'>> {
  const tokenStatuses = new Map<string, 'pending' | 'submitted'>()
  if (contractIds.length === 0) return tokenStatuses

  if (!isSupabaseConfigured) return tokenStatuses

  const { data: tokens } = await supabase
    .from('inspection_tokens')
    .select('contract_id, status')
    .in('contract_id', contractIds)
    .in('status', ['pending', 'submitted'])
    .order('created_at', { ascending: false })

  if (tokens) {
    for (const t of tokens as Array<{ contract_id: string; status: string }>) {
      if (!tokenStatuses.has(t.contract_id)) {
        tokenStatuses.set(t.contract_id, t.status as 'pending' | 'submitted')
      }
    }
  }

  return tokenStatuses
}

export async function getDashboardRowsData(propertyId: string, schoolYear: string): Promise<StudentDashboardRow[]> {
  const [rooms, contracts, students] = await Promise.all([getRooms(), getContracts(), getStudents()])
  const propertyRoomIds = new Set(rooms.filter(room => room.propertyId === propertyId).map(room => room.id))
  const activeContractIds = contracts
    .filter(contract => propertyRoomIds.has(contract.roomId) && contract.schoolYear === schoolYear)
    .map(contract => contract.id)
  const [inspectionFlags, tokenStatuses] = await Promise.all([
    getInspectionFlagsByContract(activeContractIds),
    getTokenStatusesByContract(activeContractIds),
  ])
  return buildDashboardRows(propertyId, schoolYear, rooms, contracts, students, inspectionFlags, tokenStatuses)
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

  const secondStudent = contract.secondStudentId
    ? students.find(item => item.id === contract.secondStudentId)
    : undefined

  let startInspection: Inspection | undefined
  let startInspectionItems: InspectionItem[] = []
  let endInspection: Inspection | undefined
  let endInspectionItems: InspectionItem[] = []

  if (isSupabaseConfigured) {
    const [startResult, endResult] = await Promise.all([
      supabase.from('inspections').select('*').eq('contract_id', contractId).eq('type', 'start').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('inspections').select('*').eq('contract_id', contractId).eq('type', 'end').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (startResult.data) {
      startInspection = await mapInspectionWithAssets(startResult.data as InspectionRow)
      const { data: itemsData } = await supabase.from('inspection_items').select('*').eq('inspection_id', startInspection.id)
      startInspectionItems = await Promise.all(((itemsData as InspectionItemRow[]) ?? []).map(mapInspectionItemWithAssets))
    }

    if (endResult.data) {
      endInspection = await mapInspectionWithAssets(endResult.data as InspectionRow)
      const { data: itemsData } = await supabase.from('inspection_items').select('*').eq('inspection_id', endInspection.id)
      endInspectionItems = await Promise.all(((itemsData as InspectionItemRow[]) ?? []).map(mapInspectionItemWithAssets))
    }
  } else {
    startInspection = MOCK_INSPECTIONS.find(i => i.contractId === contractId && i.type === 'start')
    startInspectionItems = startInspection
      ? MOCK_INSPECTION_ITEMS.filter(i => i.inspectionId === startInspection!.id)
      : []
    endInspection = MOCK_INSPECTIONS.find(i => i.contractId === contractId && i.type === 'end')
    endInspectionItems = endInspection
      ? MOCK_INSPECTION_ITEMS.filter(i => i.inspectionId === endInspection!.id)
      : []
  }

  const landlord = await getLandlordProfile()
  return { contract, room, student, secondStudent, property, startInspection, startInspectionItems, endInspection, endInspectionItems, landlord }
}

export async function getInspectionData(inspectionId: string | undefined): Promise<{ inspection: Inspection; items: InspectionItem[] } | null> {
  if (!inspectionId) return null

  if (!isSupabaseConfigured) {
    const inspection = MOCK_INSPECTIONS.find(i => i.id === inspectionId)
    if (!inspection) return null
    const items = MOCK_INSPECTION_ITEMS.filter(i => i.inspectionId === inspectionId)
    return { inspection, items }
  }

  const { data: inspectionData, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', inspectionId)
    .maybeSingle()

  if (error || !inspectionData) return null

  const inspection = await mapInspectionWithAssets(inspectionData as InspectionRow)
  const { data: itemsData } = await supabase
    .from('inspection_items')
    .select('*')
    .eq('inspection_id', inspectionId)

  const items = await Promise.all(((itemsData as InspectionItemRow[]) ?? []).map(mapInspectionItemWithAssets))
  return { inspection, items }
}

const LANDLORD_PROFILE_KEY = 'kotstart_landlord_profile'

function getLandlordProfileFromStorage(): LandlordProfile {
  try {
    const stored = localStorage.getItem(LANDLORD_PROFILE_KEY)
    if (stored) return JSON.parse(stored) as LandlordProfile
  } catch {
    // ignore parse errors
  }
  return MOCK_LANDLORD_PROFILE
}

export async function getLandlordProfile(): Promise<LandlordProfile> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('get_landlord_profile')

    if (!error && data && data.length > 0) return mapLandlordProfile(data[0] as LandlordProfileRow)
  }

  return getLandlordProfileFromStorage()
}

const REQUIRED_LANDLORD_PROFILE_FIELDS: Array<keyof LandlordProfile> = [
  'firstName',
  'lastName',
  'street',
  'number',
  'postalCode',
  'city',
  'phone',
  'email',
  'iban',
]

export function isLandlordProfileComplete(profile: LandlordProfile): boolean {
  return REQUIRED_LANDLORD_PROFILE_FIELDS.every(field => profile[field].trim().length > 0)
}

export async function saveLandlordProfile(profile: LandlordProfile): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.rpc('save_landlord_profile', {
      p_first_name: profile.firstName,
      p_last_name: profile.lastName,
      p_street: profile.street,
      p_number: profile.number,
      p_postal_code: profile.postalCode,
      p_city: profile.city,
      p_phone: profile.phone,
      p_email: profile.email,
      p_iban_country: profile.ibanCountry,
      p_iban: profile.iban,
    })

    if (error) throw error
    return
  }

  localStorage.setItem(LANDLORD_PROFILE_KEY, JSON.stringify(profile))
}

export async function getInspectionCategories(propertyId: string): Promise<InspectionTemplateCategory[]> {
  if (!isSupabaseConfigured) return DEFAULT_INSPECTION_CATEGORIES

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return DEFAULT_INSPECTION_CATEGORIES

  const { data, error } = await supabase
    .from('inspection_templates')
    .select('categories')
    .eq('owner_id', userData.user.id)
    .eq('property_id', propertyId)
    .maybeSingle()

  if (error || !data) return DEFAULT_INSPECTION_CATEGORIES
  return data.categories as InspectionTemplateCategory[]
}

export async function saveInspectionCategories(propertyId: string, categories: InspectionTemplateCategory[]): Promise<void> {
  if (!isSupabaseConfigured) return

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  const { error } = await supabase
    .from('inspection_templates')
    .upsert({ owner_id: userData.user.id, property_id: propertyId, categories }, { onConflict: 'owner_id,property_id' })

  if (error) throw error
}

export async function saveConceptSentAt(contractId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('contracts')
    .update({ concept_sent_at: new Date().toISOString() })
    .eq('id', contractId)
  if (error) throw error
}

export async function sendContractEmail(
  to: string,
  name: string,
  html: string,
  pdfBase64?: string,
  isConcept?: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.functions.invoke('send-contract-email', {
    body: { to, name, html, pdfBase64, isConcept },
  })
  if (error) {
    const response = (error as { context?: Response }).context
    if (response) {
      try {
        const body = await response.clone().json() as { error?: string }
        if (body.error) throw new Error(body.error)
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
          throw parseError
        }
      }
    }
    throw error
  }
}

export async function createPropertyData(input: PropertyInput): Promise<Property> {
  const fallbackProperty: Property = {
    id: crypto.randomUUID(),
    name: input.name,
    street: input.street,
    number: input.number,
    postalCode: input.postalCode,
    city: input.city,
    createdAt: new Date().toISOString(),
  }
  if (!isSupabaseConfigured) return fallbackProperty

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Geen ingelogde gebruiker')

  const { data, error } = await supabase
    .from('properties')
    .insert({
      owner_id: userData.user.id,
      name: input.name,
      street: input.street || null,
      number: input.number || null,
      postal_code: input.postalCode || null,
      city: input.city || null,
    })
    .select()
    .single()

  if (isMissingColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('properties')
      .insert({
        owner_id: userData.user.id,
        name: input.name,
      })
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return mapProperty(fallbackData as PropertyRow)
  }

  if (error) throw error
  return mapProperty(data as PropertyRow)
}

export async function updatePropertyData(property: Property): Promise<Property> {
  if (!isSupabaseConfigured) return property

  const { data, error } = await supabase
    .from('properties')
    .update({
      name: property.name,
      street: property.street || null,
      number: property.number || null,
      postal_code: property.postalCode || null,
      city: property.city || null,
    })
    .eq('id', property.id)
    .select()
    .single()

  if (isMissingColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('properties')
      .update({
        name: property.name,
      })
      .eq('id', property.id)
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return mapProperty(fallbackData as PropertyRow)
  }

  if (error) throw error
  return mapProperty(data as PropertyRow)
}

export async function createRoomData(input: RoomInput): Promise<Room> {
  const fallbackRoom: Room = {
    id: crypto.randomUUID(),
    ...input,
  }
  if (!isSupabaseConfigured) return fallbackRoom

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      property_id: input.propertyId,
      room_number: input.roomNumber,
      room_type: input.roomType,
      monthly_rent: input.monthlyRent,
      student_tax: input.studentTax,
      fixed_costs: input.fixedCosts,
      deposit: input.deposit,
    })
    .select()
    .single()

  if (error) throw error
  return mapRoom(data as RoomRow)
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

export async function deleteRoomData(roomId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.from('rooms').delete().eq('id', roomId)
  if (error) throw error
}

export async function createContractDraft(input: CreateContractDraftInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Geen ingelogde gebruiker')

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
        owner_id: userData.user!.id,
        first_name: student.firstName,
        last_name: student.lastName,
        email: student.email,
        phone: student.phone || null,
        date_of_birth: student.dateOfBirth,
        photo_url: student.photoUrl,
        institution: student.institution || null,
        faculty: student.faculty || null,
        student_number: student.studentNumber || null,
        residence_street: student.residenceStreet || null,
        residence_number: student.residenceNumber || null,
        residence_box: student.residenceBox || null,
        residence_postal_code: student.residencePostalCode || null,
        residence_city: student.residenceCity || null,
        guardian_name: student.guardianName || null,
        guardian_email: student.guardianEmail || null,
        guardian_phone: student.guardianPhone || null,
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
      status: 'draft',
      monthly_rent: input.monthlyRent,
      fixed_costs: input.fixedCosts,
      student_tax: input.studentTax,
    })
    .select()
    .single()

  if (isMissingColumnError(contractError)) {
    const { data: fallbackContract, error: fallbackError } = await supabase
      .from('contracts')
      .insert({
        room_id: input.roomId,
        school_year: input.schoolYear,
        student_id: primaryStudent.id,
        second_student_id: students[1]?.id ?? null,
        status: 'draft',
      })
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return (fallbackContract as ContractRow).id
  }

  if (contractError) throw contractError
  return (insertedContract as ContractRow).id
}

export async function updateContractStatus(contractId: string, status: Contract['status']): Promise<void> {
  if (!isSupabaseConfigured) return
  const timestamp = new Date().toISOString()
  const patch: Partial<ContractRow> = { status }
  if (status === 'signed') patch.signed_at = timestamp
  if (status === 'sent') patch.sent_at = timestamp

  const { error } = await supabase
    .from('contracts')
    .update(patch)
    .eq('id', contractId)

  if (isMissingColumnError(error)) {
    const { error: fallbackError } = await supabase
      .from('contracts')
      .update({ status })
      .eq('id', contractId)

    if (fallbackError) throw fallbackError
    return
  }

  if (error) throw error
}

export interface CreateContractRenewalInput {
  previousContractId: string
  roomId: string
  schoolYear: string
  monthlyRent: number
  fixedCosts: number
  studentTax: number
}

export async function createContractRenewal(input: CreateContractRenewalInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const [contracts, rooms] = await Promise.all([getContracts(), getRooms()])

  const previous = contracts.find(c => c.id === input.previousContractId)
  if (!previous) throw new Error('Vorig contract niet gevonden')

  const room = rooms.find(r => r.id === input.roomId)
  if (!room) throw new Error('Kamer niet gevonden')

  if (
    room.monthlyRent !== input.monthlyRent ||
    room.fixedCosts !== input.fixedCosts ||
    room.studentTax !== input.studentTax
  ) {
    await updateRoomData({
      ...room,
      monthlyRent: input.monthlyRent,
      fixedCosts: input.fixedCosts,
      studentTax: input.studentTax,
    })
  }

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      room_id: input.roomId,
      school_year: input.schoolYear,
      student_id: previous.studentId,
      second_student_id: previous.secondStudentId ?? null,
      status: 'draft',
      monthly_rent: input.monthlyRent,
      fixed_costs: input.fixedCosts,
      student_tax: input.studentTax,
    })
    .select()
    .single()

  if (isMissingColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('contracts')
      .insert({
        room_id: input.roomId,
        school_year: input.schoolYear,
        student_id: previous.studentId,
        second_student_id: previous.secondStudentId ?? null,
        status: 'draft',
      })
      .select()
      .single()

    if (fallbackError) throw fallbackError
    return (fallbackData as ContractRow).id
  }

  if (error) throw error
  return (data as ContractRow).id
}

export async function deleteContractBundleData(contractId: string): Promise<void> {
  const bundle = await getContractBundleData(contractId)
  if (!bundle) throw new Error('Contract niet gevonden')

  const studentIds = [bundle.contract.studentId, bundle.contract.secondStudentId].filter((value): value is string => Boolean(value))

  if (!isSupabaseConfigured) {
    const contractIndex = CONTRACTS.findIndex(contract => contract.id === contractId)
    if (contractIndex >= 0) CONTRACTS.splice(contractIndex, 1)

    const inspectionIds = MOCK_INSPECTIONS
      .filter(inspection => inspection.contractId === contractId)
      .map(inspection => inspection.id)

    for (let index = MOCK_INSPECTION_ITEMS.length - 1; index >= 0; index -= 1) {
      if (inspectionIds.includes(MOCK_INSPECTION_ITEMS[index].inspectionId)) {
        MOCK_INSPECTION_ITEMS.splice(index, 1)
      }
    }

    for (let index = MOCK_INSPECTIONS.length - 1; index >= 0; index -= 1) {
      if (MOCK_INSPECTIONS[index].contractId === contractId) {
        MOCK_INSPECTIONS.splice(index, 1)
      }
    }

    for (let index = STUDENTS.length - 1; index >= 0; index -= 1) {
      if (studentIds.includes(STUDENTS[index].id)) {
        STUDENTS.splice(index, 1)
      }
    }
    return
  }

  const { data: inspectionsData, error: inspectionSelectError } = await supabase
    .from('inspections')
    .select('id')
    .eq('contract_id', contractId)

  if (inspectionSelectError) throw inspectionSelectError

  const inspectionIds = ((inspectionsData as Array<{ id: string }> | null) ?? []).map(inspection => inspection.id)

  if (inspectionIds.length > 0) {
    const { error: itemError } = await supabase
      .from('inspection_items')
      .delete()
      .in('inspection_id', inspectionIds)
    if (itemError) throw itemError
  }

  const { error: inspectionError } = await supabase
    .from('inspections')
    .delete()
    .eq('contract_id', contractId)
  if (inspectionError) throw inspectionError

  const { error: contractError } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId)
  if (contractError) throw contractError

  if (studentIds.length > 0) {
    const { error: studentError } = await supabase
      .from('students')
      .delete()
      .in('id', studentIds)
    if (studentError) throw studentError
  }
}

export async function saveInspectionData(input: SaveInspectionInput): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const overviewPhotoUrls = (
    await Promise.all(input.overviewPhotoUrls.map(url => uploadDataUrl('inspection-photos', 'overview', url)))
  ).filter((url): url is string => url !== null)

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
      overview_photo_urls: overviewPhotoUrls,
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
        key_count: item.keyCount,
        meter_value: item.meterValue,
        meter_unit: item.meterUnit,
        photo_url: item.photoUrl,
      })),
    )

    if (itemError) throw itemError
  }

  return inspectionId
}

export async function getPropertyDelegation(propertyId: string): Promise<'together' | 'delegate'> {
  if (!isSupabaseConfigured) return 'together'

  const { data, error } = await supabase
    .from('properties')
    .select('inspection_delegation')
    .eq('id', propertyId)
    .maybeSingle()

  if (error || !data) return 'together'
  return (data.inspection_delegation as 'together' | 'delegate') ?? 'together'
}

export async function savePropertyDelegation(propertyId: string, mode: 'together' | 'delegate'): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('properties')
    .update({ inspection_delegation: mode })
    .eq('id', propertyId)

  if (error) throw error
}

export async function createInspectionToken(
  contractId: string,
  propertyId: string,
  landlordItems: unknown,
): Promise<{ token: string; expiresAt: string } | null> {
  if (!isSupabaseConfigured) return null

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data, error } = await supabase
    .from('inspection_tokens')
    .insert({
      contract_id: contractId,
      property_id: propertyId,
      owner_id: userData.user.id,
      landlord_items: landlordItems,
    })
    .select('token, expires_at')
    .single()

  if (error) throw error
  return { token: data.token as string, expiresAt: data.expires_at as string }
}

export async function getInspectionTokenForContract(contractId: string): Promise<InspectionToken | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('inspection_tokens')
    .select('*')
    .eq('contract_id', contractId)
    .in('status', ['pending', 'submitted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapInspectionToken(data as InspectionTokenRow)
}

export async function approveInspectionToken(
  tokenId: string,
  contractId: string,
  type: 'start' | 'end',
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { data: tokenData, error: tokenError } = await supabase
    .from('inspection_tokens')
    .select('*')
    .eq('id', tokenId)
    .single()

  if (tokenError || !tokenData) throw new Error('Token niet gevonden')

  const token = tokenData as InspectionTokenRow
  const allItems = [
    ...((token.landlord_items as Array<Record<string, unknown>>) ?? []),
    ...((token.student_items as Array<Record<string, unknown>>) ?? []),
  ]

  const { data: inspData, error: inspError } = await supabase
    .from('inspections')
    .insert({
      contract_id: contractId,
      type,
      overview_photo_urls: token.student_photo_urls ?? [],
    })
    .select('id')
    .single()

  if (inspError) throw inspError

  if (allItems.length > 0) {
    const itemRows = allItems.map(item => ({
      inspection_id: inspData.id,
      category: item.category as string,
      item_name: item.itemName as string,
      condition: (item.condition as string) ?? null,
      key_count: (item.keyCount as number) ?? null,
      meter_value: (item.meterValue as number) ?? null,
      meter_unit: (item.meterUnit as string) ?? null,
      photo_url: (item.photoUrl as string) ?? null,
    }))

    const { error: itemsError } = await supabase.from('inspection_items').insert(itemRows)
    if (itemsError) throw itemsError
  }

  const { error: updateError } = await supabase
    .from('inspection_tokens')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (updateError) throw updateError
}

export async function rejectInspectionToken(tokenId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const { data: oldToken, error: fetchError } = await supabase
    .from('inspection_tokens')
    .select('contract_id, property_id, owner_id, landlord_items')
    .eq('id', tokenId)
    .single()

  if (fetchError || !oldToken) throw new Error('Token niet gevonden')

  const { error: rejectError } = await supabase
    .from('inspection_tokens')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (rejectError) throw rejectError

  const { data: newToken, error: createError } = await supabase
    .from('inspection_tokens')
    .insert({
      contract_id: oldToken.contract_id,
      property_id: oldToken.property_id,
      owner_id: oldToken.owner_id,
      landlord_items: oldToken.landlord_items,
    })
    .select('token')
    .single()

  if (createError) throw createError
  return newToken.token as string
}
