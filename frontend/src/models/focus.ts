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

export interface DeadlineHint {
  label: string
  /** `overdue`: the deadline passed. `soon`: today, tomorrow or in 2 days. */
  level: 'overdue' | 'soon'
}

/** Days from the start of `from` to the start of `to` (calendar days, local time). */
function calendarDaysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/**
 * Warning about the MainTask deadline, for a card that is not done: only when it is close (2 days or less) or past.
 * Null otherwise, and for a task without a deadline.
 */
export function deadlineHintOf(deadline: Date | undefined, now: Date): DeadlineHint | null {
  if (!deadline) return null
  const days = calendarDaysBetween(now, deadline)
  if (days < 0) return { label: 'Prazo vencido', level: 'overdue' }
  if (days === 0) return { label: 'Vence hoje', level: 'soon' }
  if (days === 1) return { label: 'Vence amanhã', level: 'soon' }
  if (days === 2) return { label: 'Vence em 2 dias', level: 'soon' }
  return null
}

/** Where the "now" line goes: the hour slot and how far into it (0 to 1). */
export function nowLinePosition(now: Date): { hour: number; fraction: number } {
  return { hour: now.getHours(), fraction: (now.getMinutes() * 60 + now.getSeconds()) / 3600 }
}
