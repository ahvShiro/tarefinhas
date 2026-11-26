import { createContext } from 'react'
import type { MainTask } from '@/models/mainTask'
import type { MainTaskInput, MainTaskInputErrors } from '@/models/mainTaskInput'
import type { MiniTask } from '@/models/miniTask'

export type CreateMainTaskResult = { ok: true } | { ok: false; errors: MainTaskInputErrors }

export interface TasksContextValue {
  loading: boolean
  /** True when the tasks could not come from the API. `loading` stays true. */
  loadFailed: boolean
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
  getMainTask(id: string): MainTask | undefined
  createMainTask(input: MainTaskInput): Promise<CreateMainTaskResult>
  toggleDone(miniTaskId: string): Promise<void>
  scheduleMiniTask(miniTaskId: string, date: string, time?: string): Promise<void>
  unscheduleMiniTask(miniTaskId: string): Promise<void>
  /**
   * Copies a miniTask: a new one with the same MainTask and text. It goes to the plan of `date` (`YYYY-MM-DD`,
   * keeping the hour of the original) or, without a date, to the task bank.
   */
  copyMiniTask(miniTaskId: string, date?: string): Promise<void>
  /** Adds a step to a MainTask, in the task bank. Returns false when the text is empty. */
  addStep(mainTaskId: string, text: string): Promise<boolean>
  /** Deletes a miniTask. Deleting the last one of a MainTask deletes the MainTask too. */
  deleteMiniTask(miniTaskId: string): Promise<void>
  /** Sets the exact time (`HH:mm`) of a scheduled miniTask. Without a time, it goes back to "Sem hora". */
  setMiniTaskTime(miniTaskId: string, time?: string): Promise<void>
  /** Sets the exact time (`HH:mm`) of a scheduled miniTask. Without a time, it goes back to "Sem hora". */
  setMiniTaskTime(miniTaskId: string, time?: string): Promise<void>
  /** Runs a miniTask: it goes to today's plan and starts (in progress). */
  runMiniTask(miniTaskId: string): Promise<void>
  /** Scheduled before today, not done, and its MainTask has a deadline: the person must choose. */
  overdueMiniTasks: MiniTask[]
  /** Moves an overdue miniTask to today. It stays in the plan. */
  postponeMiniTask(miniTaskId: string): Promise<void>
  /** Sends an overdue miniTask back to the task bank. It stays saved there. */
  forgetMiniTask(miniTaskId: string): Promise<void>
}

export const TasksContext = createContext<TasksContextValue | null>(null)
