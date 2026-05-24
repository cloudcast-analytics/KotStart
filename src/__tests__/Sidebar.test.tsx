import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('toont navigatie-items', () => {
    renderSidebar()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(screen.getByText('Panden')).toBeInTheDocument()
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Instellingen')).toBeInTheDocument()
  })

  it('begint uitgebreid', () => {
    renderSidebar()
    expect(screen.getByText('Overzicht')).toBeVisible()
  })

  it('verbergt labels na inklappen', () => {
    renderSidebar()
    const toggleBtn = screen.getByRole('button', { name: /inklappen/i })
    fireEvent.click(toggleBtn)
    expect(screen.getByText('Overzicht')).toHaveClass('opacity-0')
  })
})
