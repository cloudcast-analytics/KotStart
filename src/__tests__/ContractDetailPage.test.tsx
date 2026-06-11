import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractDetailPage from '../pages/ContractDetailPage'
import { getContractBundleData } from '../lib/data'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    getContractBundleData: vi.fn(actual.getContractBundleData),
  }
})

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
    expect(screen.getByText(/Concept: 20 augustus 2025/i)).toBeInTheDocument()
    expect(screen.getAllByText('Startplaatsbeschrijving')).not.toHaveLength(0)
    expect(screen.getByText('Handtekeningen verhuurder en student')).toBeInTheDocument()
    expect(screen.getByText(/Definitief contract: 12 september 2025/i)).toBeInTheDocument()
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

  it('vraagt bevestiging en verwijdert de student met contract', async () => {
    renderPage('/contracts/c2')

    fireEvent.click(await screen.findByRole('button', { name: /verwijderen/i }))

    expect(screen.getByRole('dialog', { name: /student verwijderen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nee, behouden/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ja, verwijderen/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('toont twee studentkoppen met voogdnotitie wanneer er een tweede (minderjarige) bewoner is', async () => {
    renderPage('/contracts/c-demo-student')

    expect(await screen.findByRole('heading', { name: 'Vincent Grobben' })).toBeInTheDocument()
    expect(screen.getByText('Senne Grobben')).toBeInTheDocument()
    expect(screen.getByText(/Minderjarig — voogd: Inge Grobben/)).toBeInTheDocument()
    expect(screen.getByText('Handtekeningen verhuurder en wettelijke vertegenwoordiger')).toBeInTheDocument()
  })

  it('toont één studentkop zonder voogdnotitie wanneer er geen tweede bewoner is (c1)', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.queryByText(/Minderjarig — voogd:/)).not.toBeInTheDocument()
  })

  it('valt terug op de huidige kamerprijzen wanneer het contract geen eigen snapshot heeft', async () => {
    const base = await getContractBundleData('c1')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      contract: { ...base!.contract, monthlyRent: undefined, fixedCosts: undefined, studentTax: undefined },
    })

    renderPage()

    expect(await screen.findByText('€ 450/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 60/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 12/maand')).toBeInTheDocument()
  })

  it('toont de eigen snapshotwaarden van het contract i.p.v. de huidige kamerprijzen', async () => {
    const base = await getContractBundleData('c1')
    vi.mocked(getContractBundleData).mockResolvedValueOnce({
      ...base!,
      contract: { ...base!.contract, monthlyRent: 500, fixedCosts: 75, studentTax: 15 },
    })

    renderPage()

    expect(await screen.findByText('€ 500/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 75/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 15/maand')).toBeInTheDocument()
    expect(screen.getByText('€ 900')).toBeInTheDocument()
  })
})
