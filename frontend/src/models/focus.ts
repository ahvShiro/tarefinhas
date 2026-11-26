import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

export interface UpcomingDay {
  /** Local date `YYYY-MM-DD`, the same format as `MiniTask.scheduledDate`. */
  date: string
  label: string
}

/** The days that "Em foco" shows (`count` of them, from today), named by weekday. */
export function upcomingDays(count: number = DEFAULT_FOCUS_DAYS): UpcomingDay[] {
  const today = startOfToday()
  return Array.from({ length: count }, (_, offset) => {
    const date = addDays(today, offset)
    const weekday = format(date, 'EEEE', { locale: ptBR })
    const name = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    const label = offset === 0 ? `${name} (hoje)` : name
    return { date: format(date, 'yyyy-MM-dd'), label }
  })
}
