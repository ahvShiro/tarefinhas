export interface MiniTask {
  id: string
  mainTaskId: string
  text: string
  position: number
  done: boolean
  /** When the person checked it as done (ISO). Undefined while it is not done. */
  doneAt?: string
  inProgress: boolean
  /** Local date `YYYY-MM-DD`. Undefined while the miniTask is in the task bank. */
  scheduledDate?: string
  /** `HH:mm`: `HH:00` for the hour slot, or an exact time like `13:23`. Only set when scheduledDate is set. */
  scheduledTime?: string
  createdAt: string
}

export function isInTaskBank(miniTask: MiniTask): boolean {
  return miniTask.scheduledDate === undefined
}

export function scheduleMiniTask(miniTask: MiniTask, date: string, time?: string): MiniTask {
  return { ...miniTask, scheduledDate: date, scheduledTime: time }
}

export function unscheduleMiniTask(miniTask: MiniTask): MiniTask {
  return { ...miniTask, scheduledDate: undefined, scheduledTime: undefined }
}

export function toggleMiniTaskDone(miniTask: MiniTask): MiniTask {
  const done = !miniTask.done
  return { ...miniTask, done, doneAt: done ? new Date().toISOString() : undefined }
}

/** The person runs the miniTask: it goes to the plan of the day and starts. In progress is not shown in the interface. */
export function startMiniTask(miniTask: MiniTask, date: string): MiniTask {
  return { ...scheduleMiniTask(miniTask, date), inProgress: true }
}

/** Position for a new step at the end of its MainTask. */
export function nextPosition(miniTasks: MiniTask[], mainTaskId: string): number {
  const positions = miniTasks.filter((miniTask) => miniTask.mainTaskId === mainTaskId).map((miniTask) => miniTask.position)
  return positions.length === 0 ? 1 : Math.max(...positions) + 1
}

/** A new step of a MainTask. It starts in the task bank. */
export function createStep(mainTaskId: string, text: string, position: number, id: string, now: string): MiniTask {
  return { id, mainTaskId, text, position, done: false, inProgress: false, createdAt: now }
}

/**
 * A copy of a miniTask: same MainTask and same text, new id, at the end of the steps, in the task bank, not done.
 * It lets the person do the same step on another day.
 */
export function duplicateMiniTask(source: MiniTask, position: number, id: string, now: string): MiniTask {
  return createStep(source.mainTaskId, source.text, position, id, now)
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Returns the time if it is `HH:mm` (00:00 to 23:59), and null if it is not. */
export function parseTime(value: string): string | null {
  return TIME_PATTERN.test(value) ? value : null
}

/** The hour slot of the agenda that holds a time: 13:23 is in 13:00. */
export function hourSlotOf(time: string): string {
  return `${time.slice(0, 2)}:00`
}

/** True for a time with minutes, like 13:23. Hour times (13:00) have no exact time to show. */
export function hasExactMinutes(time: string | undefined): time is string {
  return time !== undefined && !time.endsWith(':00')
}

/**
 * Sets the exact time of a scheduled miniTask (`HH:mm`), or takes the time off with `undefined`, and it goes back
 * to "Sem hora" of its day. A miniTask in the task bank has no day, so it has no time either.
 */
export function setMiniTaskTime(miniTask: MiniTask, time: string | undefined): MiniTask {
  if (miniTask.scheduledDate === undefined) return miniTask
  return { ...miniTask, scheduledTime: time }
}
