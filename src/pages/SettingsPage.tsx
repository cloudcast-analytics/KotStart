import { useEffect, useState } from 'react'
import { Save, Check } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import { getLandlordProfile, saveLandlordProfile } from '../lib/data'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import type { LandlordProfile } from '../types'

const FIELDS: Array<{ key: keyof LandlordProfile; label: string; placeholder: string }> = [
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

export default function SettingsPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [profile, setProfile] = useState<LandlordProfile>(getLandlordProfile)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setProfile(getLandlordProfile())
  }, [])

  function handleChange(key: keyof LandlordProfile, value: string) {
    setProfile(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveLandlordProfile(profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
      <div className="mx-auto max-w-xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">Instellingen</h1>
        <p className="mb-6 text-sm text-slate-500">
          Jouw verhuurdergegevens worden gebruikt in het huurcontract.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Verhuurder
            </p>
            <div className="flex flex-col gap-4">
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label htmlFor={key} className="text-xs font-semibold text-slate-600">
                    {label}
                  </label>
                  <input
                    id={key}
                    type="text"
                    value={profile[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Opgeslagen!' : 'Opslaan'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
