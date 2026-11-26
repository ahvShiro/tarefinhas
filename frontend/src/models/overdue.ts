import { format, startOfToday } from 'date-fns'
import type { MainTask } from './mainTask'
import { scheduleMiniTask, type MiniTask } from './miniTask'

/** Local date `YYYY-MM-DD`, the same format as `MiniTask.scheduledDate`. */
export function todayKey(): string {
  return format(startOfToday(), 'yyyy-MM-dd')
}

/** A miniTask that was in the plan for a day before today and was not done. */
export function isOverdue(miniTask: MiniTask, today: string): boolean {
  return !miniTask.done && miniTask.scheduledDate !== undefined && miniTask.scheduledDate < today
}

/** Moves the miniTask to today and keeps its hour. */
export function moveToToday(miniTask: MiniTask, today: string): MiniTask {
  return scheduleMiniTask(miniTask, today, miniTask.scheduledTime)
}

/**
 * Splits the overdue miniTasks by the rule for tasks not done:
 * - MainTask without deadline: it moves to today by itself (`rolled`).
 * - MainTask with deadline: the person chooses to postpone or forget (`needsChoice`).
 */
export function splitOverdue(
  miniTasks: MiniTask[],
  getMainTask: (id: string) => MainTask | undefined,
  today: string,
): { rolled: MiniTask[]; needsChoice: MiniTask[] } {
  const rolled: MiniTask[] = []
  const needsChoice: MiniTask[] = []
  for (const miniTask of miniTasks) {
    if (!isOverdue(miniTask, today)) continue
    const mainTask = getMainTask(miniTask.mainTaskId)
    if (mainTask?.deadlineDays === undefined) rolled.push(moveToToday(miniTask, today))
    else needsChoice.push(miniTask)
  }
  return { rolled, needsChoice }
}
