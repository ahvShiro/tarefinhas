import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileDownIcon, FocusIcon, MinusIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useDndMonitor, useDraggable, useDroppable, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core'
import {
  Handle,
  Panel,
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { matchBank } from '@/models/bankSearch'
import { downloadBlob, textFile } from '@/lib/download'
import { bankAsText, bankFileName } from '@/models/exportTasks'
import { buildBankGraph, type BankGraphNode } from '@/models/bankGraph'
import type { MainTask } from '@/models/mainTask'
import { isInTaskBank, type MiniTask } from '@/models/miniTask'
import { TASK_BANK_DROP_ID } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'
import { MainTaskMenu } from './MainTaskMenu'
import { useBankSimulation, type Point } from './useBankSimulation'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type MiniTaskNodeData = {
  miniTask: MiniTask
  color: string
  ghost: boolean
  /** Faded because it does not match the search. */
  dimmed: boolean
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

type MiniTaskNode = Node<MiniTaskNodeData, 'miniTask'>

type MainTaskNodeData = {
  mainTask: MainTask
  color: string
  /** Some step of this MainTask is in the bank and not done. */
  hasStepsToSend: boolean
  dimmed: boolean
}

type MainTaskNode = Node<MainTaskNodeData, 'mainTask'>

type BankNode = MiniTaskNode | MainTaskNode

// Collision radius: half the card width plus a margin, so cards never overlap.
const MINI_TASK_RADIUS = 100 // `w-44` card: 176 px
const MAIN_TASK_RADIUS = 135 // `w-60` card: 240 px

function radiusOf(node: BankGraphNode) {
  return node.kind === 'mainTask' ? MAIN_TASK_RADIUS : MINI_TASK_RADIUS
}

// Both handles sit at the card center, so a link goes from center to center, as in the Obsidian graph.
const centerHandle = { opacity: 0, pointerEvents: 'none', top: '50%', left: '50%' } as const

function MiniTaskNodeView({ data }: NodeProps<MiniTaskNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={centerHandle} />
      {/* React Flow turns off pointer events on nodes that are not draggable or selectable: turn them back on,
          so dnd-kit gets the drag and the card gets clicks. */}
      <div className={cn('pointer-events-auto transition-opacity duration-200', data.dimmed && 'opacity-20')}>
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

/** The MainTask in the middle of its miniTasks. It can be pulled around the bank, but not scheduled. */
function MainTaskNodeView({ id, data }: NodeProps<MainTaskNode>) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id })

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={centerHandle} />
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Tarefa: ${data.mainTask.name}`}
        className={cn(
          'nodrag nopan pointer-events-auto relative w-60 cursor-grab touch-none rounded-xl border-2 px-10 py-3 text-center font-heading text-base font-semibold break-words shadow-md outline-none transition-opacity duration-200',
          data.dimmed && 'opacity-20',
        )}
        style={{ borderColor: data.color, backgroundColor: `color-mix(in srgb, ${data.color} 30%, var(--card))` }}
      >
        {data.mainTask.name}
        <div className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-default">
          <MainTaskMenu
            mainTaskId={data.mainTask.id}
            mainTaskName={data.mainTask.name}
            hasStepsToSend={data.hasStepsToSend}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} style={centerHandle} />
    </>
  )
}

const nodeTypes = { miniTask: MiniTaskNodeView, mainTask: MainTaskNodeView }

const FIT_OPTIONS = { padding: 0.2, maxZoom: 1 }

interface TaskBankProps {
  mainTasks: MainTask[]
  miniTasks: MiniTask[]
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

interface TaskBankGraphProps extends TaskBankProps {
  /** Node ids that match the search; the others fade. Null: no search. */
  highlight: Set<string> | null
  /** Goes up each time the person presses Enter in the search: the camera frames the matches. */
  fitRequest: number
}

/** The card held now, and whether the pointer is still over the bank. */
interface Held {
  id: string
  overBank: boolean
}

function TaskBankGraph({ mainTasks, miniTasks, onOpen, onToggleDone, highlight, fitRequest }: TaskBankGraphProps) {
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow()
  const reducedMotion = usePrefersReducedMotion()
  const graph = useMemo(() => buildBankGraph(mainTasks, miniTasks), [mainTasks, miniTasks])
  const shape = useMemo(
    () => ({ nodes: graph.nodes.map((node) => ({ id: node.id, radius: radiusOf(node) })), links: graph.links }),
    [graph],
  )

  // The camera fits the graph once, when it first settles. Later the user's pan and zoom stay.
  const fitted = useRef(false)
  const onSettle = useCallback(() => {
    if (fitted.current || shape.nodes.length === 0) return
    fitted.current = true
    void fitView({ ...FIT_OPTIONS, duration: 300 })
  }, [fitView, shape.nodes.length])

  const { positions, pin, release, spawnAt } = useBankSimulation(shape, { reducedMotion, onSettle })
  const [held, setHeld] = useState<Held | null>(null)
  // Card sizes measured by React Flow. It hides a node until it has a size, and every physics tick passes new
  // node objects, so the sizes must go back into them.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({})
  const onNodesChange = useCallback((changes: NodeChange<BankNode>[]) => {
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
      graph.nodes.flatMap((node): BankNode[] => {
        const position = positions.get(node.id)
        if (!position) return []
        if (node.kind === 'mainTask') {
          return [
            {
              id: node.id,
              type: 'mainTask',
              position,
              measured: measured[node.id],
              data: {
                mainTask: node.mainTask,
                color: node.color,
                hasStepsToSend: miniTasks.some(
                  (miniTask) => miniTask.mainTaskId === node.mainTask.id && isInTaskBank(miniTask) && !miniTask.done,
                ),
                dimmed: highlight !== null && !highlight.has(node.id),
              },
            },
          ]
        }
        // Over the bank the held card itself moves; outside it, it stays faded while the copy follows the pointer.
        const ghost = held?.id === node.id ? !held.overBank : true
        return [
          {
            id: node.id,
            type: 'miniTask',
            position,
            measured: measured[node.id],
            data: {
              miniTask: node.miniTask,
              color: node.color,
              ghost,
              dimmed: highlight !== null && !highlight.has(node.id),
              onOpen,
              onToggleDone,
            },
          },
        ]
      }),
    [graph, positions, held, measured, miniTasks, highlight, onOpen, onToggleDone],
  )

  const edges = useMemo(
    () =>
      graph.links.map(
        (link): Edge => ({
          id: `${link.source}->${link.target}`,
          source: link.source,
          target: link.target,
          type: 'straight',
          style: {
            stroke: link.color,
            strokeWidth: 2,
            opacity: highlight !== null && !(highlight.has(link.source) && highlight.has(link.target)) ? 0.15 : 1,
          },
        }),
      ),
    [graph, highlight],
  )

  // Enter in the search frames the matching cards.
  useEffect(() => {
    if (fitRequest === 0 || !highlight || highlight.size === 0) return
    void fitView({ nodes: [...highlight].map((id) => ({ id })), padding: 0.3, maxZoom: 1.2, duration: 400 })
    // Only when the person asks (Enter), not on every search change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest])

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
    >
      <Panel position="bottom-right" className="flex flex-col gap-1 rounded-lg border bg-card p-1 shadow-sm">
        <Button variant="ghost" size="icon-sm" onClick={() => void zoomIn({ duration: 200 })} aria-label="Aproximar" title="Aproximar">
          <PlusIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => void zoomOut({ duration: 200 })} aria-label="Afastar" title="Afastar">
          <MinusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void fitView({ ...FIT_OPTIONS, duration: 300 })}
          aria-label="Centralizar: mostrar todas as tarefas"
          title="Centralizar"
        >
          <FocusIcon />
        </Button>
      </Panel>
    </ReactFlow>
  )
}

export function TaskBank(props: TaskBankProps) {
  const { setNodeRef, isOver } = useDroppable({ id: TASK_BANK_DROP_ID })
  const [query, setQuery] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const [fitRequest, setFitRequest] = useState(0)

  const miniTasks = useMemo(
    () => (hideDone ? props.miniTasks.filter((miniTask) => !miniTask.done) : props.miniTasks),
    [hideDone, props.miniTasks],
  )
  const highlight = useMemo(() => matchBank(query, props.mainTasks, miniTasks), [query, props.mainTasks, miniTasks])
  const isEmpty = !miniTasks.some(isInTaskBank)
  const nothingFound = highlight !== null && highlight.size === 0

  function exportBank() {
    downloadBlob(textFile(bankAsText(props.mainTasks, props.miniTasks)), bankFileName())
  }

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card',
        isOver && 'ring-2 ring-primary',
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2">
        <h2 className="font-heading font-medium">Banco de tarefas</h2>
        <label className="relative min-w-40 flex-1 sm:max-w-64">
          <span className="sr-only">Buscar no banco</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setFitRequest((count) => count + 1)
            }}
            placeholder="Buscar passo ou tarefa"
            title="Enter leva a câmera até o que foi achado"
            className="h-8 pl-8"
          />
        </label>
        {nothingFound && <span className="text-xs text-muted-foreground">Nada encontrado.</span>}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={hideDone} onCheckedChange={(checked) => setHideDone(checked === true)} />
            Esconder feitos
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={exportBank}
            title="Baixa as tarefas do banco num arquivo de texto (.txt)"
          >
            <FileDownIcon />
            Exportar
          </Button>
        </div>
      </header>
      {/* Fixed dot background: panning moves the cards, not the dots. React Flow's own Background follows the viewport. */}
      <div className="relative min-h-0 flex-1 bg-[radial-gradient(circle,#91919a_1px,transparent_1px)] bg-size-[20px_20px]">
        <ReactFlowProvider>
          <TaskBankGraph {...props} miniTasks={miniTasks} highlight={highlight} fitRequest={fitRequest} />
        </ReactFlowProvider>
        {isEmpty && (
          <p className="pointer-events-none absolute inset-0 grid place-content-center text-sm text-muted-foreground">
            {hideDone && props.miniTasks.some(isInTaskBank) ? 'Só há passos feitos no banco.' : 'Nenhuma tarefa no banco.'}
          </p>
        )}
      </div>
    </section>
  )
}
