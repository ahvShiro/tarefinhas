export interface MiniTask {
  id: string
  mainTaskId: string
  text: string
  position: number
  done: boolean
  inProgress: boolean
  /** Local date `YYYY-MM-DD`. Undefined while the miniTask is in the task bank. */
  scheduledDate?: string
  /** `HH:00`. Only set when scheduledDate is set. */
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
  return { ...miniTask, done: !miniTask.done }
}
