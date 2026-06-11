import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Save } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import { getLandlordProfile, saveLandlordProfile } from '../lib/data'
import { MOCK_LANDLORD_PROFILE, PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'
import type { LandlordProfile } from '../types'

const ACCOUNT_NAME_FIELDS: Array<{ key: 'firstName' | 'lastName'; label: string; placeholder: string }> = [
  { key: 'firstName', label: 'Voornaam', placeholder: 'Voornaam' },
  { key: 'lastName', label: 'Naam', placeholder: 'Naam' },
]

const PROFILE_FIELDS: Array<{ key: 'phone' | 'email'; label: string; placeholder: string }> = [
  { key: 'phone', label: 'Telefoonnummer', placeholder: 'Telefoonnummer' },
  { key: 'email', label: 'E-mailadres', placeholder: 'E-mailadres' },
]

const IBAN_COUNTRIES = ['BE', 'NL'] as const

const INPUT_CLASS =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

const READONLY_INPUT_CLASS =
  'rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400'

const DISABLED_BUTTON_CLASS =
  'shrink-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400'

const FIELD_LABEL_CLASS = 'text-xs font-semibold text-slate-600'

export default function AccountPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [profile, setProfile] = useState<LandlordProfile>(MOCK_LANDLORD_PROFILE)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    getLandlordProfile().then(loaded => {
      if (!cancelled) setProfile(loaded)
    })

    return () => { cancelled = true }
  }, [])

  function handleProfileChange(key: Exclude<keyof LandlordProfile, 'ibanCountry'>, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleIbanCountryChange(value: LandlordProfile['ibanCountry']) {
    setProfile(prev => ({ ...prev, ibanCountry: value }))
    setSaved(false)
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await saveLandlordProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profiel kon niet worden opgeslagen')
    }
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
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleProfileSave} className="flex flex-col gap-6">
          <section className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Profiel verhuurder
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Deze gegevens worden gebruikt in het huurcontract.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                {ACCOUNT_NAME_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex min-w-0 flex-col gap-1">
                    <span className={FIELD_LABEL_CLASS}>{label}</span>
                    <p className={`w-full min-w-0 truncate ${READONLY_INPUT_CLASS}`}>
                      {profile[key] || '—'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="street" className={FIELD_LABEL_CLASS}>
                    Straat
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={profile.street}
                    onChange={event => handleProfileChange('street', event.target.value)}
                    placeholder="Straatnaam"
                    className={`w-full min-w-0 ${INPUT_CLASS}`}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="number" className={FIELD_LABEL_CLASS}>
                    Nummer
                  </label>
                  <input
                    id="number"
                    type="text"
                    value={profile.number}
                    onChange={event => handleProfileChange('number', event.target.value)}
                    placeholder="Huisnummer"
                    className={`w-full min-w-0 ${INPUT_CLASS}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="postalCode" className={FIELD_LABEL_CLASS}>
                    Postcode
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={profile.postalCode}
                    onChange={event => handleProfileChange('postalCode', event.target.value)}
                    placeholder="Postcode"
                    className={`w-full min-w-0 ${INPUT_CLASS}`}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="city" className={FIELD_LABEL_CLASS}>
                    Gemeente
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={profile.city}
                    onChange={event => handleProfileChange('city', event.target.value)}
                    placeholder="Gemeente"
                    className={`w-full min-w-0 ${INPUT_CLASS}`}
                  />
                </div>
              </div>

              {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={key} className={FIELD_LABEL_CLASS}>
                    {label}
                  </label>
                  <input
                    id={key}
                    type="text"
                    value={profile[key]}
                    onChange={event => handleProfileChange(key, event.target.value)}
                    placeholder={placeholder}
                    className={INPUT_CLASS}
                  />
                  {key === 'email' && (
                    <p className="text-xs text-slate-400">
                      Dit e-mailadres komt op het huurcontract te staan en kan afwijken van je inlog-e-mailadres.
                    </p>
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-1 md:col-span-2">
                <label htmlFor="iban" className={FIELD_LABEL_CLASS}>
                  Bankrekeningnummer
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Landcode rekeningnummer"
                    value={profile.ibanCountry}
                    onChange={event => handleIbanCountryChange(event.target.value as LandlordProfile['ibanCountry'])}
                    className={`${INPUT_CLASS} shrink-0`}
                  >
                    {IBAN_COUNTRIES.map(code => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    id="iban"
                    type="text"
                    value={profile.iban}
                    onChange={event => handleProfileChange('iban', event.target.value)}
                    placeholder="Rekeningnummer"
                    className={`w-full min-w-0 flex-1 ${INPUT_CLASS}`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-bold text-white transition hover:bg-blue-700"
            >
              {saved ? <Check size={20} /> : <Save size={20} />}
              {saved ? 'Opgeslagen!' : 'Profiel opslaan'}
            </button>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Accountgegevens
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Deze gegevens identificeren je account en worden overgenomen in je verhuurderprofiel.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {ACCOUNT_NAME_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={`account-${key}`} className={FIELD_LABEL_CLASS}>
                    {label}
                  </label>
                  <input
                    id={`account-${key}`}
                    type="text"
                    value={profile[key]}
                    onChange={event => handleProfileChange(key, event.target.value)}
                    placeholder={placeholder}
                    className={INPUT_CLASS}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1 md:col-span-2">
                <label htmlFor="account-email" className={FIELD_LABEL_CLASS}>
                  Inlog e-mailadres
                </label>
                <div className="flex gap-2">
                  <input
                    id="account-email"
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className={`w-full min-w-0 flex-1 ${READONLY_INPUT_CLASS}`}
                  />
                  <button type="button" disabled title="Binnenkort beschikbaar" className={DISABLED_BUTTON_CLASS}>
                    Wijzigen
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Wachtwoord</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button type="button" disabled title="Binnenkort beschikbaar" className={`${DISABLED_BUTTON_CLASS} w-full sm:w-auto`}>
                    Wachtwoord wijzigen
                  </button>
                  <span className="text-xs text-slate-400">Binnenkort beschikbaar</span>
                </div>
              </div>
            </div>
          </section>
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
