import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ContractNewPage from '../pages/ContractNewPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <ContractNewPage />
    </MemoryRouter>,
  )
}

function selectFirstRoomAndContinue() {
  fireEvent.click(screen.getByRole('button', { name: /kamer 01/i }))
  fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
}

async function fillStudent() {
  fireEvent.change(await screen.findByLabelText(/voornaam/i), { target: { value: 'Emma' } })
  fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: 'Janssen' } })
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'emma@ugent.be' } })
  fireEvent.change(screen.getByLabelText(/geboortedatum/i), { target: { value: '2004-03-14' } })
  fireEvent.change(screen.getByLabelText(/rijksregisternummer/i), { target: { value: '04.03.14-123.45' } })
  fireEvent.change(screen.getByLabelText(/onderwijsinstelling/i), { target: { value: 'UGent' } })
  fireEvent.change(screen.getByLabelText(/studentennummer/i), { target: { value: '202400001' } })
  fireEvent.change(screen.getByLabelText(/hoofdverblijf/i), { target: { value: 'Kerkstraat 1, 9000 Gent' } })
}

describe('ContractNewPage', () => {
  it('toont stap 1 bij openen', () => {
    renderPage()

    expect(screen.getByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('toont de stapindicator met 4 stappen', () => {
    renderPage()

    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Partij')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
  })

  it('Volgende knop is uitgeschakeld op stap 1 als geen kamer geselecteerd', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('gaat naar stap 2 na kamerselectie en klik Volgende', async () => {
    renderPage()
    selectFirstRoomAndContinue()

    expect(await screen.findByLabelText(/voornaam/i)).toBeInTheDocument()
  })

  it('gaat terug naar stap 1 bij klik Terug op stap 2', () => {
    renderPage()
    selectFirstRoomAndContinue()
    fireEvent.click(screen.getByRole('button', { name: /terug/i }))

    expect(screen.getByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('blokkeert stap 2 bij ongeldig e-mailadres', async () => {
    renderPage()
    selectFirstRoomAndContinue()
    fireEvent.change(await screen.findByLabelText(/voornaam/i), { target: { value: 'Emma' } })
    fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: 'Janssen' } })
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'emma' } })
    fireEvent.change(screen.getByLabelText(/geboortedatum/i), { target: { value: '2004-03-14' } })

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('toont overzicht na geldige stappen', async () => {
    renderPage()
    selectFirstRoomAndContinue()
    await fillStudent()
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(await screen.findByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /contract versturen/i })).toBeInTheDocument()
  })
})
