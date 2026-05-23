import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Step2Student from '../pages/wizard/Step2Student'
import type { StudentFormData } from '../pages/wizard/types'

const emptyStudent: StudentFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  photoUrl: null,
  nationalRegistryNumber: '',
  institution: '',
  studentNumber: '',
  primaryResidence: '',
}

describe('Step2Student', () => {
  it('toont de studentvelden', () => {
    render(<Step2Student students={[emptyStudent]} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/voornaam/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/achternaam/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/geboortedatum/i)).toBeInTheDocument()
  })

  it('toont twee formulieren bij twee studenten', () => {
    render(<Step2Student students={[emptyStudent, emptyStudent]} onChange={vi.fn()} />)

    expect(screen.getByText('Student 1')).toBeInTheDocument()
    expect(screen.getByText('Student 2')).toBeInTheDocument()
  })

  it('roept onChange aan bij invullen voornaam', () => {
    const onChange = vi.fn()
    render(<Step2Student students={[emptyStudent]} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/voornaam/i), { target: { value: 'Emma' } })

    expect(onChange).toHaveBeenCalledWith(0, 'firstName', 'Emma')
  })

  it('toont minderjarig badge bij geboortedatum onder 18 jaar', () => {
    render(<Step2Student students={[{ ...emptyStudent, dateOfBirth: '2015-01-01' }]} onChange={vi.fn()} />)

    expect(screen.getByText(/minderjarig/i)).toBeInTheDocument()
  })

  it('toont validatie na blur', () => {
    render(<Step2Student students={[{ ...emptyStudent, email: 'geen-email' }]} onChange={vi.fn()} />)

    fireEvent.blur(screen.getByLabelText(/e-mail/i))

    expect(screen.getByText(/geldig e-mailadres/i)).toBeInTheDocument()
  })
})
