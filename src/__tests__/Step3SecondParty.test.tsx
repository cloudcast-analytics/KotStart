import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Step3SecondParty from '../pages/wizard/Step3SecondParty'

const defaultProps = {
  roomType: 'single' as const,
  hasMinor: false,
  secondLandlord: null,
  secondTenant: null,
  guardian: null,
  onSecondLandlordChange: vi.fn(),
  onSecondTenantChange: vi.fn(),
  onGuardianChange: vi.fn(),
}

describe('Step3SecondParty', () => {
  it('toont toggle voor tweede verhuurder', () => {
    render(<Step3SecondParty {...defaultProps} />)

    expect(screen.getByRole('switch', { name: /tweede verhuurder/i })).toBeInTheDocument()
  })

  it('toont toggle voor tweede bewoner bij single kamer', () => {
    render(<Step3SecondParty {...defaultProps} roomType="single" />)

    expect(screen.getByRole('switch', { name: /tweede bewoner/i })).toBeInTheDocument()
  })

  it('verbergt toggle voor tweede bewoner bij dubbele kamer', () => {
    render(<Step3SecondParty {...defaultProps} roomType="double" />)

    expect(screen.queryByRole('switch', { name: /tweede bewoner/i })).not.toBeInTheDocument()
  })

  it('toont voogd-sectie automatisch bij minderjarige student', () => {
    render(<Step3SecondParty {...defaultProps} hasMinor={true} />)

    expect(screen.getByText('Voogd')).toBeInTheDocument()
    expect(screen.getByText(/vereist/i)).toBeInTheDocument()
  })

  it('roept change callback aan na toggle tweede verhuurder', () => {
    const onSecondLandlordChange = vi.fn()
    render(<Step3SecondParty {...defaultProps} onSecondLandlordChange={onSecondLandlordChange} />)

    fireEvent.click(screen.getByRole('switch', { name: /tweede verhuurder/i }))

    expect(onSecondLandlordChange).toHaveBeenCalledWith({ name: '', email: '' })
  })

  it('toont formulier als tweede verhuurder actief is', () => {
    render(<Step3SecondParty {...defaultProps} secondLandlord={{ name: '', email: '' }} />)

    expect(screen.getByLabelText(/naam verhuurder/i)).toBeInTheDocument()
  })
})
