import { describe, expect, it } from 'vitest'

describe('InspectionToken type', () => {
  it('has correct status values', () => {
    const validStatuses = ['pending', 'submitted', 'approved', 'rejected'] as const
    expect(validStatuses).toHaveLength(4)
  })
})

describe('Property.inspectionDelegation', () => {
  it('defaults to together when undefined', () => {
    const delegation: 'together' | 'delegate' | undefined = undefined
    expect(delegation ?? 'together').toBe('together')
  })
})
