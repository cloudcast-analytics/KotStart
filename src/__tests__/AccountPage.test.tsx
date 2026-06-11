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
    expect(screen.getByLabelText('Landcode rekeningnummer')).toBeInTheDocument()
    expect(screen.queryByLabelText('EPC-certificaatnummer')).not.toBeInTheDocument()
  })

  it('toont accountgegevens met inlog e-mailadres en geblokkeerde wijzig-acties', () => {
    renderPage()

    expect(screen.getByText('Accountgegevens')).toBeInTheDocument()
    expect(screen.getByLabelText('Inlog e-mailadres')).toHaveValue('verhuurder@test.be')
    expect(screen.getByLabelText('Inlog e-mailadres')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wijzigen' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wachtwoord wijzigen' })).toBeDisabled()
  })

  it('slaat verhuurderprofiel op en toont naam/voornaam read-only in profiel verhuurder', async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Voornaam'), {
      target: { value: 'Geert' },
    })
    fireEvent.change(screen.getByLabelText('Naam'), {
      target: { value: 'Ferson' },
    })
    fireEvent.change(screen.getByLabelText('Landcode rekeningnummer'), {
      target: { value: 'NL' },
    })
    fireEvent.change(screen.getByLabelText('Bankrekeningnummer'), {
      target: { value: '12 3456 7890 1234' },
    })

    expect(screen.getByText('Geert')).toBeInTheDocument()
    expect(screen.getByText('Ferson')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /profiel opslaan/i }))

    expect(await screen.findByRole('button', { name: /opgeslagen/i })).toBeInTheDocument()

    const stored = localStorage.getItem('kotstart_landlord_profile')
    expect(stored).toContain('Geert')
    expect(stored).toContain('Ferson')
    expect(stored).toContain('NL')
  })

  it('logt uit via de sessieknop', async () => {
    mockAuth.signOut.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /uitloggen/i }))

    expect(await screen.findByText('Login pagina')).toBeInTheDocument()
    expect(mockAuth.signOut).toHaveBeenCalled()
  })
})
