export const MIN_FOCUS_DAYS = 1
export const MAX_FOCUS_DAYS = 7
export const DEFAULT_FOCUS_DAYS = 1

/** Parses the number of days shown in focus. Returns null when it is not a whole number in range. */
export function parseFocusDays(value: string): number | null {
  const parsed = Number(value)
  if (value.trim() === '' || !Number.isInteger(parsed)) return null
  if (parsed < MIN_FOCUS_DAYS || parsed > MAX_FOCUS_DAYS) return null
  return parsed
}
