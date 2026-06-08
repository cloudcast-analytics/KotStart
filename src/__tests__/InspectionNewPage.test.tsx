import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

async function rateAllExceptSleutels(expectedItems: number) {
  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: 'Goed' })).toHaveLength(expectedItems)
  })

  screen.getAllByRole('button', { name: 'Goed' }).forEach(button => fireEvent.click(button))
}

async function setSleutelsCount(times: number) {
  const plusButton = await screen.findByRole('button', { name: /aantal sleutels vermeerderen/i })
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(plusButton)
  }
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

  it('toont een aantal-stepper voor Sleutels i.p.v. conditieknoppen', async () => {
    renderPage()

    const categories = ['Keuken', 'Badkamer', 'Kamer', 'Inkom']
    for (const title of categories) {
      await screen.findByRole('heading', { name: title })
      await selectAllGoodInCurrentCategory(title === 'Keuken' || title === 'Badkamer' || title === 'Kamer' ? 7 : 5)
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    await screen.findByRole('heading', { name: 'Algemeen' })
    const sleutelsCard = screen.getByText('Sleutels').closest('.rounded-2xl') as HTMLElement
    expect(within(sleutelsCard).queryByRole('button', { name: 'Goed' })).not.toBeInTheDocument()
    expect(within(sleutelsCard).queryByRole('button', { name: 'Onbruikbaar' })).not.toBeInTheDocument()

    const plusButton = screen.getByRole('button', { name: /aantal sleutels vermeerderen/i })
    const minusButton = screen.getByRole('button', { name: /aantal sleutels verminderen/i })
    expect(screen.getByText('0 stuks')).toBeInTheDocument()

    fireEvent.click(plusButton)
    fireEvent.click(plusButton)
    expect(screen.getByText('2 stuks')).toBeInTheDocument()

    fireEvent.click(minusButton)
    expect(screen.getByText('1 stuk')).toBeInTheDocument()
  })

  it('gaat naar de laatste stap na alle categorieen', async () => {
    renderPage()

    const categories = [
      { title: 'Keuken', itemCount: 7 },
      { title: 'Badkamer', itemCount: 7 },
      { title: 'Kamer', itemCount: 7 },
      { title: 'Inkom', itemCount: 5 },
      { title: 'Algemeen', itemCount: 4 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      if (category.title === 'Algemeen') {
        await rateAllExceptSleutels(category.itemCount)
        await setSleutelsCount(2)
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    expect(await screen.findByRole('heading', { name: /Overzichtsfoto/ })).toBeInTheDocument()
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
      { title: 'Algemeen', itemCount: 4 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      if (category.title === 'Algemeen') {
        await rateAllExceptSleutels(category.itemCount)
        await setSleutelsCount(2)
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    expect(await screen.findByRole('button', { name: /pdf voorbeeld maken/i })).toBeDisabled()
    expect(screen.getByText(/0\/8 foto's/)).toBeInTheDocument()

    for (let index = 0; index < 5; index += 1) {
      const overviewPhotoInput = screen
        .getAllByLabelText(/overzichtsfoto toevoegen/i)
        .find(element => element.tagName === 'INPUT')

      if (!overviewPhotoInput) throw new Error('Overzichtsfoto input niet gevonden')

      fireEvent.change(overviewPhotoInput, {
        target: { files: [new File([`foto${index}`], `foto${index}.png`, { type: 'image/png' })] },
      })

      await waitFor(() => {
        expect(screen.getAllByAltText(/^overzichtsfoto \d+$/i)).toHaveLength(index + 1)
      })
    }

    expect(screen.getByText(/5\/8 foto's/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pdf voorbeeld maken/i })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: /pdf voorbeeld maken/i }))

    expect(write).toHaveBeenCalledWith(expect.stringContaining('Plaatsbeschrijving'))
  })

  it('laat een toegevoegde overzichtsfoto verwijderen', async () => {
    renderPage()

    const categories = [
      { title: 'Keuken', itemCount: 7 },
      { title: 'Badkamer', itemCount: 7 },
      { title: 'Kamer', itemCount: 7 },
      { title: 'Inkom', itemCount: 5 },
      { title: 'Algemeen', itemCount: 4 },
    ]

    for (const category of categories) {
      await screen.findByRole('heading', { name: category.title })
      if (category.title === 'Algemeen') {
        await rateAllExceptSleutels(category.itemCount)
        await setSleutelsCount(1)
      } else {
        await selectAllGoodInCurrentCategory(category.itemCount)
      }
      fireEvent.click(screen.getByRole('button', { name: /volgende/i }))
    }

    await screen.findByRole('heading', { name: /Overzichtsfoto/ })
    const overviewPhotoInput = screen
      .getAllByLabelText(/overzichtsfoto toevoegen/i)
      .find(element => element.tagName === 'INPUT')
    if (!overviewPhotoInput) throw new Error('Overzichtsfoto input niet gevonden')

    fireEvent.change(overviewPhotoInput, {
      target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Overzichtsfoto 1')

    fireEvent.click(screen.getByRole('button', { name: /overzichtsfoto 1 verwijderen/i }))

    await waitFor(() => {
      expect(screen.queryByAltText('Overzichtsfoto 1')).not.toBeInTheDocument()
      expect(screen.getByText(/0\/8 foto's/)).toBeInTheDocument()
    })
  })
})
