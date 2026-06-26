export function calculateIndexedRentPure(
  baseRent: number,
  startIndex: number,
  currentIndex: number,
): number {
  if (startIndex === currentIndex || startIndex === 0) return baseRent
  return Math.round((baseRent * currentIndex / startIndex) * 100) / 100
}
