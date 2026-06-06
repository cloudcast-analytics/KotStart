import { useState } from 'react'
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
  institution: '',
  faculty: '',
  studentNumber: '',
  primaryResidence: '',
  residenceStreet: '',
  residenceNumber: '',
  residenceBox: '',
  residencePostalCode: '',
  residenceCity: '',
}

function Harness() {
  const [students, setStudents] = useState<StudentFormData[]>([{ ...emptyStudent }])
  return (
    <Step2Student
      students={students}
      onChange={(index, field, value) =>
        setStudents(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
      }
    />
  )
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

  it('laat geboortedatum typen als dd-mm-jjjj en bewaart intern als ISO-datum', () => {
    const onChange = vi.fn()
    render(<Step2Student students={[emptyStudent]} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/geboortedatum/i), { target: { value: '23-10-2003' } })

    expect(onChange).toHaveBeenCalledWith(0, 'dateOfBirth', '2003-10-23')
  })

  it('toont een ISO-geboortedatum als dd-mm-jjjj in het formulier', () => {
    render(<Step2Student students={[{ ...emptyStudent, dateOfBirth: '2003-10-23' }]} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/geboortedatum/i)).toHaveValue('23-10-2003')
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

  it('toont de instellingkeuze en gesplitste domicilievelden', () => {
    render(<Step2Student students={[emptyStudent]} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Onderwijsinstelling')).toBeInTheDocument()
    expect(screen.getByLabelText('Straat')).toBeInTheDocument()
    expect(screen.getByLabelText('Huisnummer')).toBeInTheDocument()
    expect(screen.getByLabelText('Bus')).toBeInTheDocument()
    expect(screen.getByLabelText('Postcode')).toBeInTheDocument()
    expect(screen.getByLabelText('Gemeente')).toBeInTheDocument()
  })

  it('toont een fout bij een ongeldige postcode na blur', () => {
    render(<Harness />)
    const postcode = screen.getByLabelText('Postcode')
    fireEvent.change(postcode, { target: { value: '12' } })
    fireEvent.blur(postcode)
    expect(screen.getByText('Gebruik 4 cijfers (bijv. 9000)')).toBeInTheDocument()
  })

  it('rapporteert wijzigingen van domicilievelden aan de ouder', () => {
    const onChange = vi.fn()
    render(<Step2Student students={[emptyStudent]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Straat'), { target: { value: 'Kerkstraat' } })
    expect(onChange).toHaveBeenCalledWith(0, 'residenceStreet', 'Kerkstraat')
  })
})
