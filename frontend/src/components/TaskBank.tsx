import { useCallback, useMemo, useRef, useState } from 'react'
import { useDndMonitor, useDroppable, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core'
import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'
import { buildBankGraph } from '@/models/bankGraph'
import type { MainTask } from '@/models/mainTask'
import { isInTaskBank, type MiniTask } from '@/models/miniTask'
import { TASK_BANK_DROP_ID } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'
import { useBankSimulation, type Point } from './useBankSimulation'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type MiniTaskNodeData = {
  miniTask: MiniTask
  color: string
  ghost: boolean
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

type MiniTaskNode = Node<MiniTaskNodeData, 'miniTask'>

// Both handles sit at the card center, so a link goes from center to center, as in the Obsidian graph.
const centerHandle = { opacity: 0, pointerEvents: 'none', top: '50%', left: '50%' } as const

function MiniTaskNodeView({ data }: NodeProps<MiniTaskNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={centerHandle} />
      {/* React Flow turns off pointer events on nodes that are not draggable or selectable: turn them back on,
          so dnd-kit gets the drag and the card gets clicks. */}
      <div className="pointer-events-auto">
        <DraggableMiniTask
          miniTask={data.miniTask}
          color={data.color}
          ghost={data.ghost}
          onOpen={data.onOpen}
          onToggleDone={data.onToggleDone}
        />
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} style={centerHandle} />
    </>
  )
}

const nodeTypes = { miniTask: MiniTaskNodeView }

const FIT_OPTIONS = { padding: 0.2, maxZoom: 1 }

interface TaskBankProps {
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

/** The card held now, and whether the pointer is still over the bank. */
interface Held {
  id: string
  overBank: boolean
}

function TaskBankGraph({ mainTasks, miniTasks, onOpen, onToggleDone }: TaskBankProps) {
  const { fitView, screenToFlowPosition } = useReactFlow()
  const reducedMotion = usePrefersReducedMotion()
  const graph = useMemo(() => buildBankGraph(mainTasks, miniTasks), [mainTasks, miniTasks])
  const shape = useMemo(
    () => ({ nodeIds: graph.nodes.map((node) => node.miniTask.id), links: graph.links }),
    [graph],
  )

  // The camera fits the graph once, when it first settles. Later the user's pan and zoom stay.
  const fitted = useRef(false)
  const onSettle = useCallback(() => {
    if (fitted.current || shape.nodeIds.length === 0) return
    fitted.current = true
    void fitView({ ...FIT_OPTIONS, duration: 300 })
  }, [fitView, shape.nodeIds.length])

  const { positions, pin, release, spawnAt } = useBankSimulation(shape, { reducedMotion, onSettle })
  const [held, setHeld] = useState<Held | null>(null)
  // Card sizes measured by React Flow. It hides a node until it has a size, and every physics tick passes new
  // node objects, so the sizes must go back into them.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({})
  const onNodesChange = useCallback((changes: NodeChange<MiniTaskNode>[]) => {
    const sizes = changes.flatMap((change) =>
      change.type === 'dimensions' && change.dimensions ? [[change.id, change.dimensions] as const] : [],
    )
    if (sizes.length > 0) setMeasured((current) => ({ ...current, ...Object.fromEntries(sizes) }))
  }, [])
  // Pointer to card center when the drag starts: the card does not jump to the pointer.
  const grabOffset = useRef<Point>({ x: 0, y: 0 })

  const pointerInFlow = useCallback(
    (event: DragStartEvent | DragMoveEvent): Point | null => {
      const start = event.activatorEvent
      if (!(start instanceof MouseEvent)) return null
      const delta = 'delta' in event ? event.delta : { x: 0, y: 0 }
      return screenToFlowPosition({ x: start.clientX + delta.x, y: start.clientY + delta.y })
    },
    [screenToFlowPosition],
  )

  useDndMonitor({
    onDragStart(event) {
      const id = String(event.active.id)
      const center = positions.get(id)
      const pointer = pointerInFlow(event)
      if (!center || !pointer) return
      grabOffset.current = { x: center.x - pointer.x, y: center.y - pointer.y }
      setHeld({ id, overBank: true })
      pin(id, center)
    },
    onDragMove(event) {
      if (!held) return
      const overBank = event.over?.id === TASK_BANK_DROP_ID
      if (overBank !== held.overBank) setHeld({ id: held.id, overBank })
      const pointer = pointerInFlow(event)
      if (overBank && pointer) {
        pin(held.id, { x: pointer.x + grabOffset.current.x, y: pointer.y + grabOffset.current.y })
      }
    },
    onDragEnd(event) {
      if (held) {
        release(held.id)
        setHeld(null)
        return
      }
      // A miniTask coming back from focus appears where it was dropped.
      const pointer = pointerInFlow(event)
      if (event.over?.id === TASK_BANK_DROP_ID && pointer) spawnAt(String(event.active.id), pointer)
    },
    onDragCancel() {
      if (held) release(held.id)
      setHeld(null)
    },
  })

  const nodes = useMemo(
    () =>
      graph.nodes.flatMap(({ miniTask, color }): MiniTaskNode[] => {
        const position = positions.get(miniTask.id)
        if (!position) return []
        // Over the bank the held card itself moves; outside it, it stays faded while the copy follows the pointer.
        const ghost = held?.id === miniTask.id ? !held.overBank : true
        return [
          {
            id: miniTask.id,
            type: 'miniTask',
            position,
            measured: measured[miniTask.id],
            data: { miniTask, color, ghost, onOpen, onToggleDone },
          },
        ]
      }),
    [graph, positions, held, measured, onOpen, onToggleDone],
  )

  const edges = useMemo(
    () =>
      graph.links.map(
        (link): Edge => ({
          id: `${link.source}->${link.target}`,
          source: link.source,
          target: link.target,
          type: 'straight',
          style: { stroke: link.color, strokeWidth: 2 },
        }),
      ),
    [graph],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      nodeOrigin={[0.5, 0.5]}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={FIT_OPTIONS}
      proOptions={{ hideAttribution: true }}
    />
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
      {/* Fixed dot background: panning moves the cards, not the dots. React Flow's own Background follows the viewport. */}
      <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle,#91919a_1px,transparent_1px)] bg-size-[20px_20px]">
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
