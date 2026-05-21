import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Chip from '../components/ui/Chip'

describe('Chip', () => {
  it('toont het label', () => {
    render(<Chip label="2025–2026" onClick={() => {}} />)
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
  })

  it('roept onClick aan bij klik', () => {
    const onClick = vi.fn()
    render(<Chip label="Residentie De Linde" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('toont het chevron-icoon', () => {
    render(<Chip label="Test" onClick={() => {}} />)
    expect(document.querySelector('svg')).toBeInTheDocument()
  })
})
