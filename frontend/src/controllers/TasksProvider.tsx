import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MainTask } from '@/models/mainTask'
import {
  duplicateMainTaskInput,
  validateMainTaskEdit,
  validateMainTaskInput,
  type MainTaskEditInput,
  type MainTaskInput,
  type MainTaskInputErrors,
} from '@/models/mainTaskInput'
import {
  isInTaskBank,
  scheduleMiniTask as scheduled,
  setMiniTaskTime as withTime,
  startMiniTask,
  toggleMiniTaskDone,
  unscheduleMiniTask as unscheduled,
  type MiniTask,
} from '@/models/miniTask'
import { moveToToday, splitOverdue, todayKey } from '@/models/overdue'
import { ApiError, FORM_ERROR_KEY } from '@/models/repositories/apiClient'
import { createApiTaskRepository } from '@/models/repositories/tasksApi'
import { EditNotSupportedError } from '@/models/repositories/types'
import {
  TasksContext,
  type CreateMainTaskResult,
  type EditMainTaskResult,
  type TasksContextValue,
} from './tasksContext'

const GENERIC_ERROR = 'Não foi possível salvar. Tente de novo.'

// Single place where the persistence implementation is chosen.
const repository = createApiTaskRepository()

export function TasksProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [miniTasks, setMiniTasks] = useState<MiniTask[]>([])

  useEffect(() => {
    let cancelled = false
    repository
      .listAll()
      .then(async ({ mainTasks: loadedMainTasks, miniTasks: loadedMiniTasks }) => {
        // Rule for tasks not done: without a deadline, they move to today by themselves.
        const byId = new Map(loadedMainTasks.map((task) => [task.id, task]))
        const { rolled } = splitOverdue(loadedMiniTasks, (id) => byId.get(id), todayKey())
        const saved = await Promise.all(rolled.map((miniTask) => repository.updateMiniTask(miniTask)))
        if (cancelled) return
        const savedById = new Map(saved.map((miniTask) => [miniTask.id, miniTask]))
        setMainTasks(loadedMainTasks)
        setMiniTasks(loadedMiniTasks.map((miniTask) => savedById.get(miniTask.id) ?? miniTask))
        setLoading(false)
      })
      .catch(() => {
        // 401 already sent the person to the homepage (AuthProvider). Otherwise the screen says it failed.
        if (!cancelled) setLoadFailed(true)
      })
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

      try {
        const created = await repository.createMainTask(validation.cleaned)
        setMainTasks((current) => [...current, created.mainTask])
        setMiniTasks((current) => [...current, ...created.miniTasks])
        return { ok: true }
      } catch (error) {
        return { ok: false, errors: mainTaskErrors(error) }
      }
    },
    [],
  )

  const updateMiniTask = useCallback(
    async (miniTaskId: string, change: (miniTask: MiniTask) => MiniTask) => {
      const current = miniTasks.find((miniTask) => miniTask.id === miniTaskId)
      if (!current) return
      const updated = await repository.updateMiniTask(change(current))
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
      // Same MainTask and text, at the end of the steps, not done. On a day, it keeps the hour of the original.
      const copy = await repository.createMiniTask({
        mainTaskId: source.mainTaskId,
        text: source.text,
        scheduledDate: date,
        scheduledTime: date === undefined ? undefined : source.scheduledTime,
      })
      setMiniTasks((list) => [...list, copy])
    },
    [miniTasks],
  )

  const addStep = useCallback(
    async (mainTaskId: string, text: string) => {
      const cleaned = text.trim()
      if (cleaned === '' || !mainTasksById.has(mainTaskId)) return false
      const step = await repository.createMiniTask({ mainTaskId, text: cleaned })
      setMiniTasks((list) => [...list, step])
      return true
    },
    [mainTasksById],
  )

  const deleteMiniTask = useCallback(
    async (miniTaskId: string) => {
      const target = miniTasks.find((miniTask) => miniTask.id === miniTaskId)
      if (!target) return
      const isLastStep = miniTasks.filter((miniTask) => miniTask.mainTaskId === target.mainTaskId).length === 1
      // A MainTask needs at least 1 step: the API deletes it with its last step, and so does the screen.
      await repository.deleteMiniTask(miniTaskId)
      if (isLastStep) {
        setMainTasks((list) => list.filter((mainTask) => mainTask.id !== target.mainTaskId))
        setMiniTasks((list) => list.filter((miniTask) => miniTask.mainTaskId !== target.mainTaskId))
      } else {
        setMiniTasks((list) => list.filter((miniTask) => miniTask.id !== miniTaskId))
      }
    },
    [miniTasks],
  )

  const editMainTask = useCallback(
    async (mainTaskId: string, input: MainTaskEditInput): Promise<EditMainTaskResult> => {
      const validation = validateMainTaskEdit(input)
      if (!validation.ok) return validation
      const { cleaned } = validation
      let savedOnServer = true
      try {
        await repository.editMainTask(mainTaskId, cleaned)
      } catch (error) {
        // Until the backend has the route, the change shows now and goes away on reload.
        if (!(error instanceof EditNotSupportedError)) {
          return { ok: false, errors: { name: error instanceof Error ? error.message : 'Não foi possível salvar.' } }
        }
        savedOnServer = false
      }
      const texts = new Map(cleaned.steps.map((step) => [step.id, step.text]))
      setMainTasks((list) =>
        list.map((mainTask) =>
          mainTask.id === mainTaskId
            ? {
                ...mainTask,
                name: cleaned.name,
                description: cleaned.description,
                deadlineDays: cleaned.deadlineDays,
                effort: cleaned.effort,
              }
            : mainTask,
        ),
      )
      setMiniTasks((list) =>
        list.map((miniTask) => {
          const text = texts.get(miniTask.id)
          return text === undefined ? miniTask : { ...miniTask, text }
        }),
      )
      return { ok: true, savedOnServer }
    },
    [],
  )

  const duplicateMainTask = useCallback(
    async (mainTaskId: string) => {
      const source = mainTasksById.get(mainTaskId)
      if (!source) return
      // Every step, in order. The copies go to the task bank, not done.
      const steps = miniTasks
        .filter((miniTask) => miniTask.mainTaskId === mainTaskId)
        .sort((a, b) => a.position - b.position)
        .map((miniTask) => miniTask.text)
      const created = await repository.createMainTask(duplicateMainTaskInput(source, steps))
      setMainTasks((list) => [...list, created.mainTask])
      setMiniTasks((list) => [...list, ...created.miniTasks])
    },
    [mainTasksById, miniTasks],
  )

  const deleteMainTask = useCallback(
    async (mainTaskId: string) => {
      // The API has no route for a whole MainTask: its steps go one by one, and the last one takes the MainTask.
      const stepIds = miniTasks.filter((miniTask) => miniTask.mainTaskId === mainTaskId).map((miniTask) => miniTask.id)
      const deleted = new Set<string>()
      try {
        for (const id of stepIds) {
          await repository.deleteMiniTask(id)
          deleted.add(id)
        }
      } finally {
        // If one fails, the screen keeps the steps that are still saved.
        setMiniTasks((list) => list.filter((miniTask) => !deleted.has(miniTask.id)))
        if (deleted.size === stepIds.length) {
          setMainTasks((list) => list.filter((mainTask) => mainTask.id !== mainTaskId))
        }
      }
    },
    [miniTasks],
  )

  const sendMainTaskToToday = useCallback(
    async (mainTaskId: string) => {
      const today = todayKey()
      const moved = miniTasks
        .filter((miniTask) => miniTask.mainTaskId === mainTaskId && isInTaskBank(miniTask) && !miniTask.done)
        .map((miniTask) => scheduled(miniTask, today))
      if (moved.length === 0) return
      const saved = await Promise.all(moved.map((miniTask) => repository.updateMiniTask(miniTask)))
      const savedById = new Map(saved.map((miniTask) => [miniTask.id, miniTask]))
      setMiniTasks((list) => list.map((miniTask) => savedById.get(miniTask.id) ?? miniTask))
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
      loadFailed,
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
      editMainTask,
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
      loadFailed,
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
      editMainTask,
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

/** Errors of the task form. The API names a step `miniTasks[0].text`; the form shows step errors under `steps`. */
function mainTaskErrors(error: unknown): MainTaskInputErrors {
  if (!(error instanceof ApiError)) return { name: GENERIC_ERROR }
  const errors: MainTaskInputErrors = {}
  for (const [field, message] of Object.entries(error.errors)) {
    if (field === 'miniTasks' || field.startsWith('miniTasks[')) errors.steps ??= message
    else if (field === 'name' || field === 'description' || field === 'deadlineDays' || field === 'effort') {
      errors[field] = message
    }
  }
  // Errors with no field (server off, session over) go under the name, the first field of the form.
  return Object.keys(errors).length > 0 ? errors : { name: error.errors[FORM_ERROR_KEY] ?? GENERIC_ERROR }
}
