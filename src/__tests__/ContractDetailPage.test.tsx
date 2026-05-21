import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractDetailPage from '../pages/ContractDetailPage'

function renderPage(initialPath = '/contracts/c1') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
        <Route path="/contracts/:id/renew" element={<div>Renew route</div>} />
        <Route path="/inspections/new" element={<div>Inspectie route</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContractDetailPage', () => {
  function mockPrintWindow() {
    const print = vi.fn()
    const write = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus: vi.fn(),
      print,
    } as unknown as Window)
    return { print, write }
  }

  it('toont student, kamer en contractgegevens', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Emma Janssen' })).toBeInTheDocument()
    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
    expect(screen.getByText('€ 450/maand')).toBeInTheDocument()
  })

  it('toont status-tijdlijn', async () => {
    renderPage('/contracts/c3')

    expect(await screen.findByText('Concept')).toBeInTheDocument()
    expect(screen.getAllByText('Verstuurd').length).toBeGreaterThan(0)
    expect(screen.getByText('Ondertekend')).toBeInTheDocument()
  })

  it('navigeert naar contract verlengen', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /verlengen/i }))

    expect(screen.getByText('Renew route')).toBeInTheDocument()
  })

  it('maakt een printbaar contractdocument', async () => {
    const { write } = mockPrintWindow()
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /pdf maken/i }))

    expect(write).toHaveBeenCalledWith(expect.stringContaining('Huurovereenkomst studentenkamer'))
  })

  it('redirect naar dashboard bij onbekend contract', async () => {
    renderPage('/contracts/onbekend')

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
