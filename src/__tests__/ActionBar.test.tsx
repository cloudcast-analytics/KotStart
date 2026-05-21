import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ActionBar from '../pages/components/ActionBar'

describe('ActionBar', () => {
  it('toont "+ Nieuw Contract" knop', () => {
    render(<ActionBar sortKey="room" sortDir="asc" onSort={vi.fn()} onNewContract={vi.fn()} />)
    expect(screen.getByRole('button', { name: /nieuw contract/i })).toBeInTheDocument()
  })

  it('roept onNewContract aan bij klik', () => {
    const onNewContract = vi.fn()
    render(<ActionBar sortKey="room" sortDir="asc" onSort={vi.fn()} onNewContract={onNewContract} />)
    fireEvent.click(screen.getByRole('button', { name: /nieuw contract/i }))
    expect(onNewContract).toHaveBeenCalledTimes(1)
  })

  it('roept onSort("student") aan bij klik op Student header', () => {
    const onSort = vi.fn()
    render(<ActionBar sortKey="room" sortDir="asc" onSort={onSort} onNewContract={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /^student$/i }))
    expect(onSort).toHaveBeenCalledWith('student')
  })

  it('toont pijl-omhoog indicator bij asc sortering op actieve kolom', () => {
    render(<ActionBar sortKey="student" sortDir="asc" onSort={vi.fn()} onNewContract={vi.fn()} />)
    expect(screen.getByTestId('sort-arrow')).toHaveTextContent('↑')
  })
})
