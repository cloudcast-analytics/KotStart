import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PropertiesPage from '../pages/PropertiesPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <PropertiesPage />
    </MemoryRouter>,
  )
}

describe('PropertiesPage', () => {
  it('toont de "komt later" placeholder (demo mode)', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Panden' })).toBeInTheDocument()
    expect(screen.getByText('Komt later.')).toBeInTheDocument()
  })
})
