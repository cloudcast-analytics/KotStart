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
  const defaultProps = {
    row: mockRow,
    onStartInspection: vi.fn(),
    onRenew: vi.fn(),
    onEndInspection: vi.fn(),
    onOpenContract: vi.fn(),
  }

  it('toont de studentnaam', () => {
    render(<StudentRow {...defaultProps} />)
    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont gecombineerde naam wanneer er een tweede student is', () => {
    render(
      <StudentRow
        {...defaultProps}
        row={{ ...mockRow, secondFirstName: 'Liam', secondLastName: 'Pieters' }}
      />,
    )
    expect(screen.getByText('Emma Janssen & Liam Pieters')).toBeInTheDocument()
  })

  it('toont enkel het kamernummer (geen "Kamer" prefix)', () => {
    render(<StudentRow {...defaultProps} />)
    expect(screen.queryByText(/^kamer$/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('01').length).toBeGreaterThan(0)
  })

  it('roept onRenew aan bij klik op verlengknop', () => {
    const onRenew = vi.fn()
    render(<StudentRow {...defaultProps} onRenew={onRenew} />)
    fireEvent.click(screen.getByRole('button', { name: /verlengen/i }))
    expect(onRenew).toHaveBeenCalledWith('c1')
  })

  it('roept onStartInspection aan bij klik op startplaatsbeschrijving', () => {
    const onStartInspection = vi.fn()
    render(<StudentRow {...defaultProps} onStartInspection={onStartInspection} />)
    fireEvent.click(screen.getByRole('button', { name: /startplaatsbeschrijving/i }))
    expect(onStartInspection).toHaveBeenCalledWith('c1')
  })

  it('opent contractdetail bij klik op studentnaam', () => {
    const onOpenContract = vi.fn()
    render(<StudentRow {...defaultProps} onOpenContract={onOpenContract} />)
    fireEvent.click(screen.getByRole('button', { name: /contract openen voor emma janssen/i }))
    expect(onOpenContract).toHaveBeenCalledWith('c1')
  })
})
