import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  it('toont studentennamen', () => {
    renderDashboard()
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByText('Liam Pieters')).toBeInTheDocument()
    expect(screen.getByText('Sara Bogaert')).toBeInTheDocument()
  })

  it('sorteert standaard op kamernummer oplopend', () => {
    renderDashboard()
    const rows = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe/)
    expect(rows[0].textContent).toContain('Janssen')
  })

  it('wisselt naar studentsortering bij klik op Student header', () => {
    renderDashboard()
    fireEvent.click(screen.getByRole('button', { name: /^student$/i }))
    const rows = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe/)
    expect(rows[0].textContent).toContain('Bogaert')
  })

  it('toont lege staat als er geen data is voor de selectie', () => {
    renderDashboard()
    const propertyChip = screen.getByText('Residentie De Linde')
    fireEvent.click(propertyChip)
    expect(screen.getByText('Nog geen studenten')).toBeInTheDocument()
  })
})
