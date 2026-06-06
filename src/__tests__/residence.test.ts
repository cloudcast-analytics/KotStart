import { describe, it, expect } from 'vitest'
import { formatResidence, isValidBelgianPostalCode } from '../lib/residence'

describe('formatResidence', () => {
  it('stelt straat, nummer, postcode en gemeente samen', () => {
    expect(
      formatResidence({
        residenceStreet: 'Kerkstraat',
        residenceNumber: '22',
        residencePostalCode: '9200',
        residenceCity: 'Dendermonde',
      }),
    ).toBe('Kerkstraat 22, 9200 Dendermonde')
  })

  it('voegt het busnummer toe indien aanwezig', () => {
    expect(
      formatResidence({
        residenceStreet: 'Kerkstraat',
        residenceNumber: '22',
        residenceBox: '3',
        residencePostalCode: '9200',
        residenceCity: 'Dendermonde',
      }),
    ).toBe('Kerkstraat 22 bus 3, 9200 Dendermonde')
  })

  it('laat ontbrekende delen netjes weg', () => {
    expect(formatResidence({ residenceStreet: 'Kerkstraat', residenceNumber: '22' })).toBe(
      'Kerkstraat 22',
    )
  })

  it('geeft een lege string terug zonder invoer', () => {
    expect(formatResidence({})).toBe('')
  })

  it('trimt spaties rond veldwaarden', () => {
    expect(
      formatResidence({ residenceStreet: '  Kerkstraat  ', residenceNumber: ' 22 ' }),
    ).toBe('Kerkstraat 22')
  })

  it('laat de bus weg zonder straatregel', () => {
    expect(
      formatResidence({ residenceBox: '3', residencePostalCode: '9000', residenceCity: 'Gent' }),
    ).toBe('9000 Gent')
  })
})

describe('isValidBelgianPostalCode', () => {
  it('aanvaardt een 4-cijferige code tussen 1000 en 9999', () => {
    expect(isValidBelgianPostalCode('9000')).toBe(true)
    expect(isValidBelgianPostalCode('1000')).toBe(true)
  })

  it('weigert alles dat geen 4 cijfers is die met 1-9 starten', () => {
    expect(isValidBelgianPostalCode('900')).toBe(false)
    expect(isValidBelgianPostalCode('90000')).toBe(false)
    expect(isValidBelgianPostalCode('0999')).toBe(false)
    expect(isValidBelgianPostalCode('9a00')).toBe(false)
    expect(isValidBelgianPostalCode('')).toBe(false)
  })
})
