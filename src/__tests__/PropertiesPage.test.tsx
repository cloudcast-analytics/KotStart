import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PropertiesPage from '../pages/PropertiesPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertiesPage />
    </MemoryRouter>,
  )
}

describe('PropertiesPage', () => {
  it('toont de pandenlijst met aantal kamers', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Panden' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /open residentie de linde/i })).toBeInTheDocument()
    expect(screen.getByText('Kot Guldensporenstraat')).toBeInTheDocument()
    expect(screen.getByText('7 kamers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2025–2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Residentie De Linde' })).not.toBeInTheDocument()
  })

  it('toont kamers na klikken op een pand', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open residentie de linde/i }))

    expect(screen.getByRole('heading', { name: 'Residentie De Linde' })).toBeInTheDocument()
    expect(screen.getByText('Kamer 01')).toBeInTheDocument()
    expect(screen.getAllByText('€ 450/maand').length).toBeGreaterThan(0)
  })

  it('toont per kamer de bewoner of dat de kamer vrij is', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open residentie de linde/i }))

    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /koppeling openen/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deze kamer is vrij in 2025–2026').length).toBeGreaterThan(0)
  })

  it('kan terug naar de pandenlijst', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open residentie de linde/i }))
    fireEvent.click(screen.getByRole('button', { name: /^panden$/i }))

    expect(screen.getByRole('heading', { name: 'Panden' })).toBeInTheDocument()
  })

  it('kan een kamer lokaal bewerken', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /open residentie de linde/i }))
    fireEvent.click(screen.getByRole('button', { name: /kamer 01 bewerken/i }))
    fireEvent.change(screen.getByLabelText('Huurprijs'), { target: { value: '499' } })
    fireEvent.click(screen.getByRole('button', { name: /opslaan/i }))

    expect(await screen.findByText('€ 499/maand')).toBeInTheDocument()
  })
})
