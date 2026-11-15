import { useCallback, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FocusArea } from '@/components/FocusArea'
import { MainTaskFormDialog } from '@/components/MainTaskFormDialog'
import { MiniTaskCard } from '@/components/MiniTaskCard'
import { MiniTaskDetailDialog } from '@/components/MiniTaskDetailDialog'
import { TaskBank } from '@/components/TaskBank'
import { useTasks } from '@/controllers/useTasks'
import { isInTaskBank } from '@/models/miniTask'
import { parseDropId, TASK_BANK_DROP_ID } from './dropTargets'

// A click right after a drop must not open the detail dialog.
const CLICK_AFTER_DRAG_GUARD_MS = 150

export function OverviewView() {
  const { loading, mainTasks, miniTasks, getMainTask, createMainTask, toggleDone, scheduleMiniTask, unscheduleMiniTask } =
    useTasks()
  const [formOpen, setFormOpen] = useState(false)
  const [detailMiniTaskId, setDetailMiniTaskId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overBank, setOverBank] = useState(false)
  const lastDragEndAt = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openDetail = useCallback((miniTaskId: string) => {
    if (Date.now() - lastDragEndAt.current < CLICK_AFTER_DRAG_GUARD_MS) return
    setDetailMiniTaskId(miniTaskId)
  }, [])

  const handleToggleDone = useCallback((miniTaskId: string) => void toggleDone(miniTaskId), [toggleDone])

  function handleDragStart(event: DragStartEvent) {
    const miniTaskId = String(event.active.id)
    setDraggingId(miniTaskId)
    const miniTask = miniTasks.find((candidate) => candidate.id === miniTaskId)
    setOverBank(miniTask !== undefined && isInTaskBank(miniTask))
  }

  function handleDragOver(event: DragOverEvent) {
    setOverBank(event.over?.id === TASK_BANK_DROP_ID)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    lastDragEndAt.current = Date.now()
    if (!event.over) return

    const miniTaskId = String(event.active.id)
    const target = parseDropId(String(event.over.id))
    if (!target) return
    const miniTask = miniTasks.find((candidate) => candidate.id === miniTaskId)
    // Dropped back in the bank: it only moved inside the graph.
    if (target.kind === 'bank' && miniTask && isInTaskBank(miniTask)) return
    if (target.kind === 'bank') void unscheduleMiniTask(miniTaskId)
    if (target.kind === 'day') void scheduleMiniTask(miniTaskId, target.date)
    if (target.kind === 'slot') void scheduleMiniTask(miniTaskId, target.date, target.time)
  }

  const dragging = miniTasks.find((miniTask) => miniTask.id === draggingId)
  const draggingColor = dragging ? getMainTask(dragging.mainTaskId)?.color : undefined
  // A bank card held over the bank moves itself in the graph, so the copy under the pointer is not needed.
  const showOverlay = dragging !== undefined && !(isInTaskBank(dragging) && overBank)
  const detailMiniTask = miniTasks.find((miniTask) => miniTask.id === detailMiniTaskId)
  const detailMainTask = detailMiniTask ? getMainTask(detailMiniTask.mainTaskId) : undefined

  return (
    <div className="flex h-dvh flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold">Tarefinhas</h1>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon />
          Nova tarefa
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(18rem,1fr)_3fr]">
            <FocusArea
              miniTasks={miniTasks}
              getMainTask={getMainTask}
              onOpen={openDetail}
              onToggleDone={handleToggleDone}
            />
            <TaskBank mainTasks={mainTasks} miniTasks={miniTasks} onOpen={openDetail} onToggleDone={handleToggleDone} />
          </main>
          <DragOverlay dropAnimation={null}>
            {showOverlay && dragging && draggingColor && <MiniTaskCard miniTask={dragging} color={draggingColor} compact />}
          </DragOverlay>
        </DndContext>
      )}

      <MainTaskFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={createMainTask} />
      <MiniTaskDetailDialog
        miniTask={detailMiniTask}
        mainTask={detailMainTask}
        siblings={miniTasks.filter((miniTask) => miniTask.mainTaskId === detailMiniTask?.mainTaskId)}
        onToggleDone={handleToggleDone}
        onClose={() => setDetailMiniTaskId(null)}
      />
    </div>
  )
}
