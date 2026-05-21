import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Drawer from './Drawer'
import TopBar from './TopBar'
import { PROPERTIES, SCHOOL_YEARS } from '../../lib/mockData'

interface AppShellProps {
  children: ReactNode
  schoolYear: string
  propertyId: string
  onSchoolYearChange: (year: string) => void
  onPropertyChange: (id: string) => void
}

export default function AppShell({
  children,
  schoolYear,
  propertyId,
  onSchoolYearChange,
  onPropertyChange,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const selectedProperty = PROPERTIES.find(p => p.id === propertyId) ?? PROPERTIES[0]

  function handlePropertyChange(name: string) {
    const found = PROPERTIES.find(p => p.name === name)
    if (found) onPropertyChange(found.id)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          schoolYear={schoolYear}
          propertyName={selectedProperty.name}
          schoolYears={SCHOOL_YEARS}
          propertyNames={PROPERTIES.map(p => p.name)}
          onSchoolYearChange={onSchoolYearChange}
          onPropertyChange={handlePropertyChange}
          onMenuClick={() => setDrawerOpen(true)}
          showMenuButton={true}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
