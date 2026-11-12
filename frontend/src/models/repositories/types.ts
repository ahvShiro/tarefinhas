import type { MainTask } from '../mainTask'
import type { MiniTask } from '../miniTask'

export interface MainTaskRepository {
  listAll(): Promise<MainTask[]>
  /** Saves the MainTask and its MiniTasks atomically. */
  createWithMiniTasks(mainTask: MainTask, miniTasks: MiniTask[]): Promise<void>
}

export interface MiniTaskRepository {
  listAll(): Promise<MiniTask[]>
  update(miniTask: MiniTask): Promise<void>
}
