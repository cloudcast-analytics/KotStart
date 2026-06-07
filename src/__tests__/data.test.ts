import { describe, expect, it } from 'vitest'
import { getContractBundleData } from '../lib/data'

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
