import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WizardLayout from '../pages/wizard/WizardLayout'

const STEPS = ['Kamer', 'Student', 'Partij', 'Overzicht']

function renderWizard(props = {}) {
  return render(
    <WizardLayout
      steps={STEPS}
      currentStep={2}
      onBack={vi.fn()}
      onNext={vi.fn()}
      canProceed={true}
      isLastStep={false}
      isSending={false}
      {...props}
    >
      <div>Stap inhoud</div>
    </WizardLayout>,
  )
}

describe('WizardLayout', () => {
  it('toont de stapindicator en inhoud', () => {
    renderWizard()

    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Stap inhoud')).toBeInTheDocument()
  })

  it('roept onNext aan bij klik op Volgende', () => {
    const onNext = vi.fn()
    renderWizard({ onNext })

    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('roept onBack aan bij klik op Terug', () => {
    const onBack = vi.fn()
    renderWizard({ onBack })

    fireEvent.click(screen.getByRole('button', { name: /terug/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('toont versturen en loading states', () => {
    const { rerender } = renderWizard({ isLastStep: true })
    expect(screen.getByRole('button', { name: /contract versturen/i })).toBeInTheDocument()

    rerender(
      <WizardLayout
        steps={STEPS}
        currentStep={4}
        onBack={vi.fn()}
        onNext={vi.fn()}
        canProceed={true}
        isLastStep={true}
        isSending={true}
      >
        <div>Stap inhoud</div>
      </WizardLayout>,
    )

    expect(screen.getByText(/wordt verstuurd/i)).toBeInTheDocument()
  })

  it('disablet Volgende knop als canProceed false is', () => {
    renderWizard({ canProceed: false })

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })
})
