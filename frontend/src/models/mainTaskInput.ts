import { EFFORTS, MAX_DEADLINE_DAYS, MIN_DEADLINE_DAYS, type Effort, type MainTask } from './mainTask'

export interface MainTaskInput {
  name: string
  description: string
  steps: string[]
  /** Raw text from the form. Empty means no deadline. */
  deadlineDays: string
  effort: Effort
}

export interface CleanMainTaskInput {
  name: string
  description: string
  steps: string[]
  deadlineDays?: number
  effort: Effort
}

export type MainTaskInputErrors = Partial<Record<keyof MainTaskInput, string>>

export type MainTaskInputValidation =
  | { ok: true; cleaned: CleanMainTaskInput }
  | { ok: false; errors: MainTaskInputErrors }

export function validateMainTaskInput(input: MainTaskInput): MainTaskInputValidation {
  const name = input.name.trim()
  const description = input.description.trim()
  const steps = input.steps.map((step) => step.trim()).filter((step) => step !== '')
  const rawDeadline = input.deadlineDays.trim()

  const errors: MainTaskInputErrors = {}
  if (name === '') errors.name = 'Informe o nome.'
  if (description === '') errors.description = 'Informe a descrição.'
  if (steps.length === 0) errors.steps = 'Adicione pelo menos 1 passo.'

  if (!EFFORTS.includes(input.effort)) errors.effort = 'Escolha o esforço.'

  let deadlineDays: number | undefined
  if (rawDeadline !== '') {
    const parsed = Number(rawDeadline)
    if (!Number.isInteger(parsed) || parsed < MIN_DEADLINE_DAYS || parsed > MAX_DEADLINE_DAYS) {
      errors.deadlineDays = `O prazo deve ser vazio ou um número inteiro de ${MIN_DEADLINE_DAYS} a ${MAX_DEADLINE_DAYS}.`
    } else {
      deadlineDays = parsed
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, cleaned: { name, description, steps, deadlineDays, effort: input.effort } }
}

/**
 * What creates a copy of a MainTask: same description, deadline and effort, "(cópia)" in the name and the given steps.
 * The repository gives the new color, and the deadline counts again from now, because it counts from `createdAt`.
 */
export function duplicateMainTaskInput(source: MainTask, steps: string[]): CleanMainTaskInput {
  return {
    name: `${source.name} (cópia)`,
    description: source.description,
    steps,
    deadlineDays: source.deadlineDays,
    effort: source.effort,
  }
}
