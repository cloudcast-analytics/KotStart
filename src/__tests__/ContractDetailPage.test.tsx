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
        <Route path="/inspections/:id" element={<div>Inspectie detail route</div>} />
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
      document: { open: vi.fn(), write, close: vi.fn() },
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

  it('toont voortgangschecklist met 4 stappen', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Contract aangemaakt')).toBeInTheDocument()
    expect(screen.getByText('Startplaatsbeschrijving')).toBeInTheDocument()
    expect(screen.getByText('Handtekening verhuurder')).toBeInTheDocument()
    expect(screen.getByText('Versturen naar student')).toBeInTheDocument()
  })

  it('toont Bekijken-knop voor start als inspectie klaar is (c1)', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /bekijken/i })).toBeInTheDocument()
  })

  it('toont Versturen-knop als contract ondertekend is (c1 status signed)', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /^versturen$/i })).toBeInTheDocument()
  })

  it('toont Ondertekenen-knop als start gedaan en status draft (c4)', async () => {
    renderPage('/contracts/c4')

    expect(await screen.findByRole('button', { name: /ondertekenen/i })).toBeInTheDocument()
  })

  it('toont geen "Ondertekenen & versturen" als één knop', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.queryByRole('button', { name: /ondertekenen & versturen/i })).not.toBeInTheDocument()
  })

  it('toont alleen Eindplaatsbeschrijving in Inspectiepaspoort (niet Start)', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Eindplaatsbeschrijving')).toBeInTheDocument()
    // Startplaatsbeschrijving appears exactly once — in the checklist, not in Inspectiepaspoort
    expect(screen.getAllByText('Startplaatsbeschrijving')).toHaveLength(1)
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

    expect(write).toHaveBeenCalledWith(expect.stringContaining('HUUROVEREENKOMST STUDENTENKAMER'))
  })

  it('redirect naar dashboard bij onbekend contract', async () => {
    renderPage('/contracts/onbekend')

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
