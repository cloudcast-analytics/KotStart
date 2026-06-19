import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import { isDemoMode, isSupabaseConfigured, supabase } from '../lib/supabase'

const DEMO_USER = { id: 'demo', email: 'demo@kotstart.be' } as User

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isDemoMode ? DEMO_USER : null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    if (isDemoMode) setUser(DEMO_USER)
  }

  const updateEmail = isSupabaseConfigured
    ? async (email: string) => {
        const { error } = await supabase.auth.updateUser(
          { email },
          { emailRedirectTo: window.location.origin }
        )
        if (error) throw error
      }
    : undefined

  const updatePassword = isSupabaseConfigured
    ? async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      }
    : undefined

  const resetPassword = isSupabaseConfigured
    ? async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
      }
    : undefined

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, updateEmail, updatePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}
