import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from '../contexts/AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'

const mockAuth = {
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}

function renderWithAuth(user: User | null) {
  return render(
    <AuthContext.Provider value={{ ...mockAuth, user }}>
      <MemoryRouter initialEntries={['/beschermd']}>
        <Routes>
          <Route path="/login" element={<div>Login pagina</div>} />
          <Route
            path="/beschermd"
            element={
              <ProtectedRoute>
                <div>Beschermde inhoud</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('redirecteert naar /login als niet ingelogd', () => {
    renderWithAuth(null)
    expect(screen.getByText('Login pagina')).toBeInTheDocument()
    expect(screen.queryByText('Beschermde inhoud')).not.toBeInTheDocument()
  })

  it('toont de inhoud als ingelogd', () => {
    renderWithAuth({ id: 'u1', email: 'test@test.com' } as User)
    expect(screen.getByText('Beschermde inhoud')).toBeInTheDocument()
    expect(screen.queryByText('Login pagina')).not.toBeInTheDocument()
  })
})
