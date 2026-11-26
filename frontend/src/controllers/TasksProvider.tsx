import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { pickRandomColor } from '@/models/colors'
import { DEFAULT_EFFORT, duplicateMainTask as copyOfMainTask, type MainTask } from '@/models/mainTask'
import { validateMainTaskInput, type MainTaskInput } from '@/models/mainTaskInput'
import {
  createStep,
  duplicateMiniTask,
  isInTaskBank,
  nextPosition,
  scheduleMiniTask as scheduled,
  setMiniTaskTime as withTime,
  startMiniTask,
  toggleMiniTaskDone,
  unscheduleMiniTask as unscheduled,
  type MiniTask,
} from '@/models/miniTask'
import { moveToToday, splitOverdue, todayKey } from '@/models/overdue'
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
      async ([loadedMainTasks, loadedMiniTasks]) => {
        // Tasks saved before the effort field existed get the default effort.
        const normalized = loadedMainTasks.map((task) => ({ ...task, effort: task.effort ?? DEFAULT_EFFORT }))
        // Rule for tasks not done: without a deadline, they move to today by themselves.
        const byId = new Map(normalized.map((task) => [task.id, task]))
        const { rolled } = splitOverdue(loadedMiniTasks, (id) => byId.get(id), todayKey())
        await Promise.all(rolled.map((miniTask) => repositories.miniTasks.update(miniTask)))
        if (cancelled) return
        const rolledById = new Map(rolled.map((miniTask) => [miniTask.id, miniTask]))
        setMainTasks(normalized)
        setMiniTasks(loadedMiniTasks.map((miniTask) => rolledById.get(miniTask.id) ?? miniTask))
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
        effort: cleaned.effort,
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

  const copyMiniTask = useCallback(
    async (miniTaskId: string, date?: string) => {
      const source = miniTasks.find((miniTask) => miniTask.id === miniTaskId)
      if (!source) return
      const duplicate = duplicateMiniTask(
        source,
        nextPosition(miniTasks, source.mainTaskId),
        crypto.randomUUID(),
        new Date().toISOString(),
      )
      const copy = date === undefined ? duplicate : scheduled(duplicate, date, source.scheduledTime)
      await repositories.miniTasks.create(copy)
      setMiniTasks((list) => [...list, copy])
    },
    [miniTasks],
  )

  const addStep = useCallback(
    async (mainTaskId: string, text: string) => {
      const cleaned = text.trim()
      if (cleaned === '' || !mainTasksById.has(mainTaskId)) return false
      const step = createStep(
        mainTaskId,
        cleaned,
        nextPosition(miniTasks, mainTaskId),
        crypto.randomUUID(),
        new Date().toISOString(),
      )
      await repositories.miniTasks.create(step)
      setMiniTasks((list) => [...list, step])
      return true
    },
    [miniTasks, mainTasksById],
  )

  const deleteMiniTask = useCallback(
    async (miniTaskId: string) => {
      const target = miniTasks.find((miniTask) => miniTask.id === miniTaskId)
      if (!target) return
      const isLastStep = miniTasks.filter((miniTask) => miniTask.mainTaskId === target.mainTaskId).length === 1
      if (isLastStep) {
        // A MainTask needs at least 1 step: without any, it goes too.
        await repositories.mainTasks.deleteWithMiniTasks(target.mainTaskId)
        setMainTasks((list) => list.filter((mainTask) => mainTask.id !== target.mainTaskId))
        setMiniTasks((list) => list.filter((miniTask) => miniTask.mainTaskId !== target.mainTaskId))
      } else {
        await repositories.miniTasks.delete(miniTaskId)
        setMiniTasks((list) => list.filter((miniTask) => miniTask.id !== miniTaskId))
      }
    },
    [miniTasks],
  )

  const duplicateMainTask = useCallback(
    async (mainTaskId: string) => {
      const source = mainTasksById.get(mainTaskId)
      if (!source) return
      const now = new Date().toISOString()
      const copy = copyOfMainTask(source, pickRandomColor(mainTasks.map((task) => task.color)), crypto.randomUUID(), now)
      const steps = miniTasks
        .filter((miniTask) => miniTask.mainTaskId === mainTaskId)
        .sort((a, b) => a.position - b.position)
        .map((miniTask, index) => createStep(copy.id, miniTask.text, index + 1, crypto.randomUUID(), now))
      await repositories.mainTasks.createWithMiniTasks(copy, steps)
      setMainTasks((list) => [...list, copy])
      setMiniTasks((list) => [...list, ...steps])
    },
    [mainTasks, mainTasksById, miniTasks],
  )

  const deleteMainTask = useCallback(async (mainTaskId: string) => {
    await repositories.mainTasks.deleteWithMiniTasks(mainTaskId)
    setMainTasks((list) => list.filter((mainTask) => mainTask.id !== mainTaskId))
    setMiniTasks((list) => list.filter((miniTask) => miniTask.mainTaskId !== mainTaskId))
  }, [])

  const sendMainTaskToToday = useCallback(
    async (mainTaskId: string) => {
      const today = todayKey()
      const moved = miniTasks
        .filter((miniTask) => miniTask.mainTaskId === mainTaskId && isInTaskBank(miniTask) && !miniTask.done)
        .map((miniTask) => scheduled(miniTask, today))
      if (moved.length === 0) return
      await Promise.all(moved.map((miniTask) => repositories.miniTasks.update(miniTask)))
      const movedById = new Map(moved.map((miniTask) => [miniTask.id, miniTask]))
      setMiniTasks((list) => list.map((miniTask) => movedById.get(miniTask.id) ?? miniTask))
    },
    [miniTasks],
  )

  const setMiniTaskTime = useCallback(
    (miniTaskId: string, time?: string) => updateMiniTask(miniTaskId, (miniTask) => withTime(miniTask, time)),
    [updateMiniTask],
  )

  const runMiniTask = useCallback(
    (miniTaskId: string) => updateMiniTask(miniTaskId, (miniTask) => startMiniTask(miniTask, todayKey())),
    [updateMiniTask],
  )

  const overdueMiniTasks = useMemo(
    () => splitOverdue(miniTasks, getMainTask, todayKey()).needsChoice,
    [miniTasks, getMainTask],
  )

  const postponeMiniTask = useCallback(
    (miniTaskId: string) => updateMiniTask(miniTaskId, (miniTask) => moveToToday(miniTask, todayKey())),
    [updateMiniTask],
  )

  // Forgetting sends it back to the task bank, where it stays saved.
  const forgetMiniTask = unscheduleMiniTask

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
      copyMiniTask,
      addStep,
      deleteMiniTask,
      duplicateMainTask,
      deleteMainTask,
      sendMainTaskToToday,
      setMiniTaskTime,
      runMiniTask,
      overdueMiniTasks,
      postponeMiniTask,
      forgetMiniTask,
    }),
    [
      loading,
      mainTasks,
      miniTasks,
      getMainTask,
      createMainTask,
      toggleDone,
      scheduleMiniTask,
      unscheduleMiniTask,
      copyMiniTask,
      addStep,
      deleteMiniTask,
      duplicateMainTask,
      deleteMainTask,
      sendMainTaskToToday,
      setMiniTaskTime,
      runMiniTask,
      overdueMiniTasks,
      postponeMiniTask,
      forgetMiniTask,
    ],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}
