import { useEffect, useState } from 'react'
import { Save, Check } from 'lucide-react'
import { getLandlordProfile, saveLandlordProfile } from '../lib/data'
import type { LandlordProfile } from '../types'

const FIELDS: Array<{ key: keyof LandlordProfile; label: string; placeholder: string }> = [
  { key: 'name', label: 'Naam en voornamen', placeholder: 'Vandenberghe, Geert François' },
  { key: 'dateOfBirth', label: 'Geboortedatum en -plaats', placeholder: '15 maart 1972, Gent' },
  { key: 'nationalRegistryNumber', label: 'Rijksregisternummer', placeholder: '72.03.15-123.45' },
  { key: 'address', label: 'Adres', placeholder: 'Veldstraat 89, 9000 Gent' },
  { key: 'phone', label: 'Telefoon / gsm', placeholder: '0498 12 34 56' },
  { key: 'email', label: 'E-mailadres', placeholder: 'geert@kotbeheer.be' },
  { key: 'iban', label: 'IBAN (betalingsrekening)', placeholder: 'BE12 3456 7890 1234' },
  { key: 'bic', label: 'BIC-code', placeholder: 'GEBABEBB' },
  { key: 'bank', label: 'Bankinstelling', placeholder: 'BNP Paribas Fortis' },
  { key: 'insuranceCompany', label: 'Verzekeringsmaatschappij', placeholder: 'AXA Belgium' },
  { key: 'policyNumber', label: 'Polisnummer verzekering', placeholder: 'AXA-2025-001' },
  { key: 'epcLabel', label: 'EPC-label', placeholder: 'C' },
  { key: 'epcNumber', label: 'EPC-certificaatnummer', placeholder: '20250515-EPC-0001' },
]

export default function SettingsPage() {
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
  )
}
