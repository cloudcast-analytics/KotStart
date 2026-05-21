import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ContractRenewPage from '../pages/ContractRenewPage'

function renderPage(initialPath = '/contracts/c1/renew') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/contracts/:id/renew" element={<ContractRenewPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ContractRenewPage', () => {
  it('toont vooraf ingevulde contractgegevens', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Emma Janssen' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('450')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
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
})
