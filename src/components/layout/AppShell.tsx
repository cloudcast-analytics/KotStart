import { useEffect, useState, type ReactNode } from 'react'
import Drawer from './Drawer'
import TopBar from './TopBar'
import { addSchoolYear, getSchoolYears, nextSchoolYear } from '../../lib/data'
import { PROPERTIES, SCHOOL_YEARS } from '../../lib/mockData'
import type { Property } from '../../types'

interface AppShellProps {
  children: ReactNode
  schoolYear: string
  propertyId: string
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (id: string) => void
  properties?: Property[]
  schoolYears?: string[]
  showSchoolYearFilter?: boolean
  showPropertyFilter?: boolean
}

export default function AppShell({
  children,
  schoolYear,
  propertyId,
  onSchoolYearChange,
  onPropertyChange,
  properties = PROPERTIES,
  schoolYears: schoolYearsProp = SCHOOL_YEARS,
  showSchoolYearFilter = true,
  showPropertyFilter = true,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [schoolYears, setSchoolYears] = useState<string[]>(schoolYearsProp)

  useEffect(() => {
    let cancelled = false
    getSchoolYears().then(years => {
      if (!cancelled) setSchoolYears(years)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedProperty = properties.find(p => p.id === propertyId) ?? properties[0] ?? PROPERTIES[0]

  function handlePropertyChange(name: string) {
    const found = properties.find(p => p.name === name)
    if (found) onPropertyChange(found.id)
  }

  async function handleAddSchoolYear() {
    const last = schoolYears[schoolYears.length - 1] ?? schoolYear
    const newYear = nextSchoolYear(last)
    const updated = await addSchoolYear(newYear)
    if (updated) {
      setSchoolYears(updated)
    } else {
      setSchoolYears(prev => (prev.includes(newYear) ? prev : [...prev, newYear]))
    }
    onSchoolYearChange(newYear)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          schoolYear={schoolYear}
          propertyName={selectedProperty.name}
          schoolYears={schoolYears}
          propertyNames={properties.map(p => p.name)}
          onSchoolYearChange={onSchoolYearChange}
          onPropertyChange={handlePropertyChange}
          onAddSchoolYear={handleAddSchoolYear}
          onMenuClick={() => setDrawerOpen(true)}
          showMenuButton={true}
          showSchoolYearFilter={showSchoolYearFilter}
          showPropertyFilter={showPropertyFilter}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
