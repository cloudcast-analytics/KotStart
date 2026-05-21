import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EmptyState from '../pages/components/EmptyState'

describe('EmptyState', () => {
  it('toont de koptekst', () => {
    render(<EmptyState />)
    expect(screen.getByText('Nog geen studenten')).toBeInTheDocument()
  })

  it('toont de CTA instructie', () => {
    render(<EmptyState />)
    expect(screen.getByText(/nieuw contract/i)).toBeInTheDocument()
  })
})
