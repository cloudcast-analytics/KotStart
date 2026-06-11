import { describe, expect, it } from 'vitest'
import { getContractBundleData, getContracts, getDashboardRowsData, getInspectionCategories, nextSchoolYear, saveInspectionCategories } from '../lib/data'
import { DEFAULT_INSPECTION_CATEGORIES } from '../lib/mockData'

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
