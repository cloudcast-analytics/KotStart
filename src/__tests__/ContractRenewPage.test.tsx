import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ContractRenewPage from '../pages/ContractRenewPage'
import { createContractRenewal, getAvailableRoomsForRenewal } from '../lib/data'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    getAvailableRoomsForRenewal: vi.fn(actual.getAvailableRoomsForRenewal),
    createContractRenewal: vi.fn(actual.createContractRenewal),
  }
})

function renderPage(initialPath = '/contracts/c1/renew') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/contracts/:id/renew" element={<ContractRenewPage />} />
        <Route path="/contracts/:id" element={<div>Contract detail</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContractRenewPage', () => {
  it('toont vooraf ingevulde contractgegevens', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Emma Janssen' })).toBeInTheDocument()
    // Huurprijs is geïndexeerd: €450 × (132.10 / 126.08) = €471.49
    expect(screen.getByDisplayValue('471.49')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
  })

  it('toont het automatisch berekende volgende schooljaar als alleen-lezen veld', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Emma Janssen' })
    expect(screen.getByText('Nieuw schooljaar')).toBeInTheDocument()
    expect(screen.getByText('2026–2027')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nieuw schooljaar')).not.toBeInTheDocument()
  })

  it('toont een kamer-select met de huidige kamer als standaard, wijzigen herlaadt de bedragvelden', async () => {
    renderPage()

    const roomSelect = (await screen.findByLabelText('Kamer')) as HTMLSelectElement
    expect(roomSelect.value).toBe('r1')

    fireEvent.change(roomSelect, { target: { value: 'r3' } })

    expect(screen.getByLabelText('Huurprijs')).toHaveValue(550)
    expect(screen.getByLabelText('Vaste kosten')).toHaveValue(80)
    expect(screen.getByLabelText('Studentenbelasting')).toHaveValue(12)
  })

  it('gaat naar overzicht na Volgende', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))

    expect(screen.getByRole('heading', { name: 'Nieuwe verlenging' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verlenging versturen/i })).toBeInTheDocument()
  })

  it('neemt gewijzigde huurprijs mee naar overzicht', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Huurprijs'), { target: { value: '499' } })
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(screen.getByText('€ 499/maand')).toBeInTheDocument()
  })

  it('blokkeert Volgende als verplicht bedrag leeg is', async () => {
    renderPage()

    fireEvent.change(await screen.findByLabelText('Huurprijs'), { target: { value: '' } })

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('toont een melding en blokkeert Volgende wanneer er geen beschikbare kamers zijn', async () => {
    vi.mocked(getAvailableRoomsForRenewal).mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByText('Geen beschikbare kamers voor het volgende schooljaar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('roept createContractRenewal aan met de verwachte payload en navigeert naar het nieuwe contract', async () => {
    vi.mocked(createContractRenewal).mockResolvedValueOnce('c-new-99')

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /verlenging versturen/i }))

    expect(await screen.findByText('Contract detail')).toBeInTheDocument()
    expect(createContractRenewal).toHaveBeenCalledWith({
      previousContractId: 'c1',
      roomId: 'r1',
      schoolYear: '2026–2027',
      monthlyRent: 471.49,
      fixedCosts: 60,
      studentTax: 12,
    })
  })

  it('toont een laadstatus wanneer createContractRenewal null teruggeeft (demo-modus)', async () => {
    vi.mocked(createContractRenewal).mockResolvedValueOnce(null)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /verlenging versturen/i }))

    expect(await screen.findByText('Wordt verstuurd...')).toBeInTheDocument()
  })
})
