import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthContext } from '../contexts/AuthContext'
import ResetPasswordPage from '../pages/ResetPasswordPage'

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
    },
  },
}))

const mockAuth = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
}

function renderPage(opts?: { demo?: boolean }) {
  const updatePassword = opts?.demo ? undefined : mockAuth.updatePassword
  return render(
    <AuthContext.Provider value={{ ...mockAuth, updatePassword }}>
      <MemoryRouter initialEntries={['/reset-password']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login</div>} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockAuth.updatePassword.mockReset()
  })

  it('toont twee wachtwoordvelden na sessie-check', async () => {
    renderPage()
    expect(await screen.findByLabelText(/nieuw wachtwoord/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bevestig wachtwoord/i)).toBeInTheDocument()
  })

  it('toont foutmelding als wachtwoorden niet overeenkomen', async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText(/nieuw wachtwoord/i), { target: { value: 'geheim123' } })
    fireEvent.change(screen.getByLabelText(/bevestig wachtwoord/i), { target: { value: 'anders456' } })
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord opslaan/i }))
    expect(await screen.findByText(/komen niet overeen/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('toont foutmelding als wachtwoord te kort is', async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText(/nieuw wachtwoord/i), { target: { value: '12345' } })
    fireEvent.change(screen.getByLabelText(/bevestig wachtwoord/i), { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord opslaan/i }))
    expect(await screen.findByText(/minstens 6 tekens/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  it('roept updatePassword aan bij geldige input', async () => {
    mockAuth.updatePassword.mockResolvedValueOnce(undefined)
    renderPage()
    fireEvent.change(await screen.findByLabelText(/nieuw wachtwoord/i), { target: { value: 'geheim123' } })
    fireEvent.change(screen.getByLabelText(/bevestig wachtwoord/i), { target: { value: 'geheim123' } })
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord opslaan/i }))
    expect(await screen.findByText(/succesvol gewijzigd/i)).toBeInTheDocument()
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('geheim123')
  })

  it('toont demo-modus melding als updatePassword undefined is', async () => {
    renderPage({ demo: true })
    expect(await screen.findByText(/niet beschikbaar|ongeldig of verlopen/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nieuw wachtwoord/i)).not.toBeInTheDocument()
  })
})
