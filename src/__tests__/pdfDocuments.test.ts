import { describe, expect, it } from 'vitest'
import { generateContractHtml } from '../lib/pdfDocuments'
import { CONTRACTS, PROPERTIES, ROOMS, STUDENTS } from '../lib/mockData'

const mockBundle = {
  contract: CONTRACTS[0],
  room: ROOMS[0],
  property: PROPERTIES[0],
  student: STUDENTS[0],
}

describe('generateContractHtml', () => {
  it('geeft een string terug', () => {
    expect(typeof generateContractHtml(mockBundle)).toBe('string')
  })

  it('bevat de naam van de student', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('Emma Janssen')
  })

  it('bevat het adres van het pand', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('Lindestraat 12, 9000 Gent')
  })

  it('bevat de huurprijs', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('450')
  })

  it('bevat de verhuurdersnaam', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('Geert Vandenberghe')
  })

  it('bevat een plaatsbeschrijvingstabel met standaarditems ook zonder inspectie', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('Plaatsbeschrijving')
    expect(html).toContain('Aanrecht')
    expect(html).toContain('Rookmelder')
  })

  it('vult de inspectietoestand in wanneer er items zijn', () => {
    const bundleWithInspection = {
      ...mockBundle,
      inspection: {
        id: 'i1',
        contractId: 'c1',
        type: 'start' as const,
        overviewPhotoUrl: undefined,
        createdAt: '2025-09-23',
      },
      inspectionItems: [
        {
          id: 'ii1',
          inspectionId: 'i1',
          category: 'Keuken',
          itemName: 'Aanrecht',
          condition: 'good' as const,
          photoUrl: undefined,
        },
        {
          id: 'ii2',
          inspectionId: 'i1',
          category: 'Badkamer',
          itemName: 'Douche',
          condition: 'moderate' as const,
          photoUrl: undefined,
        },
      ],
    }
    const html = generateContractHtml(bundleWithInspection)
    expect(html).toContain('Goed')
    expect(html).toContain('Matig')
  })
})
