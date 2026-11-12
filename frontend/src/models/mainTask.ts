import { addDays } from 'date-fns'

export interface MainTask {
  id: string
  name: string
  description: string
  deadlineDays?: number
  color: string
  createdAt: string
}

export const MIN_DEADLINE_DAYS = 1
export const MAX_DEADLINE_DAYS = 7

export function getDeadline(task: MainTask): Date | undefined {
  if (task.deadlineDays === undefined) return undefined
  return addDays(new Date(task.createdAt), task.deadlineDays)
}
