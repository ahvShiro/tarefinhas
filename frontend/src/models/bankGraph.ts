import type { MainTask } from './mainTask'
import { isInTaskBank, type MiniTask } from './miniTask'

export type BankGraphNode =
  | { kind: 'mainTask'; id: string; mainTask: MainTask; color: string }
  | { kind: 'miniTask'; id: string; miniTask: MiniTask; color: string }

export interface BankGraphLink {
  source: string
  target: string
  color: string
}

const MAIN_TASK_NODE_PREFIX = 'main:'

/** Node id of a MainTask in the bank. Prefixed, so it never mixes with miniTask ids (also used as drag ids). */
export function mainTaskNodeId(mainTaskId: string): string {
  return `${MAIN_TASK_NODE_PREFIX}${mainTaskId}`
}

export function isMainTaskNodeId(id: string): boolean {
  return id.startsWith(MAIN_TASK_NODE_PREFIX)
}

/**
 * The task bank graph: each MainTask that still has miniTasks in the bank is a node, and each of those
 * miniTasks links to it. MiniTasks of different MainTasks are never linked. No coordinates: the bank places them.
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
    if (inBank.length === 0) continue

    const hubId = mainTaskNodeId(mainTask.id)
    nodes.push({ kind: 'mainTask', id: hubId, mainTask, color: mainTask.color })
    for (const miniTask of inBank) {
      nodes.push({ kind: 'miniTask', id: miniTask.id, miniTask, color: mainTask.color })
      links.push({ source: hubId, target: miniTask.id, color: mainTask.color })
    }
  }

  return { nodes, links }
}
