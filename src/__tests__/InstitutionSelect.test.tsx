import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstitutionSelect from '../components/InstitutionSelect'

describe('InstitutionSelect', () => {
  it('filters the options as you type', () => {
    render(<InstitutionSelect value="" onChange={() => {}} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Universiteit G' } })
    expect(screen.getByText('Universiteit Gent')).toBeInTheDocument()
    expect(screen.queryByText('KU Leuven')).not.toBeInTheDocument()
  })

  it('calls onChange with the canonical name when an option is picked', () => {
    const onChange = vi.fn()
    render(<InstitutionSelect value="" onChange={onChange} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'KU' } })
    fireEvent.click(screen.getByText('KU Leuven'))
    expect(onChange).toHaveBeenCalledWith('KU Leuven')
  })

  it('lets you enter a free-text institution via Andere…', () => {
    const onChange = vi.fn()
    render(<InstitutionSelect value="" onChange={onChange} ariaLabel="Onderwijsinstelling" />)
    const input = screen.getByLabelText('Onderwijsinstelling')
    fireEvent.focus(input)
    fireEvent.click(screen.getByText('Andere…'))
    const free = screen.getByLabelText('Andere onderwijsinstelling')
    fireEvent.change(free, { target: { value: 'University of Amsterdam' } })
    expect(onChange).toHaveBeenCalledWith('University of Amsterdam')
  })

  it('starts in free-text mode when the value is not in the list', () => {
    render(
      <InstitutionSelect value="University of Amsterdam" onChange={() => {}} ariaLabel="Onderwijsinstelling" />,
    )
    expect(screen.getByLabelText('Andere onderwijsinstelling')).toHaveValue('University of Amsterdam')
  })
})
