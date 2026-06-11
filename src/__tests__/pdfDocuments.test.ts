import { describe, expect, it } from 'vitest'
import { generateContractHtml, generateInspectionHtml } from '../lib/pdfDocuments'
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

  it('gebruikt de gemeente van het pand voor locatie-specifieke contractvelden', () => {
    const html = generateContractHtml({
      ...mockBundle,
      property: {
        ...PROPERTIES[0],
        street: 'Markt',
        number: '1',
        postalCode: '3000',
        city: 'Leuven',
      },
    })

    expect(html).toContain('Opgemaakt te Leuven')
    expect(html).toContain('Studentenbelasting (Stad Leuven)')
  })

  it('bevat de huurprijs', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('450')
  })

  it('laat de verhuurdersnaam leeg wanneer die nog niet is ingevuld', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('<span></span>')
  })

  it('verwijst naar een afzonderlijke plaatsbeschrijving zonder inspectietabel', () => {
    const html = generateContractHtml(mockBundle)
    expect(html).toContain('afzonderlijke, tegensprekelijke')
    expect(html).toContain('maakt geen inline onderdeel uit van dit contract-PDF')
    expect(html).not.toContain('Aanrecht')
    expect(html).not.toContain('Rookmelder')
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
        firstName: 'Geert',
        lastName: 'Vandenberghe',
        street: 'Veldstraat',
        number: '89',
        postalCode: '9000',
        city: 'Gent',
        phone: '0498 12 34 56',
        email: 'geert@test.be',
        ibanCountry: 'BE',
        iban: '12 3456 7890 1234',
      },
    })
    expect(html).toContain('BE12 3456 7890 1234')
    expect(html).toContain('Bankrekeningnummer')
    expect(html).not.toContain('BIC-nummer')
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

  it('toont wettelijke vertegenwoordiger als ondertekenaar bij een minderjarige student', () => {
    const html = generateContractHtml({
      ...mockBundle,
      student: STUDENTS.find(student => student.id === 's-demo-second-student')!,
      contract: { ...CONTRACTS[0], signedAt: '2025-09-14T10:00:00.000Z' },
    })

    expect(html).toContain('Handtekening wettelijke vertegenwoordiger / huurder')
    expect(html).toContain('Inge Grobben')
    expect(html).toContain('14/09/2025')
  })

  it('laat inspectietoestanden uit het contractdocument wanneer er items zijn', () => {
    const bundleWithInspection = {
      ...mockBundle,
      inspection: {
        id: 'i1',
        contractId: 'c1',
        type: 'start' as const,
        overviewPhotoUrls: [],
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
    expect(html).not.toContain('Goed')
    expect(html).not.toContain('Matig')
    expect(html).not.toContain('Aanrecht')
    expect(html).not.toContain('Douche')
  })

  it('neemt inspectie-items niet meer inline op in het contractdocument', () => {
    const bundleWithKeys = {
      ...mockBundle,
      inspection: {
        id: 'i1',
        contractId: 'c1',
        type: 'start' as const,
        overviewPhotoUrls: [],
        createdAt: '2025-09-23',
      },
      inspectionItems: [
        {
          id: 'ii1',
          inspectionId: 'i1',
          category: 'Algemeen',
          itemName: 'Sleutels',
          condition: null,
          keyCount: 2,
          photoUrl: undefined,
        },
      ],
    }
    const html = generateContractHtml(bundleWithKeys)
    expect(html).not.toContain('2 stuks')
    expect(html).not.toContain('Sleutels')
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

describe('generateInspectionHtml', () => {
  it('maakt een apart plaatsbeschrijvingsdocument met sleutelaantal', () => {
    const html = generateInspectionHtml({
      title: 'Startplaatsbeschrijving',
      type: 'start',
      createdAt: '2025-09-15T10:00:00.000Z',
      overviewPhotoUrls: ['data:image/png;base64,overview'],
      items: [
        {
          category: 'Algemeen',
          itemName: 'Sleutels',
          condition: null,
          keyCount: 3,
          meterValue: null,
          meterUnit: null,
          photoUrl: null,
        },
      ],
    })

    expect(html).toContain('<title>Startplaatsbeschrijving</title>')
    expect(html).toContain('Startplaatsbeschrijving')
    expect(html).toContain('15/9/2025')
    expect(html).toContain('Sleutels')
    expect(html).toContain('3 stuks')
    expect(html).toContain('data:image/png;base64,overview')
  })

  it('toont meterstand met eenheid in plaats van conditie of stuks', () => {
    const html = generateInspectionHtml({
      title: 'Startplaatsbeschrijving',
      type: 'start',
      createdAt: '2025-09-15T10:00:00.000Z',
      overviewPhotoUrls: [],
      items: [
        {
          category: 'Algemeen',
          itemName: 'Elektriciteitsmeter',
          condition: null,
          keyCount: null,
          meterValue: 1234,
          meterUnit: 'kWh',
          photoUrl: null,
        },
      ],
    })

    expect(html).toContain('Elektriciteitsmeter')
    expect(html).toContain('1234 kWh')
  })
})
