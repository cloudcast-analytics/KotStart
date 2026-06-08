import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Save } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import { getLandlordProfile, saveLandlordProfile } from '../lib/data'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'
import type { LandlordProfile } from '../types'

const LANDLORD_FIELDS: Array<{ key: keyof LandlordProfile; label: string; placeholder: string }> = [
  { key: 'name', label: 'Naam en voornamen', placeholder: 'Naam verhuurder' },
  { key: 'dateOfBirth', label: 'Geboortedatum en -plaats', placeholder: 'Geboortedatum en geboorteplaats' },
  { key: 'address', label: 'Adres', placeholder: 'Straat, nummer, postcode en gemeente' },
  { key: 'phone', label: 'Telefoon / gsm', placeholder: 'Telefoonnummer' },
  { key: 'email', label: 'E-mailadres', placeholder: 'E-mailadres' },
  { key: 'iban', label: 'IBAN (betalingsrekening)', placeholder: 'IBAN' },
  { key: 'bic', label: 'BIC-code', placeholder: 'BIC' },
  { key: 'bank', label: 'Bankinstelling', placeholder: 'Bankinstelling' },
  { key: 'insuranceCompany', label: 'Verzekeringsmaatschappij', placeholder: 'Verzekeringsmaatschappij' },
  { key: 'policyNumber', label: 'Polisnummer verzekering', placeholder: 'Polisnummer' },
  { key: 'epcLabel', label: 'EPC-label', placeholder: 'EPC-label' },
  { key: 'epcNumber', label: 'EPC-certificaatnummer', placeholder: 'EPC-certificaatnummer' },
]

export default function AccountPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [profile, setProfile] = useState<LandlordProfile>(getLandlordProfile)
  const [saved, setSaved] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setProfile(getLandlordProfile())
  }, [])

  function handleProfileChange(key: keyof LandlordProfile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    saveLandlordProfile(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

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
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900">Account</h1>
          {user && (
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          )}
        </section>

        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <section className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Profiel verhuurder
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Deze gegevens worden gebruikt in het huurcontract.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {LANDLORD_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={key} className="text-xs font-semibold text-slate-600">
                    {label}
                  </label>
                  <input
                    id={key}
                    type="text"
                    value={profile[key]}
                    onChange={event => handleProfileChange(key, event.target.value)}
                    placeholder={placeholder}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Opgeslagen!' : 'Profiel opslaan'}
          </button>
        </form>

        <section className="rounded-2xl border border-red-100 bg-red-50/70 p-5">
          <p className="text-sm font-bold text-red-700">Sessie</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Uitloggen
          </button>
        </section>
      </div>
    </AppShell>
  )
}
