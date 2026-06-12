import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterDropdown from '../components/ui/FilterDropdown'

describe('FilterDropdown', () => {
  it('toont het label op de knop', () => {
    render(<FilterDropdown label="2025–2026" options={['2025–2026', '2026–2027']} onSelect={() => {}} />)
    expect(screen.getByText('2025–2026')).toBeInTheDocument()
  })

  it('opent de optielijst bij klik en toont alle options', () => {
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027', '2027–2028']}
        onSelect={() => {}}
      />,
    )
    expect(screen.queryByText('2027–2028')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('2025–2026'))

    expect(screen.getByText('2026–2027')).toBeInTheDocument()
    expect(screen.getByText('2027–2028')).toBeInTheDocument()
  })

  it('klik op een optie roept onSelect aan met die waarde en sluit de lijst', () => {
    const onSelect = vi.fn()
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027', '2027–2028']}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByText('2025–2026'))
    fireEvent.click(screen.getByText('2026–2027'))

    expect(onSelect).toHaveBeenCalledWith('2026–2027')
    expect(screen.queryByText('2027–2028')).not.toBeInTheDocument()
  })

  it('toont de extra actie onderaan en roept extraAction.onClick aan bij klik', () => {
    const onExtraClick = vi.fn()
    render(
      <FilterDropdown
        label="2025–2026"
        options={['2025–2026', '2026–2027']}
        onSelect={() => {}}
        extraAction={{ label: '+ Volgend schooljaar toevoegen (2026–2027)', onClick: onExtraClick }}
      />,
    )

    fireEvent.click(screen.getByText('2025–2026'))
    expect(screen.getByText('+ Volgend schooljaar toevoegen (2026–2027)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('+ Volgend schooljaar toevoegen (2026–2027)'))
    expect(onExtraClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('2026–2027')).not.toBeInTheDocument()
  })

  it('klik buiten de dropdown sluit de lijst', () => {
    render(<FilterDropdown label="2025–2026" options={['2025–2026', '2026–2027']} onSelect={() => {}} />)

    fireEvent.click(screen.getByText('2025–2026'))
    expect(screen.getByText('2026–2027')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('2026–2027')).not.toBeInTheDocument()
  })
})
