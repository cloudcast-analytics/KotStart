import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ContractNewPage from '../pages/ContractNewPage'

function renderNewContractPage() {
  return render(
    <MemoryRouter initialEntries={['/contracts/new']}>
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/contracts/new" element={<ContractNewPage />} />
        <Route path="/contracts/:id" element={<div>Contract detail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function selectFirstRoomAndContinue() {
  fireEvent.click(await screen.findByRole('button', { name: /kamer 01/i }))
  fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
}

async function fillStudent() {
  fireEvent.change(await screen.findByLabelText(/voornaam/i), { target: { value: 'Emma' } })
  fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: 'Janssen' } })
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'emma@ugent.be' } })
  fireEvent.change(screen.getByLabelText(/geboortedatum/i), { target: { value: '2004-03-14' } })
  // Drive InstitutionSelect: open dropdown, filter and click the option
  const institutionInput = screen.getByLabelText('Onderwijsinstelling')
  fireEvent.focus(institutionInput)
  fireEvent.change(institutionInput, { target: { value: 'Universiteit Gent' } })
  fireEvent.click(screen.getByText('Universiteit Gent'))
  fireEvent.change(screen.getByLabelText(/studentennummer/i), { target: { value: '202400001' } })
  fireEvent.change(screen.getByLabelText('Straat'), { target: { value: 'Kerkstraat' } })
  fireEvent.change(screen.getByLabelText('Huisnummer'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Postcode'), { target: { value: '9000' } })
  fireEvent.change(screen.getByLabelText('Gemeente'), { target: { value: 'Gent' } })
}

describe('ContractNewPage', () => {
  it('toont stap 1 bij openen', async () => {
    renderNewContractPage()

    expect(await screen.findByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('toont de stapindicator met 4 stappen', async () => {
    renderNewContractPage()

    expect(screen.getByText('Kamer')).toBeInTheDocument()
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Partij')).toBeInTheDocument()
    expect(screen.getByText('Overzicht')).toBeInTheDocument()
    expect(await screen.findByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('Volgende knop is uitgeschakeld op stap 1 als geen kamer geselecteerd', async () => {
    renderNewContractPage()

    expect(await screen.findByText(/kies een kamer/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('gaat naar stap 2 na kamerselectie en klik Volgende', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()

    expect(await screen.findByLabelText(/voornaam/i)).toBeInTheDocument()
  })

  it('gaat terug naar stap 1 bij klik Terug op stap 2', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    fireEvent.click(screen.getByRole('button', { name: /terug/i }))

    expect(await screen.findByText(/kies een kamer/i)).toBeInTheDocument()
  })

  it('blokkeert stap 2 bij ongeldig e-mailadres', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    fireEvent.change(await screen.findByLabelText(/voornaam/i), { target: { value: 'Emma' } })
    fireEvent.change(screen.getByLabelText(/achternaam/i), { target: { value: 'Janssen' } })
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'emma' } })
    fireEvent.change(screen.getByLabelText(/geboortedatum/i), { target: { value: '2004-03-14' } })

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()
  })

  it('toont overzicht na geldige stappen', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    await fillStudent()
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    expect(await screen.findByText('Emma Janssen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opslaan als concept/i })).toBeInTheDocument()
  })

  it('gaat na Opslaan als concept verder naar de volgende route', async () => {
    renderNewContractPage()
    await selectFirstRoomAndContinue()
    await fillStudent()
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    fireEvent.click(screen.getByRole('button', { name: /volgende/i }))

    fireEvent.click(await screen.findByRole('button', { name: /opslaan als concept/i }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
