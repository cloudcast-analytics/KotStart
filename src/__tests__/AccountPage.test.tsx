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
    expect(screen.getByText('verhuurder@test.be')).toBeInTheDocument()
    expect(screen.getByText('Profiel verhuurder')).toBeInTheDocument()
    expect(screen.getByLabelText('Naam en voornamen')).toBeInTheDocument()
    expect(screen.getByLabelText('IBAN (betalingsrekening)')).toBeInTheDocument()
    expect(screen.getByLabelText('EPC-certificaatnummer')).toBeInTheDocument()
  })

  it('slaat verhuurderprofiel op', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Naam en voornamen'), {
      target: { value: 'Geert Ferson' },
    })
    fireEvent.change(screen.getByLabelText('IBAN (betalingsrekening)'), {
      target: { value: 'BE12 3456 7890 1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: /profiel opslaan/i }))

    expect(localStorage.getItem('kotstart_landlord_profile')).toContain('Geert Ferson')
    expect(screen.getByRole('button', { name: /opgeslagen/i })).toBeInTheDocument()
  })

  it('logt uit via de sessieknop', async () => {
    mockAuth.signOut.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /uitloggen/i }))

    expect(await screen.findByText('Login pagina')).toBeInTheDocument()
    expect(mockAuth.signOut).toHaveBeenCalled()
  })
})
