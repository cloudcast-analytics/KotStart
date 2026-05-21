import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StepIndicator from '../pages/wizard/StepIndicator'

const STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

describe('StepIndicator', () => {
  it('toont alle staplabels', () => {
    render(<StepIndicator steps={STEPS} currentStep={1} />)

    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Partij')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
  })

  it('markeert de actieve stap', () => {
    render(<StepIndicator steps={STEPS} currentStep={2} />)

    expect(screen.getByTestId('step-2')).toHaveAttribute('data-active', 'true')
  })

  it('markeert vorige stappen als voltooid', () => {
    render(<StepIndicator steps={STEPS} currentStep={3} />)

    expect(screen.getByTestId('step-1')).toHaveAttribute('data-done', 'true')
    expect(screen.getAllByLabelText('Voltooid')).toHaveLength(2)
  })
})
