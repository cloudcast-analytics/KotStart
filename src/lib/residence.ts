interface ResidenceParts {
  residenceStreet?: string
  residenceNumber?: string
  residenceBox?: string
  residencePostalCode?: string
  residenceCity?: string
}

export function formatResidence(parts: ResidenceParts): string {
  const streetLine = [parts.residenceStreet, parts.residenceNumber]
    .filter(value => value && value.trim())
    .join(' ')
    .trim()
  const withBox =
    streetLine && parts.residenceBox && parts.residenceBox.trim()
      ? `${streetLine} bus ${parts.residenceBox.trim()}`
      : streetLine
  const cityLine = [parts.residencePostalCode, parts.residenceCity]
    .filter(value => value && value.trim())
    .join(' ')
    .trim()
  return [withBox, cityLine].filter(Boolean).join(', ')
}

export function isValidBelgianPostalCode(value: string): boolean {
  return /^[1-9]\d{3}$/.test(value.trim())
}
