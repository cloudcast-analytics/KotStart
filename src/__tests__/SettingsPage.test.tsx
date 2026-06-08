import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SettingsPage from '../pages/SettingsPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('toont app-instellingen zonder verhuurderformulier', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Instellingen' })).toBeInTheDocument()
    expect(screen.getByText(/plaatsbeschrijvingscategorieen/i)).toBeInTheDocument()
    expect(screen.getByText(/verhuurdergegevens staan voortaan bij account/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Naam en voornamen')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /opslaan/i })).not.toBeInTheDocument()
  })
})
