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

/** What the "Editar tarefa" form sends: the MainTask fields and the new text of each existing step, by id. */
export interface MainTaskEditInput {
  name: string
  description: string
  /** Raw text from the form. Empty means no deadline. */
  deadlineDays: string
  effort: Effort
  steps: { id: string; text: string }[]
}

export interface CleanMainTaskEdit {
  name: string
  description: string
  deadlineDays?: number
  effort: Effort
  steps: { id: string; text: string }[]
}

export type MainTaskEditValidation =
  | { ok: true; cleaned: CleanMainTaskEdit }
  | { ok: false; errors: MainTaskInputErrors }

/**
 * Same rules as the sign-up form for name, description, effort and deadline. A step cannot be left empty here:
 * to take a step out, the person deletes it (menu of the step), so an edit never deletes by accident.
 */
export function validateMainTaskEdit(input: MainTaskEditInput): MainTaskEditValidation {
  const base = validateMainTaskInput({
    name: input.name,
    description: input.description,
    deadlineDays: input.deadlineDays,
    effort: input.effort,
    steps: ['-'],
  })
  const errors: MainTaskInputErrors = base.ok ? {} : { ...base.errors }
  const steps = input.steps.map((step) => ({ id: step.id, text: step.text.trim() }))
  if (steps.some((step) => step.text === '')) {
    errors.steps = 'Um passo não pode ficar vazio. Para tirar um passo, use “Deletar” no menu dele.'
  }
  if (Object.keys(errors).length > 0 || !base.ok) return { ok: false, errors }
  const { name, description, deadlineDays, effort } = base.cleaned
  return { ok: true, cleaned: { name, description, deadlineDays, effort, steps } }
}
