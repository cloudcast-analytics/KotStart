import { describe, expect, it } from 'vitest'
import { calculateIndexedRentPure } from '../lib/indexation'

describe('calculateIndexedRentPure', () => {
  it('indexes rent correctly with known values', () => {
    // €500 base, startIndex 107.89, currentIndex 129.42
    const result = calculateIndexedRentPure(500, 107.89, 129.42)
    expect(result).toBeCloseTo(599.81, 1)
  })

  it('returns base rent when indices are equal', () => {
    const result = calculateIndexedRentPure(450, 120.5, 120.5)
    expect(result).toBe(450)
  })

  it('rounds to 2 decimal places', () => {
    const result = calculateIndexedRentPure(500, 100, 103.33)
    expect(result).toBe(516.65)
  })
})
