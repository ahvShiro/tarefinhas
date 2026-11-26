import type { MainTask } from '../mainTask'
import type { CleanMainTaskInput } from '../mainTaskInput'
import type { MiniTask } from '../miniTask'

export interface TaskSnapshot {
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
}

/** A step to add at the end of a MainTask. Without a date it goes to the task bank. */
export interface NewMiniTask {
  mainTaskId: string
  text: string
  scheduledDate?: string
  scheduledTime?: string
}

/** Tasks of the signed-in person. The repository gives the ids, dates and colors of what it creates. */
export interface TaskRepository {
  listAll(): Promise<TaskSnapshot>
  /** Saves the MainTask and its steps atomically. */
  createMainTask(input: CleanMainTaskInput): Promise<{ mainTask: MainTask; miniTasks: MiniTask[] }>
  createMiniTask(draft: NewMiniTask): Promise<MiniTask>
  /** Saves done, in progress and the schedule. Returns the saved miniTask. */
  updateMiniTask(miniTask: MiniTask): Promise<MiniTask>
  /** Deleting the last step of a MainTask deletes the MainTask too. */
  deleteMiniTask(miniTaskId: string): Promise<void>
}
