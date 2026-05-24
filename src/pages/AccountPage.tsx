import { useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'

export default function AccountPage() {
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
      <div className="p-8 text-slate-600">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-2 text-sm">Komt later.</p>
      </div>
    </AppShell>
  )
}
