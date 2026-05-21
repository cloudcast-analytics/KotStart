import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import ActionBar from './components/ActionBar'
import StudentRow from './components/StudentRow'
import EmptyState from './components/EmptyState'
import { PROPERTIES, SCHOOL_YEARS } from '../lib/mockData'
import { getDashboardRowsData, getProperties } from '../lib/data'
import type { Property, StudentDashboardRow } from '../types'

type SortKey = 'student' | 'room'
type SortDir = 'asc' | 'desc'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [schoolYear, setSchoolYear] = useState('2025–2026')
  const [propertyId, setPropertyId] = useState(PROPERTIES[0].id)
  const [sortKey, setSortKey] = useState<SortKey>('room')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [properties, setProperties] = useState<Property[]>(PROPERTIES)
  const [baseRows, setBaseRows] = useState<StudentDashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProperties() {
      try {
        const nextProperties = await getProperties()
        if (cancelled) return
        setProperties(nextProperties)
        if (!nextProperties.some(property => property.id === propertyId)) {
          setPropertyId(nextProperties[0]?.id ?? PROPERTIES[0].id)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Panden konden niet geladen worden')
      }
    }

    loadProperties()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function loadRows() {
      try {
        const nextRows = await getDashboardRowsData(propertyId, schoolYear)
        if (!cancelled) setBaseRows(nextRows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Dashboard kon niet geladen worden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRows()
    return () => {
      cancelled = true
    }
  }, [propertyId, schoolYear])

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
      properties={properties}
      schoolYears={SCHOOL_YEARS}
    >
      <div className="flex flex-col h-full">
        <ActionBar
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onNewContract={() => navigate('/contracts/new')}
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm font-semibold text-slate-500">Studenten laden...</div>
          ) : error ? (
            <div className="p-6 text-sm font-semibold text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            rows.map((row, idx) => (
              <StudentRow
                key={row.studentId}
                row={row}
                isEven={idx % 2 === 1}
                onStartInspection={(contractId) =>
                  navigate('/inspections/new', { state: { contractId, type: 'start' } })
                }
                onRenew={(contractId) =>
                  navigate(`/contracts/${contractId}/renew`)
                }
                onEndInspection={(contractId) =>
                  navigate('/inspections/new', { state: { contractId, type: 'end' } })
                }
                onOpenContract={(contractId) =>
                  navigate(`/contracts/${contractId}`)
                }
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
