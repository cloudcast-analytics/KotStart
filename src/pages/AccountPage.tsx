import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Save } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import FilterDropdown from '../components/ui/FilterDropdown'
import { getLandlordProfile, saveLandlordProfile } from '../lib/data'
import { MOCK_LANDLORD_PROFILE, PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/cn'
import type { LandlordProfile } from '../types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ACCOUNT_NAME_FIELDS: Array<{ key: 'firstName' | 'lastName'; label: string; placeholder: string }> = [
  { key: 'firstName', label: 'Voornaam', placeholder: 'Voornaam' },
  { key: 'lastName', label: 'Naam', placeholder: 'Naam' },
]

const PROFILE_FIELDS: Array<{ key: 'phone' | 'email'; label: string; placeholder: string }> = [
  { key: 'phone', label: 'Telefoonnummer', placeholder: 'Telefoonnummer' },
  { key: 'email', label: 'E-mailadres', placeholder: 'E-mailadres' },
]

const IBAN_COUNTRIES = ['BE'] as const
const IBAN_LENGTH: Record<string, number> = { BE: 14 }

function formatIbanInput(raw: string): string {
  const digits = raw.replace(/\s/g, '')
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function getIbanDigits(formatted: string): string {
  return formatted.replace(/\s/g, '')
}

const INPUT_CLASS =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

const READONLY_INPUT_CLASS =
  'rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400'

const DISABLED_BUTTON_CLASS =
  'shrink-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400'

const ACTION_BUTTON_CLASS =
  'shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100'

const CANCEL_BUTTON_CLASS =
  'shrink-0 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200'

const FIELD_LABEL_CLASS = 'text-xs font-semibold text-slate-600'

export default function AccountPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [profile, setProfile] = useState<LandlordProfile>(MOCK_LANDLORD_PROFILE)
  const initialProfile = useRef<LandlordProfile>(MOCK_LANDLORD_PROFILE)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [emailEditMode, setEmailEditMode] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [passwordEditMode, setPasswordEditMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const { user, signOut, updateEmail, updatePassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    getLandlordProfile().then(loaded => {
      if (!cancelled) {
        setProfile(loaded)
        initialProfile.current = loaded
      }
    })

    return () => { cancelled = true }
  }, [])

  const dirty = JSON.stringify(profile) !== JSON.stringify(initialProfile.current)
  const ibanValid = profile.iban.length === 0 || profile.iban.length === (IBAN_LENGTH[profile.ibanCountry] ?? 14)
  const canSave = dirty && ibanValid

  function handleProfileChange(key: Exclude<keyof LandlordProfile, 'ibanCountry'>, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleIbanCountryChange(value: string) {
    if (IBAN_COUNTRIES.includes(value as typeof IBAN_COUNTRIES[number])) {
      setProfile(prev => ({ ...prev, ibanCountry: value as LandlordProfile['ibanCountry'] }))
      setSaved(false)
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await saveLandlordProfile(profile)
      initialProfile.current = profile
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

  async function handleEmailSave() {
    if (!updateEmail) return
    setEmailError(null)
    if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
      setEmailError('Voer een geldig e-mailadres in.')
      return
    }
    try {
      await updateEmail(newEmail)
      setEmailEditMode(false)
      setEmailStatus(`Bevestigingsmail verstuurd naar ${newEmail}. Bevestig de wijziging via de link in de mail.`)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'E-mailadres kon niet worden gewijzigd.')
    }
  }

  async function handlePasswordSave() {
    if (!updatePassword) return
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('Wachtwoorden komen niet overeen.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Wachtwoord moet minimaal 8 tekens bevatten.')
      return
    }
    try {
      await updatePassword(newPassword)
      setPasswordEditMode(false)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStatus('Wachtwoord gewijzigd.')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Wachtwoord kon niet worden gewijzigd.')
    }
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
                  <FilterDropdown
                    label={profile.ibanCountry}
                    options={[...IBAN_COUNTRIES]}
                    onSelect={handleIbanCountryChange}
                    className="shrink-0 w-[72px]"
                  />
                  <input
                    id="iban"
                    type="text"
                    inputMode="numeric"
                    value={formatIbanInput(profile.iban)}
                    onChange={event => {
                      const digits = getIbanDigits(event.target.value).replace(/\D/g, '').slice(0, IBAN_LENGTH[profile.ibanCountry] ?? 14)
                      handleProfileChange('iban', digits)
                    }}
                    placeholder="0000 0000 0000 00"
                    className={`w-full min-w-0 flex-1 ${INPUT_CLASS}`}
                  />
                </div>
                {profile.iban.length > 0 && profile.iban.length !== (IBAN_LENGTH[profile.ibanCountry] ?? 14) && (
                  <p className="text-xs text-amber-600">
                    {profile.ibanCountry} rekeningnummer moet {IBAN_LENGTH[profile.ibanCountry] ?? 14} cijfers bevatten ({profile.iban.length}/{IBAN_LENGTH[profile.ibanCountry] ?? 14})
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSave && !saved}
              className={cn(
                'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition',
                canSave
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700'
                  : saved
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
              )}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Opgeslagen!' : 'Wijzigingen opslaan'}
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
                <label htmlFor={emailEditMode ? 'account-email-edit' : 'account-email'} className={FIELD_LABEL_CLASS}>
                  Inlog e-mailadres
                </label>
                {emailEditMode ? (
                  <div className="flex gap-2">
                    <input
                      id="account-email-edit"
                      type="email"
                      autoFocus
                      value={newEmail}
                      onChange={event => setNewEmail(event.target.value)}
                      placeholder="Nieuw e-mailadres"
                      aria-label="Nieuw e-mailadres"
                      className={`w-full min-w-0 flex-1 ${INPUT_CLASS}`}
                    />
                    <button type="button" onClick={handleEmailSave} className={ACTION_BUTTON_CLASS}>
                      Opslaan
                    </button>
                    <button type="button" onClick={() => { setEmailEditMode(false); setEmailError(null) }} className={CANCEL_BUTTON_CLASS}>
                      Annuleren
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="account-email"
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      className={`w-full min-w-0 flex-1 ${READONLY_INPUT_CLASS}`}
                    />
                    <button
                      type="button"
                      disabled={!updateEmail}
                      onClick={() => { setNewEmail(user?.email ?? ''); setEmailEditMode(true) }}
                      className={updateEmail ? ACTION_BUTTON_CLASS : DISABLED_BUTTON_CLASS}
                    >
                      Wijzigen
                    </button>
                  </div>
                )}
                {emailError && <p className="text-xs font-semibold text-red-600">{emailError}</p>}
                {emailStatus && <p className="text-xs font-semibold text-green-600">{emailStatus}</p>}
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <span className={FIELD_LABEL_CLASS}>Wachtwoord</span>
                {passwordEditMode ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="new-password" className="sr-only">Nieuw wachtwoord</label>
                      <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={event => setNewPassword(event.target.value)}
                        placeholder="Nieuw wachtwoord"
                        aria-label="Nieuw wachtwoord"
                        className={INPUT_CLASS}
                      />
                      <label htmlFor="confirm-password" className="sr-only">Bevestig wachtwoord</label>
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={event => setConfirmPassword(event.target.value)}
                        placeholder="Bevestig wachtwoord"
                        aria-label="Bevestig wachtwoord"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={handlePasswordSave} className={ACTION_BUTTON_CLASS}>
                        Opslaan
                      </button>
                      <button type="button" onClick={() => { setPasswordEditMode(false); setPasswordError(null); setNewPassword(''); setConfirmPassword('') }} className={CANCEL_BUTTON_CLASS}>
                        Annuleren
                      </button>
                    </div>
                    {passwordError && <p className="text-xs font-semibold text-red-600">{passwordError}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <button
                      type="button"
                      disabled={!updatePassword}
                      onClick={() => setPasswordEditMode(true)}
                      className={updatePassword ? `${ACTION_BUTTON_CLASS} w-full sm:w-auto` : `${DISABLED_BUTTON_CLASS} w-full sm:w-auto`}
                    >
                      Wachtwoord wijzigen
                    </button>
                    {passwordStatus && <span className="text-xs font-semibold text-green-600">{passwordStatus}</span>}
                  </div>
                )}
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
