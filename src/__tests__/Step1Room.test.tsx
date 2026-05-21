import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ROOMS } from '../lib/mockData'
import Step1Room from '../pages/wizard/Step1Room'

const rooms = ROOMS.filter(room => room.propertyId === 'p1')

describe('Step1Room', () => {
  it('toont alle beschikbare kamers', () => {
    render(<Step1Room rooms={rooms} selectedRoomId={null} onSelect={vi.fn()} />)

    expect(screen.getByText('Kamer 01')).toBeInTheDocument()
    expect(screen.getByText('Kamer 02')).toBeInTheDocument()
  })

  it('toont samenvatting-card na selectie', () => {
    render(<Step1Room rooms={rooms} selectedRoomId="r1" onSelect={vi.fn()} />)

    expect(screen.getByText(/overzicht kamer 01/i)).toBeInTheDocument()
    expect(screen.getAllByText(/€ 450/)[0]).toBeInTheDocument()
  })

  it('roept onSelect aan bij klikken op een kamer', () => {
    const onSelect = vi.fn()
    render(<Step1Room rooms={rooms} selectedRoomId={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /kamer 01/i }))

    expect(onSelect).toHaveBeenCalledWith('r1')
  })

  it('toont twee personen badge bij dubbele kamer', () => {
    render(<Step1Room rooms={rooms} selectedRoomId="r6" onSelect={vi.fn()} />)

    expect(screen.getByText(/2 personen/i)).toBeInTheDocument()
  })
})
