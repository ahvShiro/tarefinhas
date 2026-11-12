export const TASK_BANK_DROP_ID = 'bank'

export type DropTarget =
  | { kind: 'bank' }
  | { kind: 'day'; date: string }
  | { kind: 'slot'; date: string; time: string }

export function dayDropId(date: string): string {
  return `day:${date}`
}

export function slotDropId(date: string, hour: number): string {
  return `slot:${date}:${String(hour).padStart(2, '0')}`
}

export function parseDropId(id: string): DropTarget | undefined {
  if (id === TASK_BANK_DROP_ID) return { kind: 'bank' }
  const [kind, date, hour] = id.split(':')
  if (kind === 'day' && date) return { kind: 'day', date }
  if (kind === 'slot' && date && hour) return { kind: 'slot', date, time: `${hour}:00` }
  return undefined
}
