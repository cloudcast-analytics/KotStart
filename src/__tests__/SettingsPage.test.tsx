import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import SettingsPage from '../pages/SettingsPage'
import { saveInspectionCategories } from '../lib/data'
import { PROPERTIES } from '../lib/mockData'

vi.mock('../lib/data', async () => {
  const actual = await vi.importActual<typeof import('../lib/data')>('../lib/data')
  return {
    ...actual,
    saveInspectionCategories: vi.fn().mockResolvedValue(undefined),
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

async function selectFirstProperty() {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(PROPERTIES[0].name) })).toBeInTheDocument()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(PROPERTIES[0].name) }))
}

describe('SettingsPage', () => {
  it('toont app-instellingen zonder verhuurderformulier', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Instellingen' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Naam en voornamen')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Plaatsbeschrijving aanpassen')).toBeInTheDocument()
    })
  })

  it('toont een lijst van panden om te kiezen', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(PROPERTIES[0].name) })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: new RegExp(PROPERTIES[1].name) })).toBeInTheDocument()
  })

  it('laadt de standaardcategorieën met Algemeen en meterstand-items na pandkeuze', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Elektriciteitsmeter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Watermeter')).toBeInTheDocument()
  })

  it('gaat terug naar de pandkeuze via "Ander pand"', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ander pand/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(PROPERTIES[0].name) })).toBeInTheDocument()
    })
  })

  it('voegt een nieuwe categorie toe', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /categorie toevoegen/i }))

    expect(screen.getByDisplayValue('Nieuwe categorie')).toBeInTheDocument()
  })

  it('verwijdert een item uit een categorie', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /item gasmeter verwijderen/i }))

    expect(screen.queryByDisplayValue('Gasmeter')).not.toBeInTheDocument()
  })

  it('zet eenheid standaard op kWh wanneer itemtype naar Meterstand wijzigt', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Verwarming')).toBeInTheDocument()
    })

    const verwarmingRow = screen.getByDisplayValue('Verwarming').closest('div') as HTMLElement
    const typeSelect = verwarmingRow.querySelector('select') as HTMLSelectElement
    fireEvent.change(typeSelect, { target: { value: 'meter' } })

    await waitFor(() => {
      const updatedSelect = verwarmingRow.querySelectorAll('select')
      expect(updatedSelect[1]).toHaveValue('kWh')
    })
  })

  it('toont reset-bevestiging en herstelt de standaardtemplate', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /item gasmeter verwijderen/i }))
    expect(screen.queryByDisplayValue('Gasmeter')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /reset naar standaard/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ja, herstellen/i }))

    expect(screen.getByDisplayValue('Gasmeter')).toBeInTheDocument()
  })

  it('roept saveInspectionCategories aan met het gekozen pand bij Wijzigingen opslaan', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Algemeen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /wijzigingen opslaan/i }))

    await waitFor(() => {
      expect(saveInspectionCategories).toHaveBeenCalledWith(PROPERTIES[0].id, expect.any(Array))
    })
    expect(screen.getByRole('button', { name: /opgeslagen/i })).toBeInTheDocument()
  })

  it('schakelt Wijzigingen opslaan uit bij een lege itemnaam', async () => {
    renderPage()
    await selectFirstProperty()

    await waitFor(() => {
      expect(screen.getByDisplayValue('Verwarming')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Verwarming'), { target: { value: '' } })

    expect(screen.getByRole('button', { name: /wijzigingen opslaan/i })).toBeDisabled()
  })
})
