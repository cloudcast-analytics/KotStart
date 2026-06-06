import { describe, it, expect } from 'vitest'
import { VLAAMSE_INSTELLINGEN } from '../lib/institutions'

describe('VLAAMSE_INSTELLINGEN', () => {
  it('is a non-empty list', () => {
    expect(VLAAMSE_INSTELLINGEN.length).toBeGreaterThan(0)
  })

  it('contains the major Flemish universities', () => {
    expect(VLAAMSE_INSTELLINGEN).toContain('KU Leuven')
    expect(VLAAMSE_INSTELLINGEN).toContain('Universiteit Gent')
    expect(VLAAMSE_INSTELLINGEN).toContain('Vrije Universiteit Brussel')
  })

  it('has no duplicates', () => {
    expect(new Set(VLAAMSE_INSTELLINGEN).size).toBe(VLAAMSE_INSTELLINGEN.length)
  })

  it('is sorted alphabetically (nl locale)', () => {
    const sorted = [...VLAAMSE_INSTELLINGEN].sort((a, b) => a.localeCompare(b, 'nl'))
    expect(VLAAMSE_INSTELLINGEN).toEqual(sorted)
  })
})
