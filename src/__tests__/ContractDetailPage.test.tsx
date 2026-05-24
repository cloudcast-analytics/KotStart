import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractDetailPage from '../pages/ContractDetailPage'

function renderPage(initialPath = '/contracts/c1', state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[state ? { pathname: initialPath, state } : initialPath]}>
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
    expect(screen.getAllByText('Startplaatsbeschrijving')).not.toHaveLength(0)
    expect(screen.getByText('Handtekeningen verhuurder en student')).toBeInTheDocument()
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

  it('toont na opslaan als concept een status zonder dashboardknop', async () => {
    renderPage('/contracts/c1', { savedDraft: true })

    expect(await screen.findByText('Concept opgeslagen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /naar dashboard/i })).not.toBeInTheDocument()
  })

  it('toont Handtekeningen opslaan-knop als start gedaan en status draft (c4)', async () => {
    renderPage('/contracts/c4')

    expect(await screen.findByRole('button', { name: /handtekeningen opslaan/i })).toBeInTheDocument()
  })

  it('toont geen "Ondertekenen & versturen" als één knop', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.queryByRole('button', { name: /ondertekenen & versturen/i })).not.toBeInTheDocument()
  })

  it('toont Start en Einde in Inspectiepaspoort met de juiste status', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    const passport = screen.getByRole('region', { name: /inspectiepaspoort/i })
    expect(within(passport).getByText('Startplaatsbeschrijving')).toBeInTheDocument()
    expect(within(passport).getByText('Eindplaatsbeschrijving')).toBeInTheDocument()
    expect(within(passport).getByText(/15 september 2025/i)).toBeInTheDocument()
    expect(within(passport).getByText('Nog niet gedaan')).toBeInTheDocument()
  })

  it('start een ontbrekende eindplaatsbeschrijving vanuit het inspectiepaspoort', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    const passport = screen.getByRole('region', { name: /inspectiepaspoort/i })
    fireEvent.click(within(passport).getByRole('button', { name: /starten/i }))

    expect(screen.getByText('Inspectie route')).toBeInTheDocument()
  })

  it('opent een bestaande startplaatsbeschrijving vanuit het inspectiepaspoort', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    const passport = screen.getByRole('region', { name: /inspectiepaspoort/i })
    fireEvent.click(within(passport).getByRole('button', { name: /bekijken/i }))

    expect(screen.getByText('Inspectie detail route')).toBeInTheDocument()
  })

  it('toont geen inspectieknoppen in de top action bar', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Eindplaatsbeschrijving')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /starten/i })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /startplaatsbeschrijving/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eindplaatsbeschrijving/i })).not.toBeInTheDocument()
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
