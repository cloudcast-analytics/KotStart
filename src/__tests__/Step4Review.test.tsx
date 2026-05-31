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
  studentNumber: '202400001',
  primaryResidence: 'Kerkstraat 1, 9000 Gent',
}

describe('Step4Review', () => {
  it('toont kamerdetails', () => {
    render(
      <Step4Review
        room={room}
        students={[student]}
        secondLandlord={null}
        secondTenant={null}
        guardian={null}
      />,
    )

    expect(screen.getByText(/kamer 01/i)).toBeInTheDocument()
    expect(screen.getByText(/€ 450/)).toBeInTheDocument()
  })

  it('toont studentnaam', () => {
    render(
      <Step4Review
        room={room}
        students={[student]}
        secondLandlord={null}
        secondTenant={null}
        guardian={null}
      />,
    )

    expect(screen.getByText('Emma Janssen')).toBeInTheDocument()
  })

  it('toont tweede partijen als aanwezig', () => {
    render(
      <Step4Review
        room={room}
        students={[student]}
        secondLandlord={{ name: 'Jan Peeters', email: 'jan@peeters.be' }}
        secondTenant={{ name: 'Noor Peeters', email: 'noor@ugent.be' }}
        guardian={{ name: 'Sofie Janssen', email: 'sofie@example.be', phone: '0470 00 00 00' }}
      />,
    )

    expect(screen.getByText('Jan Peeters')).toBeInTheDocument()
    expect(screen.getByText('Noor Peeters')).toBeInTheDocument()
    expect(screen.getByText('Sofie Janssen')).toBeInTheDocument()
  })
})
