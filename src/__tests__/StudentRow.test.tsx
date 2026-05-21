import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StudentRow from '../pages/components/StudentRow'
import type { StudentDashboardRow } from '../types'

const mockRow: StudentDashboardRow = {
  studentId: 's1',
  firstName: 'Emma',
  lastName: 'Janssen',
  roomNumber: '01',
  contractId: 'c1',
}

describe('StudentRow', () => {
  it('toont de studentnaam', () => {
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont enkel het kamernummer (geen "Kamer" prefix)', () => {
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    expect(screen.queryByText(/^kamer$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('01').length).toBeGreaterThan(0)
  })

  it('roept onRenew aan bij klik op verlengknop', () => {
    const onRenew = vi.fn()
    render(<StudentRow row={mockRow} onStartInspection={vi.fn()} onRenew={onRenew} onEndInspection={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /verlengen/i }))
    expect(onRenew).toHaveBeenCalledWith('c1')
  })

  it('roept onStartInspection aan bij klik op startplaatsbeschrijving', () => {
    const onStartInspection = vi.fn()
    render(<StudentRow row={mockRow} onStartInspection={onStartInspection} onRenew={vi.fn()} onEndInspection={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /startplaatsbeschrijving/i }))
    expect(onStartInspection).toHaveBeenCalledWith('c1')
  })
})
