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
