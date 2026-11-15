import type { MainTask } from './mainTask'
import { isInTaskBank, type MiniTask } from './miniTask'

export interface BankGraphNode {
  miniTask: MiniTask
  color: string
}

export interface BankGraphLink {
  source: string
  target: string
  color: string
}

/**
 * The task bank graph: every miniTask in the bank, each linked to the next one of the same MainTask
 * (by position). MiniTasks of different MainTasks are never linked. No coordinates: the bank places them.
 */
export function buildBankGraph(
  mainTasks: MainTask[],
  miniTasks: MiniTask[],
): { nodes: BankGraphNode[]; links: BankGraphLink[] } {
  const nodes: BankGraphNode[] = []
  const links: BankGraphLink[] = []
  const ordered = [...mainTasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const mainTask of ordered) {
    const inBank = miniTasks
      .filter((miniTask) => miniTask.mainTaskId === mainTask.id && isInTaskBank(miniTask))
      .sort((a, b) => a.position - b.position)

    inBank.forEach((miniTask, index) => {
      nodes.push({ miniTask, color: mainTask.color })
      const next = inBank[index + 1]
      if (next) links.push({ source: miniTask.id, target: next.id, color: mainTask.color })
    })
  }

  return { nodes, links }
}
