import { createContext } from 'react'
import type { MainTask } from '@/models/mainTask'
import type { MainTaskInput, MainTaskInputErrors } from '@/models/mainTaskInput'
import type { MiniTask } from '@/models/miniTask'

export type CreateMainTaskResult = { ok: true } | { ok: false; errors: MainTaskInputErrors }

export interface TasksContextValue {
  loading: boolean
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
  getMainTask(id: string): MainTask | undefined
  createMainTask(input: MainTaskInput): Promise<CreateMainTaskResult>
  toggleDone(miniTaskId: string): Promise<void>
  scheduleMiniTask(miniTaskId: string, date: string, time?: string): Promise<void>
  unscheduleMiniTask(miniTaskId: string): Promise<void>
}

export const TasksContext = createContext<TasksContextValue | null>(null)
