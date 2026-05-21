import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Drawer from '../components/layout/Drawer'

function renderDrawer(isOpen: boolean, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <Drawer isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  )
}

describe('Drawer', () => {
  it('toont navigatie-items als open', () => {
    renderDrawer(true)
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(screen.getByText('Panden')).toBeInTheDocument()
    expect(screen.getByText('Instellingen')).toBeInTheDocument()
  })

  it('roept onClose aan bij klik op backdrop', () => {
    const onClose = vi.fn()
    renderDrawer(true, onClose)
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toont app logo', () => {
    renderDrawer(true)
    expect(screen.getByText('KotBeheer')).toBeInTheDocument()
  })
})
