import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import InspectionDetailPage from '../pages/InspectionDetailPage'

function renderPage(id = 'i1') {
  return render(
    <MemoryRouter initialEntries={[`/inspections/${id}`]}>
      <Routes>
        <Route path="/inspections/:id" element={<InspectionDetailPage />} />
        <Route path="/contracts/:id" element={<div>Contract route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InspectionDetailPage', () => {
  it('toont het type en de datum van de inspectie', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Startplaatsbeschrijving' })).toBeInTheDocument()
    expect(screen.getByText(/15 september 2025/i)).toBeInTheDocument()
  })

  it('toont items gegroepeerd per categorie', async () => {
    renderPage()

    expect(await screen.findByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Badkamer')).toBeInTheDocument()
    expect(screen.getByText('Vloer')).toBeInTheDocument()
    expect(screen.getByText('Muren')).toBeInTheDocument()
    expect(screen.getByText('Douche')).toBeInTheDocument()
  })

  it('toont conditiechips voor elk item', async () => {
    renderPage()

    expect(await screen.findAllByText('Goed')).toHaveLength(3)
    expect(screen.getByText('Matig')).toBeInTheDocument()
  })

  it('bevat een PDF-knop', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: /pdf/i })).toBeInTheDocument()
  })

  it('navigeert terug naar het contract via de terugknop', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /← contract/i }))

    expect(screen.getByText('Contract route')).toBeInTheDocument()
  })

  it('toont een foutmelding bij onbekende inspectie-id', async () => {
    renderPage('onbekend')

    expect(await screen.findByText(/niet gevonden/i)).toBeInTheDocument()
  })
})
