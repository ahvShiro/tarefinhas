import { useEffect, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'
import type { MainTask } from '@/models/mainTask'
import { isInTaskBank, type MiniTask } from '@/models/miniTask'
import { TASK_BANK_DROP_ID } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'

const COLUMN_WIDTH = 220
const ROW_HEIGHT = 110

type MiniTaskNodeData = {
  miniTask: MiniTask
  color: string
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

type MiniTaskNode = Node<MiniTaskNodeData, 'miniTask'>

const hiddenHandle = { opacity: 0, pointerEvents: 'none' } as const

function MiniTaskNodeView({ data }: NodeProps<MiniTaskNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={hiddenHandle} />
      <DraggableMiniTask
        miniTask={data.miniTask}
        color={data.color}
        onOpen={data.onOpen}
        onToggleDone={data.onToggleDone}
      />
      <Handle type="source" position={Position.Right} isConnectable={false} style={hiddenHandle} />
    </>
  )
}

const nodeTypes = { miniTask: MiniTaskNodeView }

interface TaskBankProps {
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

/** One row per MainTask; its bank miniTasks in position order, each linked to the next one. */
function buildGraph(
  mainTasks: MainTask[],
  miniTasks: MiniTask[],
  callbacks: Pick<TaskBankProps, 'onOpen' | 'onToggleDone'>,
): { nodes: MiniTaskNode[]; edges: Edge[] } {
  const nodes: MiniTaskNode[] = []
  const edges: Edge[] = []
  const rows = [...mainTasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  let row = 0
  for (const mainTask of rows) {
    const inBank = miniTasks
      .filter((miniTask) => miniTask.mainTaskId === mainTask.id && isInTaskBank(miniTask))
      .sort((a, b) => a.position - b.position)
    if (inBank.length === 0) continue

    inBank.forEach((miniTask, column) => {
      nodes.push({
        id: miniTask.id,
        type: 'miniTask',
        position: { x: column * COLUMN_WIDTH, y: row * ROW_HEIGHT },
        data: { miniTask, color: mainTask.color, ...callbacks },
      })
      const next = inBank[column + 1]
      if (next) {
        edges.push({
          id: `${miniTask.id}->${next.id}`,
          source: miniTask.id,
          target: next.id,
          style: { stroke: mainTask.color, strokeWidth: 2 },
        })
      }
    })
    row++
  }

  return { nodes, edges }
}

function TaskBankGraph({ mainTasks, miniTasks, onOpen, onToggleDone }: TaskBankProps) {
  const { fitView } = useReactFlow()
  const { nodes, edges } = useMemo(
    () => buildGraph(mainTasks, miniTasks, { onOpen, onToggleDone }),
    [mainTasks, miniTasks, onOpen, onToggleDone],
  )

  // Refit when nodes enter or leave the bank.
  useEffect(() => {
    const frame = requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1, duration: 200 }))
    return () => cancelAnimationFrame(frame)
  }, [nodes.length, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
    </ReactFlow>
  )
}

export function TaskBank(props: TaskBankProps) {
  const { setNodeRef, isOver } = useDroppable({ id: TASK_BANK_DROP_ID })
  const isEmpty = !props.miniTasks.some(isInTaskBank)

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card',
        isOver && 'ring-2 ring-primary',
      )}
    >
      <h2 className="border-b px-4 py-2 font-heading font-medium">Banco de tarefas</h2>
      <div className="relative min-h-0 flex-1">
        <ReactFlowProvider>
          <TaskBankGraph {...props} />
        </ReactFlowProvider>
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 grid place-content-center text-sm text-muted-foreground">
            Nenhuma tarefa no banco.
          </p>
        )}
      </div>
    </section>
  )
}
