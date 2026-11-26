import { addDays } from 'date-fns'

/** How hard the task is. It sets the priority: harder tasks come first when the system suggests tasks. */
export type Effort = 'easy' | 'medium' | 'hard'

export const EFFORTS: readonly Effort[] = ['easy', 'medium', 'hard']
export const DEFAULT_EFFORT: Effort = 'medium'

export const EFFORT_LABELS: Record<Effort, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

export interface MainTask {
  id: string
  name: string
  description: string
  deadlineDays?: number
  effort: Effort
  color: string
  createdAt: string
}

export const MIN_DEADLINE_DAYS = 1
export const MAX_DEADLINE_DAYS = 7

export function getDeadline(task: MainTask): Date | undefined {
  if (task.deadlineDays === undefined) return undefined
  return addDays(new Date(task.createdAt), task.deadlineDays)
}
