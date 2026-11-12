import { MAX_DEADLINE_DAYS, MIN_DEADLINE_DAYS } from './mainTask'

export interface MainTaskInput {
  name: string
  description: string
  steps: string[]
  /** Raw text from the form. Empty means no deadline. */
  deadlineDays: string
}

export interface CleanMainTaskInput {
  name: string
  description: string
  steps: string[]
  deadlineDays?: number
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
  return { ok: true, cleaned: { name, description, steps, deadlineDays } }
}
