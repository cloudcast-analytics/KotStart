import { useState, type ReactNode } from 'react'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
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
  showPropertyFilter?: boolean
}

export default function AppShell({
  children,
  schoolYear,
  propertyId,
  onSchoolYearChange,
  onPropertyChange,
  properties = PROPERTIES,
  schoolYears = SCHOOL_YEARS,
  showPropertyFilter = true,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedProperty = properties.find(p => p.id === propertyId) ?? properties[0] ?? PROPERTIES[0]

  function handlePropertyChange(name: string) {
    const found = properties.find(p => p.name === name)
    if (found) onPropertyChange(found.id)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          schoolYear={schoolYear}
          propertyName={selectedProperty.name}
          schoolYears={schoolYears}
          propertyNames={properties.map(p => p.name)}
          onSchoolYearChange={onSchoolYearChange}
          onPropertyChange={handlePropertyChange}
          onMenuClick={() => setDrawerOpen(true)}
          showMenuButton={true}
          showPropertyFilter={showPropertyFilter}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
