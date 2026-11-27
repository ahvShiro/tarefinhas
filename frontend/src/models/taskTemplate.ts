import { EFFORTS, MAX_DEADLINE_DAYS, MIN_DEADLINE_DAYS, type Effort, type MainTask } from './mainTask'
import type { MiniTask } from './miniTask'

/** A MainTask saved to be used again: it fills the "Nova tarefa" form. */
export interface TaskTemplate {
  id: string
  name: string
  description: string
  steps: string[]
  effort: Effort
  deadlineDays?: number
  createdAt: string
}

export const MAX_TEMPLATES = 50

/** What the form needs to save a template. Returns null when there is no name or no step. */
export function templateFrom(
  fields: { name: string; description: string; steps: string[]; effort: Effort; deadlineDays: string },
  id: string,
  now: string,
): TaskTemplate | null {
  const name = fields.name.trim()
  const steps = fields.steps.map((step) => step.trim()).filter((step) => step !== '')
  if (name === '' || steps.length === 0) return null
  const parsed = Number(fields.deadlineDays.trim())
  const deadlineDays =
    fields.deadlineDays.trim() !== '' && Number.isInteger(parsed) && parsed >= MIN_DEADLINE_DAYS && parsed <= MAX_DEADLINE_DAYS
      ? parsed
      : undefined
  return { id, name, description: fields.description.trim(), steps, effort: fields.effort, deadlineDays, createdAt: now }
}

/** A template from an existing MainTask: its fields and all its steps, in order (done or not). */
export function templateFromMainTask(mainTask: MainTask, miniTasks: MiniTask[], id: string, now: string): TaskTemplate {
  return {
    id,
    name: mainTask.name,
    description: mainTask.description,
    steps: miniTasks
      .filter((miniTask) => miniTask.mainTaskId === mainTask.id)
      .sort((a, b) => a.position - b.position)
      .map((miniTask) => miniTask.text),
    effort: mainTask.effort,
    deadlineDays: mainTask.deadlineDays,
    createdAt: now,
  }
}

/** Keeps only well-formed templates from storage (it can hold anything). */
export function parseTemplates(data: unknown): TaskTemplate[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((item): TaskTemplate[] => {
    if (typeof item !== 'object' || item === null) return []
    const { id, name, description, steps, effort, deadlineDays, createdAt } = item as Record<string, unknown>
    if (typeof id !== 'string' || typeof name !== 'string' || typeof createdAt !== 'string') return []
    if (!Array.isArray(steps) || !steps.every((step) => typeof step === 'string') || steps.length === 0) return []
    return [
      {
        id,
        name,
        description: typeof description === 'string' ? description : '',
        steps,
        effort: EFFORTS.includes(effort as Effort) ? (effort as Effort) : 'medium',
        deadlineDays: typeof deadlineDays === 'number' ? deadlineDays : undefined,
        createdAt,
      },
    ]
  })
}
