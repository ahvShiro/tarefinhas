import { mainTaskNodeId } from './bankGraph'
import type { MainTask } from './mainTask'
import { isInTaskBank, type MiniTask } from './miniTask'
import { matchesAll, searchWords } from './text'

/**
 * Bank nodes that match a search, by node id (miniTask id, or `main:<id>` for a MainTask). A step matches by its
 * text or by the name of its MainTask; a MainTask node matches when its name matches or one of its bank steps does,
 * so a found step keeps its hub. Null when the search is blank (nothing is dimmed).
 */
export function matchBank(query: string, mainTasks: MainTask[], miniTasks: MiniTask[]): Set<string> | null {
  const words = searchWords(query)
  if (words.length === 0) return null
  const namesById = new Map(mainTasks.map((mainTask) => [mainTask.id, mainTask.name]))
  const matched = new Set<string>()
  for (const miniTask of miniTasks) {
    if (!isInTaskBank(miniTask)) continue
    if (matchesAll(`${miniTask.text} ${namesById.get(miniTask.mainTaskId) ?? ''}`, words)) {
      matched.add(miniTask.id)
      matched.add(mainTaskNodeId(miniTask.mainTaskId))
    }
  }
  for (const mainTask of mainTasks) {
    if (matchesAll(mainTask.name, words)) matched.add(mainTaskNodeId(mainTask.id))
  }
  return matched
}
