import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ROOMS } from '../lib/mockData'
import Step4Review from '../pages/wizard/Step4Review'
import type { StudentFormData } from '../pages/wizard/types'

const room = ROOMS[0]
const student: StudentFormData = {
  firstName: 'Emma',
  lastName: 'Janssen',
  email: 'emma@ugent.be',
  phone: '0470 11 22 33',
  dateOfBirth: '2004-03-14',
  photoUrl: null,
  institution: 'Universiteit Gent',
  faculty: '',
  studentNumber: '202400001',
  residenceStreet: '',
  residenceNumber: '',
  residenceBox: '',
  residencePostalCode: '',
  residenceCity: '',
}

const minorStudent: StudentFormData = {
  ...student,
  dateOfBirth: '2015-01-01',
  guardianName: 'Sofie Janssen',
  guardianEmail: 'sofie@example.be',
  guardianPhone: '0470 00 00 00',
}

describe('Step4Review', () => {
  it('toont kamerdetails', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText(/€ 450/)).toBeInTheDocument()
  })

  it('toont studentnaam', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont voogdgegevens ingebed in de studentkaart bij minderjarigheid', () => {
    render(<Step4Review room={room} students={[minorStudent]} />)

    expect(screen.getByText('Voogd')).toBeInTheDocument()
    expect(screen.getByText('Sofie Janssen')).toBeInTheDocument()
    expect(screen.getByText('sofie@example.be')).toBeInTheDocument()
  })

  it('toont geen voogdsectie wanneer de student meerderjarig is', () => {
    render(<Step4Review room={room} students={[student]} />)

    expect(screen.queryByText('Voogd')).not.toBeInTheDocument()
  })
})
