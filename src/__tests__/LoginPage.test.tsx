import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from '../contexts/AuthContext'
import LoginPage from '../pages/LoginPage'

const mockAuth = {
  user: null as User | null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}

function renderLoginPage(user: User | null = null) {
  return render(
    <AuthContext.Provider value={{ ...mockAuth, user }}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('LoginPage', () => {
  it('toont e-mail/wachtwoord formulier', () => {
    renderLoginPage()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wachtwoord/i)).toBeInTheDocument()
  })

  it('schakelt naar registratieformulier via account aanmaken knop', () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /account aanmaken/i }))
    expect(screen.getByRole('button', { name: /registreren/i })).toBeInTheDocument()
  })

  it('redirecteert naar dashboard als al ingelogd', () => {
    renderLoginPage({ id: 'u1', email: 'test@test.com' } as User)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('toont "Wachtwoord vergeten?" link in login mode', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /wachtwoord vergeten/i })).toBeInTheDocument()
  })

  it('schakelt naar forgot mode en verbergt wachtwoordveld', () => {
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord vergeten/i }))
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/wachtwoord/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verstuur reset-link/i })).toBeInTheDocument()
  })

  it('roept resetPassword aan bij submit in forgot mode', async () => {
    mockAuth.resetPassword.mockResolvedValueOnce(undefined)
    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord vergeten/i }))
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'test@test.be' } })
    fireEvent.click(screen.getByRole('button', { name: /verstuur reset-link/i }))
    await screen.findByText(/check je inbox/i)
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@test.be')
  })

  it('verbergt "Wachtwoord vergeten?" link als resetPassword undefined is (demo)', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuth, resetPassword: undefined }}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.queryByRole('button', { name: /wachtwoord vergeten/i })).not.toBeInTheDocument()
  })
})
