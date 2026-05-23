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
  it('toont studentennamen', async () => {
    renderDashboard()
    expect(await screen.findByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByText('Liam Pieters')).toBeInTheDocument()
    expect(screen.getByText('Sara Bogaert')).toBeInTheDocument()
    expect(screen.getByText('Testpiet Demo')).toBeInTheDocument()
  })

  it('sorteert standaard op kamernummer oplopend', async () => {
    renderDashboard()
    await screen.findByText('Emma Janssen')
    const rows = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe|Testpiet/)
    expect(rows[0].textContent).toContain('Janssen')
  })

  it('wisselt naar studentsortering bij klik op Student header', async () => {
    renderDashboard()
    await screen.findByText('Emma Janssen')
    fireEvent.click(screen.getByRole('button', { name: /^student$/i }))
    const rows = screen.getAllByText(/Janssen|Pieters|Bogaert|De Smedt|Vandenberghe|Testpiet/)
    expect(rows[0].textContent).toContain('Bogaert')
  })

  it('geeft Testpiet alle dashboardacties', async () => {
    renderDashboard()

    await screen.findByText('Testpiet Demo')

    expect(screen.getAllByRole('button', { name: /startplaatsbeschrijving/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /contract verlengen/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /eindplaatsbeschrijving/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /contract openen voor testpiet demo/i })).toBeInTheDocument()
  })

  it('toont lege staat als er geen data is voor de selectie', async () => {
    renderDashboard()
    const propertyChip = await screen.findByText('Residentie De Linde')
    fireEvent.click(propertyChip)
    expect(await screen.findByText('Nog geen studenten')).toBeInTheDocument()
  })
})
