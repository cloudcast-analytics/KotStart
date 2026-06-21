import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../pages/SettingsPage'

describe('SettingsPage delegation toggle', () => {
  it('renders the delegation radio options after selecting a property', async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>)

    const propertyButton = await screen.findByText('Residentie De Linde')
    propertyButton.click()

    expect(await screen.findByText('Plaatsbeschrijving invullen')).toBeInTheDocument()
    expect(screen.getByText('Samen met student')).toBeInTheDocument()
    expect(screen.getByText('Uitbesteden aan student')).toBeInTheDocument()
  })
})
