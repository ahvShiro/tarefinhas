import type { Effort, MainTask } from '../mainTask'
import type { CleanMainTaskInput } from '../mainTaskInput'
import type { MiniTask } from '../miniTask'
import { request } from './apiClient'
import type { NewMiniTask, TaskRepository, TaskSnapshot } from './types'

// Shapes of the API (`MiniTaskGroupResponse` in the backend). Null fields become undefined, as in the models.

interface ApiMainTask {
  id: string
  name: string
  description: string
  deadlineDays: number | null
  effort: Effort
  color: string
  createdAt: string
}

interface ApiMiniTask {
  id: string
  text: string
  position: number
  done: boolean
  doneAt: string | null
  inProgress: boolean
  scheduledDate: string | null
  scheduledTime: string | null
  createdAt: string
}

interface ApiMiniTaskGroup {
  mainTask: ApiMainTask
  miniTasks: ApiMiniTask[]
}

function toMainTask(api: ApiMainTask): MainTask {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    deadlineDays: api.deadlineDays ?? undefined,
    effort: api.effort,
    color: api.color,
    createdAt: api.createdAt,
  }
}

function toMiniTask(mainTaskId: string, api: ApiMiniTask): MiniTask {
  return {
    id: api.id,
    mainTaskId,
    text: api.text,
    position: api.position,
    done: api.done,
    doneAt: api.doneAt ?? undefined,
    inProgress: api.inProgress,
    scheduledDate: api.scheduledDate ?? undefined,
    scheduledTime: api.scheduledTime ?? undefined,
    createdAt: api.createdAt,
  }
}

function toSnapshot(groups: ApiMiniTaskGroup[]): TaskSnapshot {
  return {
    mainTasks: groups.map((group) => toMainTask(group.mainTask)),
    miniTasks: groups.flatMap((group) => group.miniTasks.map((miniTask) => toMiniTask(group.mainTask.id, miniTask))),
  }
}

/** Tasks of the signed-in person, in the backend. Ids, dates and colors come from the API. */
export function createApiTaskRepository(): TaskRepository {
  return {
    async listAll() {
      return toSnapshot(await request<ApiMiniTaskGroup[]>('/mini-tasks'))
    },

    async createMainTask(input: CleanMainTaskInput) {
      const group = await request<ApiMiniTaskGroup>('/main-tasks', {
        method: 'POST',
        body: {
          name: input.name,
          description: input.description,
          deadlineDays: input.deadlineDays ?? null,
          effort: input.effort,
          miniTasks: input.steps.map((text) => ({ text })),
        },
      })
      const { mainTasks, miniTasks } = toSnapshot([group])
      return { mainTask: mainTasks[0], miniTasks }
    },

    async createMiniTask(draft: NewMiniTask) {
      const created = await request<ApiMiniTask>(`/main-tasks/${draft.mainTaskId}/mini-tasks`, {
        method: 'POST',
        body: {
          text: draft.text,
          scheduledDate: draft.scheduledDate ?? null,
          scheduledTime: draft.scheduledTime ?? null,
        },
      })
      return toMiniTask(draft.mainTaskId, created)
    },

    async updateMiniTask(miniTask: MiniTask) {
      // The schedule goes every time: null there means "in the task bank" or "no time" (UpdateMiniTaskRequest).
      const updated = await request<ApiMiniTask>(`/mini-tasks/${miniTask.id}`, {
        method: 'PATCH',
        body: {
          done: miniTask.done,
          inProgress: miniTask.inProgress,
          scheduledDate: miniTask.scheduledDate ?? null,
          scheduledTime: miniTask.scheduledTime ?? null,
        },
      })
      return toMiniTask(miniTask.mainTaskId, updated)
    },

    async deleteMiniTask(miniTaskId: string) {
      await request<void>(`/mini-tasks/${miniTaskId}`, { method: 'DELETE' })
    },
  }
}
