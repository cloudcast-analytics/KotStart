import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import ActionBar from './components/ActionBar'
import StudentRow from './components/StudentRow'
import EmptyState from './components/EmptyState'
import { getDashboardRows, PROPERTIES } from '../lib/mockData'
import type { StudentDashboardRow } from '../types'

type SortKey = 'student' | 'room'
type SortDir = 'asc' | 'desc'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [sortKey, setSortKey] = useState<SortKey>('room')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const baseRows = useMemo(
    () => getDashboardRows(propertyId, schoolYear),
    [propertyId, schoolYear],
  )

  const rows = useMemo((): StudentDashboardRow[] => {
    return [...baseRows].sort((a, b) => {
      const valA = sortKey === 'student' ? `${a.lastName} ${a.firstName}` : a.roomNumber
      const valB = sortKey === 'student' ? `${b.lastName} ${b.firstName}` : b.roomNumber
      const cmp = valA.localeCompare(valB, 'nl')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [baseRows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <AppShell
      schoolYear={schoolYear}
      propertyId={propertyId}
      onSchoolYearChange={setSchoolYear}
      onPropertyChange={setPropertyId}
    >
      <div className="flex flex-col h-full">
        <ActionBar
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onNewContract={() => navigate('/contracts/new')}
        />

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            rows.map((row, idx) => (
              <StudentRow
                key={row.studentId}
                row={row}
                isEven={idx % 2 === 1}
                onStartInspection={(contractId) =>
                  console.log('Start inspectie:', contractId)
                }
                onRenew={(contractId) =>
                  navigate(`/contracts/${contractId}/renew`)
                }
                onEndInspection={(contractId) =>
                  console.log('Eind inspectie:', contractId)
                }
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
