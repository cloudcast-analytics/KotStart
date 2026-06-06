import { describe, it, expect } from 'vitest'
import { formatResidence, isValidBelgianPostalCode } from '../lib/residence'

describe('formatResidence', () => {
  it('composes street, number, postal code and city', () => {
    expect(
      formatResidence({
        residenceStreet: 'Kerkstraat',
        residenceNumber: '22',
        residencePostalCode: '9200',
        residenceCity: 'Dendermonde',
      }),
    ).toBe('Kerkstraat 22, 9200 Dendermonde')
  })

  it('includes the bus number when present', () => {
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

  it('omits missing parts gracefully', () => {
    expect(formatResidence({ residenceStreet: 'Kerkstraat', residenceNumber: '22' })).toBe(
      'Kerkstraat 22',
    )
  })

  it('returns an empty string when nothing is provided', () => {
    expect(formatResidence({})).toBe('')
  })
})

describe('isValidBelgianPostalCode', () => {
  it('accepts a 4-digit code between 1000 and 9999', () => {
    expect(isValidBelgianPostalCode('9000')).toBe(true)
    expect(isValidBelgianPostalCode('1000')).toBe(true)
  })

  it('rejects anything that is not 4 digits starting 1-9', () => {
    expect(isValidBelgianPostalCode('900')).toBe(false)
    expect(isValidBelgianPostalCode('90000')).toBe(false)
    expect(isValidBelgianPostalCode('0999')).toBe(false)
    expect(isValidBelgianPostalCode('9a00')).toBe(false)
    expect(isValidBelgianPostalCode('')).toBe(false)
  })
})
