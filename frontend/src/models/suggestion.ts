import type { Effort, MainTask } from './mainTask'
import { DEFAULT_EFFORT } from './mainTask'
import { isInTaskBank, type MiniTask } from './miniTask'

/** Harder tasks weigh more, so they tend to come first. The order is never fixed: there is some chance in it. */
export const EFFORT_WEIGHT: Record<Effort, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

/** A miniTask the system can suggest: in the task bank and not done. */
export function isSuggestible(miniTask: MiniTask): boolean {
  return isInTaskBank(miniTask) && !miniTask.done
}

/**
 * The order of the suggestions: every suggestible miniTask, by priority (the effort of its MainTask) with some chance.
 * Weighted random order (Efraimidis-Spirakis): each miniTask gets the key `-ln(u) / weight` and the list is sorted
 * by key. A heavier miniTask has a smaller key on average, but a light one can still come first.
 * `random` returns a number in (0, 1]. It is a parameter so tests and callers can fix the chance.
 */
export function buildSuggestionQueue(
  miniTasks: MiniTask[],
  getMainTask: (id: string) => MainTask | undefined,
  random: () => number = () => 1 - Math.random(),
): string[] {
  return miniTasks
    .filter(isSuggestible)
    .map((miniTask) => {
      const effort = getMainTask(miniTask.mainTaskId)?.effort ?? DEFAULT_EFFORT
      return { id: miniTask.id, key: -Math.log(random()) / EFFORT_WEIGHT[effort] }
    })
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.id)
}

export interface RoundSummary {
  /** Steps chosen ("Vou fazer") in this round, in the order they were chosen. */
  chosen: { miniTask: MiniTask; mainTask: MainTask }[]
  byEffort: Record<Effort, number>
  /** Steps left for later ("Agora não") in this round. */
  skipped: number
}

/** What happened in one round of the deck, for the summary at the end. */
export function roundSummary(
  chosenIds: string[],
  skipped: number,
  miniTasks: MiniTask[],
  getMainTask: (id: string) => MainTask | undefined,
): RoundSummary {
  const byId = new Map(miniTasks.map((miniTask) => [miniTask.id, miniTask]))
  const chosen = chosenIds.flatMap((id) => {
    const miniTask = byId.get(id)
    const mainTask = miniTask ? getMainTask(miniTask.mainTaskId) : undefined
    return miniTask && mainTask ? [{ miniTask, mainTask }] : []
  })
  const byEffort: Record<Effort, number> = { easy: 0, medium: 0, hard: 0 }
  for (const { mainTask } of chosen) byEffort[mainTask.effort] += 1
  return { chosen, byEffort, skipped }
}

const EFFORT_WORDS: Record<Effort, [string, string]> = {
  hard: ['difícil', 'difíceis'],
  medium: ['média', 'médias'],
  easy: ['fácil', 'fáceis'],
}

/** "2 difíceis, 1 média e 1 fácil" (hardest first; efforts with 0 are left out). */
export function effortSentence(byEffort: Record<Effort, number>): string {
  const parts = (['hard', 'medium', 'easy'] as const)
    .filter((effort) => byEffort[effort] > 0)
    .map((effort) => `${byEffort[effort]} ${EFFORT_WORDS[effort][byEffort[effort] === 1 ? 0 : 1]}`)
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}
