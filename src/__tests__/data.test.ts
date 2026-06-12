import { describe, expect, it } from 'vitest'
import { addSchoolYear, createContractRenewal, getAvailableRoomsForRenewal, getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, getSchoolYears, nextSchoolYear, saveInspectionCategories } from '../lib/data'
import { DEFAULT_INSPECTION_CATEGORIES, SCHOOL_YEARS } from '../lib/mockData'

describe('getContractBundleData', () => {
  it('lost de tweede student op wanneer secondStudentId gezet is', async () => {
    const bundle = await getContractBundleData('c-demo-student')

    expect(bundle?.secondStudent?.firstName).toBe('Senne')
    expect(bundle?.secondStudent?.lastName).toBe('Grobben')
  })

  it('laat secondStudent ongedefinieerd wanneer er geen tweede student is', async () => {
    const bundle = await getContractBundleData('c1')

    expect(bundle?.secondStudent).toBeUndefined()
  })
})

describe('getDashboardRowsData', () => {
  it('combineert de namen van beide studenten in de rij', async () => {
    const rows = await getDashboardRowsData('p1', '2025–2026')
    const row = rows.find(r => r.contractId === 'c-demo-student')

    expect(row?.secondFirstName).toBe('Senne')
    expect(row?.secondLastName).toBe('Grobben')
  })

  it('laat secondFirstName/secondLastName ongedefinieerd zonder tweede student', async () => {
    const rows = await getDashboardRowsData('p1', '2025–2026')
    const row = rows.find(r => r.contractId === 'c1')

    expect(row?.secondFirstName).toBeUndefined()
    expect(row?.secondLastName).toBeUndefined()
  })
})

describe('getInspectionCategories', () => {
  it('geeft DEFAULT_INSPECTION_CATEGORIES terug in demo-modus', async () => {
    const categories = await getInspectionCategories('p1')
    expect(categories).toEqual(DEFAULT_INSPECTION_CATEGORIES)
  })
})

describe('saveInspectionCategories', () => {
  it('doet niets in demo-modus (geen Supabase)', async () => {
    await expect(saveInspectionCategories('p1', DEFAULT_INSPECTION_CATEGORIES)).resolves.toBeUndefined()
  })
})

describe('getContracts', () => {
  it('geeft de prijssnapshot van elk contract door', async () => {
    const contracts = await getContracts()
    const c1 = contracts.find(c => c.id === 'c1')

    expect(c1?.monthlyRent).toBe(450)
    expect(c1?.fixedCosts).toBe(60)
    expect(c1?.studentTax).toBe(12)
  })
})

describe('nextSchoolYear', () => {
  it('telt beide jaartallen op met 1', () => {
    expect(nextSchoolYear('2025–2026')).toBe('2026–2027')
  })

  it('geeft de input ongewijzigd terug bij een onverwacht formaat', () => {
    expect(nextSchoolYear('onbekend')).toBe('onbekend')
  })
})

describe('getAvailableRoomsForRenewal', () => {
  it('geeft alle kamers van het pand terug voor een schooljaar zonder contracten', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2026–2027', 'c1')

    expect(rooms.map(r => r.id)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'])
  })

  it('sluit volle kamers uit, telt het te verlengen contract zelf niet mee', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2025–2026', 'c1')

    expect(rooms.map(r => r.id)).toEqual(['r1', 'r3', 'r5', 'r6'])
  })

  it('negeert draft-contracten en telt de eigen kamer van een ander contract niet mee', async () => {
    const rooms = await getAvailableRoomsForRenewal('p1', '2025–2026', 'c-demo-student')

    expect(rooms.map(r => r.id)).toEqual(['r3', 'r5', 'r6'])
  })
})

describe('createContractRenewal', () => {
  it('doet niets en geeft null terug in demo-modus', async () => {
    await expect(createContractRenewal({
      previousContractId: 'c1',
      roomId: 'r1',
      schoolYear: '2026–2027',
      monthlyRent: 450,
      fixedCosts: 60,
      studentTax: 12,
    })).resolves.toBeNull()
  })
})

describe('getSchoolYears', () => {
  it('geeft SCHOOL_YEARS terug in demo-modus', async () => {
    const years = await getSchoolYears()

    expect(years).toEqual(SCHOOL_YEARS)
    expect(years[0]).toContain('–')
  })
})

describe('addSchoolYear', () => {
  it('geeft null terug in demo-modus', async () => {
    await expect(addSchoolYear('2028–2029')).resolves.toBeNull()
  })
})
