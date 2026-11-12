import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { pickRandomColor } from '@/models/colors'
import type { MainTask } from '@/models/mainTask'
import { validateMainTaskInput, type MainTaskInput } from '@/models/mainTaskInput'
import {
  scheduleMiniTask as scheduled,
  toggleMiniTaskDone,
  unscheduleMiniTask as unscheduled,
  type MiniTask,
} from '@/models/miniTask'
import { createIndexedDbRepositories } from '@/models/repositories/indexedDb'
import { TasksContext, type CreateMainTaskResult, type TasksContextValue } from './tasksContext'

// Single place where the persistence implementation is chosen.
const repositories = createIndexedDbRepositories()

export function TasksProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [miniTasks, setMiniTasks] = useState<MiniTask[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([repositories.mainTasks.listAll(), repositories.miniTasks.listAll()]).then(
      ([loadedMainTasks, loadedMiniTasks]) => {
        if (cancelled) return
        setMainTasks(loadedMainTasks)
        setMiniTasks(loadedMiniTasks)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const mainTasksById = useMemo(() => new Map(mainTasks.map((task) => [task.id, task])), [mainTasks])

  const getMainTask = useCallback((id: string) => mainTasksById.get(id), [mainTasksById])

  const createMainTask = useCallback(
    async (input: MainTaskInput): Promise<CreateMainTaskResult> => {
      const validation = validateMainTaskInput(input)
      if (!validation.ok) return validation

      const { cleaned } = validation
      const now = new Date().toISOString()
      const mainTask: MainTask = {
        id: crypto.randomUUID(),
        name: cleaned.name,
        description: cleaned.description,
        deadlineDays: cleaned.deadlineDays,
        color: pickRandomColor(mainTasks.map((task) => task.color)),
        createdAt: now,
      }
      const newMiniTasks: MiniTask[] = cleaned.steps.map((text, index) => ({
        id: crypto.randomUUID(),
        mainTaskId: mainTask.id,
        text,
        position: index + 1,
        done: false,
        inProgress: false,
        createdAt: now,
      }))

      await repositories.mainTasks.createWithMiniTasks(mainTask, newMiniTasks)
      setMainTasks((current) => [...current, mainTask])
      setMiniTasks((current) => [...current, ...newMiniTasks])
      return { ok: true }
    },
    [mainTasks],
  )

  const updateMiniTask = useCallback(
    async (miniTaskId: string, change: (miniTask: MiniTask) => MiniTask) => {
      const current = miniTasks.find((miniTask) => miniTask.id === miniTaskId)
      if (!current) return
      const updated = change(current)
      await repositories.miniTasks.update(updated)
      setMiniTasks((list) => list.map((miniTask) => (miniTask.id === miniTaskId ? updated : miniTask)))
    },
    [miniTasks],
  )

  const toggleDone = useCallback(
    (miniTaskId: string) => updateMiniTask(miniTaskId, toggleMiniTaskDone),
    [updateMiniTask],
  )

  const scheduleMiniTask = useCallback(
    (miniTaskId: string, date: string, time?: string) =>
      updateMiniTask(miniTaskId, (miniTask) => scheduled(miniTask, date, time)),
    [updateMiniTask],
  )

  const unscheduleMiniTask = useCallback(
    (miniTaskId: string) => updateMiniTask(miniTaskId, unscheduled),
    [updateMiniTask],
  )

  const value = useMemo<TasksContextValue>(
    () => ({
      loading,
      mainTasks,
      miniTasks,
      getMainTask,
      createMainTask,
      toggleDone,
      scheduleMiniTask,
      unscheduleMiniTask,
    }),
    [loading, mainTasks, miniTasks, getMainTask, createMainTask, toggleDone, scheduleMiniTask, unscheduleMiniTask],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}
