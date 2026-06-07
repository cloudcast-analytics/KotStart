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

  it('laat de verhuurdersnaam leeg wanneer die nog niet is ingevuld', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('<span></span>')
  })

  it('bevat een plaatsbeschrijvingstabel met standaarditems ook zonder inspectie', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('Plaatsbeschrijving')
    expect(html).toContain('Aanrecht')
    expect(html).toContain('Rookmelder')
  })

  it('bevat de onderwijsinstelling van de student', () => {
    const html = generateContractHtml({
      ...mockBundle,
      student: { ...STUDENTS[0], institution: 'Universiteit Gent' },
    })
    expect(html).toContain('Universiteit Gent')
  })

  it('bevat het IBAN van de verhuurder in art. 5', () => {
    const html = generateContractHtml({
      ...mockBundle,
      landlord: {
        name: 'Geert Vandenberghe',
        dateOfBirth: '15 maart 1972, Gent',
        address: 'Veldstraat 89, 9000 Gent',
        phone: '0498 12 34 56',
        email: 'geert@test.be',
        iban: 'BE12 3456 7890 1234',
        bic: 'GEBABEBB',
        bank: 'BNP Paribas Fortis',
        insuranceCompany: 'AXA Belgium',
        policyNumber: 'AXA-2025-001',
        epcLabel: 'C',
        epcNumber: 'EPC-2025-001',
      },
    })
    expect(html).toContain('BE12 3456 7890 1234')
    expect(html).toContain('GEBABEBB')
  })

  it('bevat de handtekening als data URL wanneer opgegeven', () => {
    const html = generateContractHtml({
      ...mockBundle,
      signatureDataUrl: 'data:image/png;base64,abc123',
    })
    expect(html).toContain('data:image/png;base64,abc123')
  })

  it('bevat handtekeningen van verhuurder en huurder wanneer opgegeven', () => {
    const html = generateContractHtml({
      ...mockBundle,
      landlordSignatureDataUrl: 'data:image/png;base64,landlord',
      studentSignatureDataUrl: 'data:image/png;base64,student',
    })

    expect(html).toContain('data:image/png;base64,landlord')
    expect(html).toContain('data:image/png;base64,student')
    expect(html).toContain('alt="Handtekening huurder"')
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

  it('toont "ANDERZIJDS, de HUURDER:" en één infoblok zonder tweede student', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('ANDERZIJDS, de HUURDER:')
    expect(html).not.toContain('ANDERZIJDS, de HUURDERS:')
    expect(html).not.toContain('Huurder 1')
  })

  it('toont "ANDERZIJDS, de HUURDERS:" en twee volledige infoblokken met tweede student', () => {
    const html = generateContractHtml({
      ...mockBundle,
      secondStudent: STUDENTS[1],
    })
    expect(html).toContain('ANDERZIJDS, de HUURDERS:')
    expect(html).toContain('Huurder 1')
    expect(html).toContain('Huurder 2')
    expect(html).toContain('Janssen, Emma')
    expect(html).toContain('Pieters, Liam')
    expect(html).toContain('liam.pieters@student.ugent.be')
  })
})
