import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'

export default function SettingsPage() {
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)

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
          App-instellingen komen hier: plaatsbeschrijvingscategorieen, thema en taal.
        </p>

        <section className="rounded-2xl border border-white/70 bg-white/50 p-5 backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Binnenkort
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            Verhuurdergegevens staan voortaan bij Account.
          </p>
        </section>
      </div>
    </AppShell>
  )
}
