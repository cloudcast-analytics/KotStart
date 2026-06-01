import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'

export default function AccountPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <AppShell
      schoolYear={schoolYear}
      propertyId={propertyId}
      onSchoolYearChange={setSchoolYear}
      onPropertyChange={setPropertyId}
      properties={PROPERTIES}
      schoolYears={SCHOOL_YEARS}
      showSchoolYearFilter={false}
      showPropertyFilter={false}
    >
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>

        {user && (
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        )}

        <div className="mt-8">
          <button
            onClick={handleSignOut}
            className="rounded-xl bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </AppShell>
  )
}
