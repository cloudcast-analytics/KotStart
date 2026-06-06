interface ResidenceParts {
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
}

export function formatResidence(parts: ResidenceParts): string {
  const street = (parts.residenceStreet ?? '').trim()
  const number = (parts.residenceNumber ?? '').trim()
  const box = (parts.residenceBox ?? '').trim()
  const postal = (parts.residencePostalCode ?? '').trim()
  const city = (parts.residenceCity ?? '').trim()
  const streetLine = [street, number].filter(Boolean).join(' ')
  const withBox = streetLine && box ? `${streetLine} bus ${box}` : streetLine
  const cityLine = [postal, city].filter(Boolean).join(' ')
  return [withBox, cityLine].filter(Boolean).join(', ')
}

export function isValidBelgianPostalCode(value: string): boolean {
  return /^[1-9]\d{3}$/.test(value.trim())
}
