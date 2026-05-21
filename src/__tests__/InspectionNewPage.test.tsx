import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import InspectionNewPage from '../pages/InspectionNewPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <InspectionNewPage />
    </MemoryRouter>,
  )
}

async function selectAllGoodInCurrentCategory(expectedItems: number) {
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: 'Goed' })).toHaveLength(expectedItems)
  })

  screen.getAllByRole('button', { name: 'Goed' }).forEach(button => fireEvent.click(button))
}

describe('InspectionNewPage', () => {
  function mockPrintWindow() {
    const write = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window)
    return { write }
  }

  it('toont de eerste categorie en onderdelen', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Keuken' })).toBeInTheDocument()
    expect(screen.getByText('Aanrecht')).toBeInTheDocument()
    expect(screen.getByText('Gootsteen & kraan')).toBeInTheDocument()
  })

  it('blokkeert Volgende tot alle onderdelen een toestand hebben', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /volgende/i })).toBeDisabled()

    screen.getAllByRole('button', { name: 'Goed' }).forEach(button => fireEvent.click(button))

    expect(screen.getByRole('button', { name: /volgende/i })).not.toBeDisabled()
  })

  it('toont foto-upload bij slechte toestand', () => {
    renderPage()

    const aanrecht = screen.getByText('Aanrecht').closest('div')?.parentElement
    const slecht = Array.from(aanrecht?.querySelectorAll('button') ?? []).find(button =>
      button.textContent?.includes('Slecht'),
    )

    if (!slecht) throw new Error('Slecht-knop niet gevonden')
    fireEvent.click(slecht)

    expect(screen.getByLabelText(/foto toevoegen voor aanrecht/i)).toBeInTheDocument()
  })

  it('gaat naar de laatste stap na alle categorieen', async () => {
    renderPage()

    const categories = [
      { title: 'Keuken', itemCount: 7 },
      { title: 'Badkamer', itemCount: 7 },
      { title: 'Kamer', itemCount: 7 },
      { title: 'Inkom', itemCount: 5 },
      { title: 'Algemeen', itemCount: 5 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      await selectAllGoodInCurrentCategory(category.itemCount)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    expect(await screen.findByRole('heading', { name: 'Overzichtsfoto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /plaatsbeschrijving afronden/i })).toBeDisabled()
  })

  it('toont een PDF voorbeeld knop op de laatste stap', async () => {
    const { write } = mockPrintWindow()
    renderPage()

    const categories = [
      { title: 'Keuken', itemCount: 7 },
      { title: 'Badkamer', itemCount: 7 },
      { title: 'Kamer', itemCount: 7 },
      { title: 'Inkom', itemCount: 5 },
      { title: 'Algemeen', itemCount: 5 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      await selectAllGoodInCurrentCategory(category.itemCount)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    expect(await screen.findByRole('button', { name: /pdf voorbeeld maken/i })).toBeDisabled()
    const overviewPhotoInput = screen
      .getAllByLabelText(/overzichtsfoto toevoegen/i)
      .find(element => element.tagName === 'INPUT')

    if (!overviewPhotoInput) throw new Error('Overzichtsfoto input niet gevonden')

    fireEvent.change(overviewPhotoInput, {
      target: {
        files: [new File(['foto'], 'foto.png', { type: 'image/png' })],
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pdf voorbeeld maken/i })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /pdf voorbeeld maken/i }))

    expect(write).toHaveBeenCalledWith(expect.stringContaining('Plaatsbeschrijving'))
  })
})
