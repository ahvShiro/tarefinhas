import { EFFORT_LABELS, getDeadline, type MainTask } from './mainTask'
import { isInTaskBank, type MiniTask } from './miniTask'

function day(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/**
 * The task bank as plain text (the "Exportar" .txt file, which can also be pasted into an AI chat): each MainTask with steps in the bank (not done), with
 * description, effort, deadline and the steps in order. Steps already planned or done are left out, as the spec
 * says ("copia as tarefas do banco").
 */
export function bankAsText(mainTasks: MainTask[], miniTasks: MiniTask[], now = new Date()): string {
  const groups = [...mainTasks]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((mainTask) => ({
      mainTask,
      steps: miniTasks
        .filter((miniTask) => miniTask.mainTaskId === mainTask.id && isInTaskBank(miniTask) && !miniTask.done)
        .sort((a, b) => a.position - b.position),
    }))
    .filter((group) => group.steps.length > 0)

  if (groups.length === 0) return `Meu banco de tarefas (Tarefinhas), em ${day(now)}: está vazio.`

  const blocks = groups.map(({ mainTask, steps }) => {
    const deadline = getDeadline(mainTask)
    const lines = [`## ${mainTask.name}`]
    if (mainTask.description.trim() !== '') lines.push(`Descrição: ${mainTask.description.trim()}`)
    lines.push(
      `Esforço: ${EFFORT_LABELS[mainTask.effort].toLowerCase()}` +
        (deadline ? ` · Prazo: ${day(deadline)}${deadline < now ? ' (vencido)' : ''}` : ' · Sem prazo'),
    )
    lines.push('Passos que faltam:')
    steps.forEach((step, index) => lines.push(`${index + 1}. ${step.text}`))
    return lines.join('\n')
  })

  const stepCount = groups.reduce((total, group) => total + group.steps.length, 0)
  return [
    `Meu banco de tarefas (Tarefinhas), em ${day(now)}: ${groups.length} ${groups.length === 1 ? 'tarefa' : 'tarefas'}, ${stepCount} ${stepCount === 1 ? 'passo' : 'passos'} ainda sem dia marcado.`,
    ...blocks,
  ].join('\n\n')
}

/** Name of the exported file: `tarefinhas-banco-<yyyy-mm-dd>.txt`. */
export function bankFileName(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `tarefinhas-banco-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.txt`
}
