import type { MainTask } from '../mainTask'
import type { MiniTask } from '../miniTask'

export interface MainTaskRepository {
  listAll(): Promise<MainTask[]>
  /** Saves the MainTask and its MiniTasks atomically. */
  createWithMiniTasks(mainTask: MainTask, miniTasks: MiniTask[]): Promise<void>
  /** Deletes the MainTask and all its MiniTasks atomically. */
  deleteWithMiniTasks(mainTaskId: string): Promise<void>
}

export interface MiniTaskRepository {
  listAll(): Promise<MiniTask[]>
  create(miniTask: MiniTask): Promise<void>
  update(miniTask: MiniTask): Promise<void>
  delete(miniTaskId: string): Promise<void>
}
