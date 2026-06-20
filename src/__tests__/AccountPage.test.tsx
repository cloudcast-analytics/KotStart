import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import AccountPage from '../pages/AccountPage'
import { AuthContext } from '../contexts/AuthContext'

const mockAuth = {
  user: { id: 'u1', email: 'verhuurder@test.be' } as User,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
}

function renderPage() {
  return render(
    <AuthContext.Provider value={mockAuth}>
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<div>Login pagina</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AccountPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.signOut.mockReset()
    mockAuth.updateEmail.mockReset()
    mockAuth.updatePassword.mockReset()
  })

  it('toont account en verhuurderprofielvelden', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('Profiel verhuurder')).toBeInTheDocument()
    expect(screen.getByLabelText('Voornaam')).toBeInTheDocument()
    expect(screen.getByLabelText('Naam')).toBeInTheDocument()
    expect(screen.getByLabelText('Straat')).toBeInTheDocument()
    expect(screen.getByLabelText('Nummer')).toBeInTheDocument()
    expect(screen.getByLabelText('Postcode')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemeente')).toBeInTheDocument()
    expect(screen.getByLabelText('Telefoonnummer')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mailadres')).toBeInTheDocument()
    expect(screen.getByLabelText('Bankrekeningnummer')).toBeInTheDocument()
    expect(screen.getByText('BE')).toBeInTheDocument()
    expect(screen.queryByLabelText('EPC-certificaatnummer')).not.toBeInTheDocument()
  })

  it('toont accountgegevens met inlog e-mailadres en actieve wijzig-knoppen', () => {
    renderPage()

    expect(screen.getByText('Accountgegevens')).toBeInTheDocument()
    expect(screen.getByLabelText('Inlog e-mailadres')).toHaveValue('verhuurder@test.be')
    expect(screen.getByLabelText('Inlog e-mailadres')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Wachtwoord wijzigen' })).toBeEnabled()
  })

  it('toont geblokkeerde wijzig-knoppen wanneer updateEmail/updatePassword niet beschikbaar zijn', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuth, updateEmail: undefined, updatePassword: undefined }}>
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route path="/account" element={<AccountPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wachtwoord wijzigen' })).toBeDisabled()
  })

  it('toont bewerkingsveld na klikken op e-mailadres Wijzigen', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wijzigen' }))

    expect(screen.getByLabelText('Nieuw e-mailadres')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Opslaan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuleren' })).toBeInTheDocument()
  })

  it('verstuurt updateEmail en toont bevestiging bij opslaan nieuw e-mailadres', async () => {
    mockAuth.updateEmail.mockResolvedValueOnce(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wijzigen' }))
    fireEvent.change(screen.getByLabelText('Nieuw e-mailadres'), { target: { value: 'nieuw@test.be' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    expect(await screen.findByText(/bevestigingsmail verstuurd/i)).toBeInTheDocument()
    expect(mockAuth.updateEmail).toHaveBeenCalledWith('nieuw@test.be')
  })

  it('toont foutmelding bij ongeldig nieuw e-mailadres', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wijzigen' }))
    fireEvent.change(screen.getByLabelText('Nieuw e-mailadres'), { target: { value: 'geen-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    expect(await screen.findByText(/geldig e-mailadres/i)).toBeInTheDocument()
    expect(mockAuth.updateEmail).not.toHaveBeenCalled()
  })

  it('toont wachtwoordformulier na klikken op Wachtwoord wijzigen', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord wijzigen' }))

    expect(screen.getByLabelText('Nieuw wachtwoord')).toBeInTheDocument()
    expect(screen.getByLabelText('Bevestig wachtwoord')).toBeInTheDocument()
  })

  it('wijzigt wachtwoord en toont bevestiging bij overeenstemmende wachtwoorden', async () => {
    mockAuth.updatePassword.mockResolvedValueOnce(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord wijzigen' }))
    fireEvent.change(screen.getByLabelText('Nieuw wachtwoord'), { target: { value: 'NieuwWachtwoord1!' } })
    fireEvent.change(screen.getByLabelText('Bevestig wachtwoord'), { target: { value: 'NieuwWachtwoord1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    expect(await screen.findByText(/wachtwoord gewijzigd/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('NieuwWachtwoord1!')
  })

  it('toont foutmelding bij niet-overeenkomende wachtwoorden', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord wijzigen' }))
    fireEvent.change(screen.getByLabelText('Nieuw wachtwoord'), { target: { value: 'Wachtwoord1!' } })
    fireEvent.change(screen.getByLabelText('Bevestig wachtwoord'), { target: { value: 'Anders123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    expect(await screen.findByText(/komen niet overeen/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('toont foutmelding bij wachtwoord korter dan 8 tekens', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord wijzigen' }))
    fireEvent.change(screen.getByLabelText('Nieuw wachtwoord'), { target: { value: 'kort' } })
    fireEvent.change(screen.getByLabelText('Bevestig wachtwoord'), { target: { value: 'kort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }))

    expect(await screen.findByText(/minimaal 8 tekens/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('slaat verhuurderprofiel op en toont naam/voornaam read-only in profiel verhuurder', async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Voornaam'), {
      target: { value: 'Geert' },
    })
    fireEvent.change(screen.getByLabelText('Naam'), {
      target: { value: 'Ferson' },
    })
    fireEvent.change(screen.getByLabelText('Bankrekeningnummer'), {
      target: { value: '12 3456 7890 1234' },
    })

    expect(screen.getByText('Geert')).toBeInTheDocument()
    expect(screen.getByText('Ferson')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /wijzigingen opslaan/i }))

    expect(await screen.findByRole('button', { name: /opgeslagen/i })).toBeInTheDocument()

    const stored = localStorage.getItem('kotstart_landlord_profile')
    expect(stored).toContain('Geert')
    expect(stored).toContain('Ferson')
  })

  it('logt uit via de sessieknop', async () => {
    mockAuth.signOut.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /uitloggen/i }))

    expect(await screen.findByText('Login pagina')).toBeInTheDocument()
    expect(mockAuth.signOut).toHaveBeenCalled()
  })
})
