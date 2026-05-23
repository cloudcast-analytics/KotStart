import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('toont panden en de knop om een nieuw pand toe te voegen', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Panden' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nieuw pand/i })).toBeInTheDocument()
    expect(await screen.findByText('Residentie De Linde')).toBeInTheDocument()
  })

  it('opent de modal voor een nieuw pand', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /nieuw pand/i }))

    expect(await screen.findByRole('heading', { name: 'Pand toevoegen' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pandnaam')).toBeInTheDocument()
    expect(screen.getByLabelText('Adres')).toBeInTheDocument()
  })

  it('voegt een pand toe in demo mode', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /nieuw pand/i }))
    fireEvent.change(await screen.findByLabelText('Pandnaam'), { target: { value: 'Testpand' } })
    fireEvent.change(screen.getByLabelText('Adres'), { target: { value: 'Teststraat 1, 9000 Gent' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Testpand' })).toBeInTheDocument()
    })
  })
})
