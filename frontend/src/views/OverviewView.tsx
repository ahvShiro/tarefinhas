import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import { PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { FocusArea } from '@/components/FocusArea'
import { MainTaskFormDialog } from '@/components/MainTaskFormDialog'
import { AppBrand } from '@/components/AppBrand'
import { ProfileButton } from '@/components/ProfileButton'
import { ResizeHandle } from '@/components/ResizeHandle'
import { MiniTaskCard } from '@/components/MiniTaskCard'
import { AddStepDialog, DeleteMainTaskDialog, DeleteMiniTaskDialog } from '@/components/MiniTaskActionDialogs'
import { SetTimeDialog } from '@/components/SetTimeDialog'
import { MiniTaskDetailDialog } from '@/components/MiniTaskDetailDialog'
import { OverdueDialog } from '@/components/OverdueDialog'
import { TaskBank } from '@/components/TaskBank'
import { MainTaskMenuContext, type MainTaskMenuActions } from '@/controllers/mainTaskMenuContext'
import { MiniTaskMenuContext, type MiniTaskMenuActions } from '@/controllers/miniTaskMenuContext'
import { useTasks } from '@/controllers/useTasks'
import { cn } from '@/lib/utils'
import { DEFAULT_FOCUS_DAYS, upcomingDays } from '@/models/focus'
import { hourSlotOf, isInTaskBank } from '@/models/miniTask'
import { parseDropId, TASK_BANK_DROP_ID } from './dropTargets'
import { ROUTES } from './routes'

// Limits of the width of "Em foco" when the person drags its edge: 18rem, and the bank keeps at least 360 px.
const FOCUS_MIN_WIDTH_PX = 288
const BANK_MIN_WIDTH_PX = 360
const RESIZE_HANDLE_WIDTH_PX = 12 // `w-3` in `ResizeHandle`

// A click right after a drop must not open the detail dialog.
const CLICK_AFTER_DRAG_GUARD_MS = 150

export function OverviewView() {
  const {
    loading,
    mainTasks,
    miniTasks,
    getMainTask,
    createMainTask,
    toggleDone,
    scheduleMiniTask,
    unscheduleMiniTask,
    copyMiniTask,
    addStep,
    deleteMiniTask,
    duplicateMainTask,
    deleteMainTask,
    sendMainTaskToToday,
    setMiniTaskTime,
    overdueMiniTasks,
    postponeMiniTask,
    forgetMiniTask,
  } = useTasks()
  const [formOpen, setFormOpen] = useState(false)
  const [detailMiniTaskId, setDetailMiniTaskId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [focusDays, setFocusDays] = useState(DEFAULT_FOCUS_DAYS)
  const [focusOpen, setFocusOpen] = useState(true)
  // Width in px after the person drags the edge. Null keeps the default (a quarter of the screen).
  const [focusWidth, setFocusWidth] = useState<number | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const focusRef = useRef<HTMLDivElement>(null)
  // Id of the MainTask that gets a new step.
  const [addStepFor, setAddStepFor] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteMainTaskId, setDeleteMainTaskId] = useState<string | null>(null)
  const [timeFor, setTimeFor] = useState<string | null>(null)
  const [overBank, setOverBank] = useState(false)
  const lastDragEndAt = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const openDetail = useCallback((miniTaskId: string) => {
    if (Date.now() - lastDragEndAt.current < CLICK_AFTER_DRAG_GUARD_MS) return
    setDetailMiniTaskId(miniTaskId)
  }, [])

  const menuActions = useMemo<MiniTaskMenuActions>(
    () => ({
      days: upcomingDays(focusDays),
      onCopy: (miniTaskId, date) => void copyMiniTask(miniTaskId, date),
      onAddStep: (miniTaskId) =>
        setAddStepFor(miniTasks.find((miniTask) => miniTask.id === miniTaskId)?.mainTaskId ?? null),
      onDelete: setDeleteId,
      onSetTime: setTimeFor,
    }),
    [copyMiniTask, focusDays, miniTasks],
  )

  const mainTaskMenuActions = useMemo<MainTaskMenuActions>(
    () => ({
      onAddStep: setAddStepFor,
      onDuplicate: (mainTaskId) => void duplicateMainTask(mainTaskId),
      onSendToToday: (mainTaskId) => void sendMainTaskToToday(mainTaskId),
      onDelete: setDeleteMainTaskId,
    }),
    [duplicateMainTask, sendMainTaskToToday],
  )

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
    const miniTask = miniTasks.find((candidate) => candidate.id === miniTaskId)
    // Only miniTasks are scheduled: a MainTask node only moves inside the bank.
    if (!target || !miniTask) return
    // Dropped back in the bank: it only moved inside the graph.
    if (target.kind === 'bank' && isInTaskBank(miniTask)) return
    if (target.kind === 'bank') void unscheduleMiniTask(miniTaskId)
    if (target.kind === 'day') void scheduleMiniTask(miniTaskId, target.date)
    if (target.kind === 'slot') {
      // Dropped in the slot where it already is: keep its exact time (13:23 stays 13:23).
      const sameSlot =
        miniTask.scheduledDate === target.date &&
        miniTask.scheduledTime !== undefined &&
        hourSlotOf(miniTask.scheduledTime) === target.time
      // In another slot, it takes the hour of that slot (13:23 dropped in 14:00 becomes 14:00).
      if (!sameSlot) void scheduleMiniTask(miniTaskId, target.date, target.time)
    }
  }

  const dragging = miniTasks.find((miniTask) => miniTask.id === draggingId)
  const draggingColor = dragging ? getMainTask(dragging.mainTaskId)?.color : undefined
  // A bank card held over the bank moves itself in the graph, so the copy under the pointer is not needed.
  const showOverlay = dragging !== undefined && !(isInTaskBank(dragging) && overBank)
  const detailMiniTask = miniTasks.find((miniTask) => miniTask.id === detailMiniTaskId)
  const detailMainTask = detailMiniTask ? getMainTask(detailMiniTask.mainTaskId) : undefined
  const addStepMainTask = addStepFor === null ? undefined : getMainTask(addStepFor)
  const deleteMainTaskTarget = deleteMainTaskId === null ? undefined : getMainTask(deleteMainTaskId)
  const timeMiniTask = miniTasks.find((miniTask) => miniTask.id === timeFor)
  const deleteMiniTaskTarget = miniTasks.find((miniTask) => miniTask.id === deleteId)
  const deleteIsLastStep =
    deleteMiniTaskTarget !== undefined &&
    miniTasks.filter((miniTask) => miniTask.mainTaskId === deleteMiniTaskTarget.mainTaskId).length === 1

  return (
    <MiniTaskMenuContext.Provider value={menuActions}>
      <MainTaskMenuContext.Provider value={mainTaskMenuActions}>
      <div className="flex h-dvh flex-col gap-3 p-3">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1>
              <AppBrand />
            </h1>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={focusOpen}
              aria-controls="focus-panel"
              title={focusOpen ? 'Fechar o Em foco' : 'Abrir o Em foco'}
              onClick={() => setFocusOpen((open) => !open)}
            >
              {focusOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
              Em foco
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Link to={ROUTES.pick} className={buttonVariants({ variant: 'outline' })}>
              Escolher tarefas do dia
            </Link>
            <Button onClick={() => setFormOpen(true)}>
              <PlusIcon />
              Nova tarefa
            </Button>
            <ProfileButton />
          </div>
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
            <main ref={mainRef} className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:flex lg:gap-0">
              {focusOpen && (
                <>
                  <div
                    id="focus-panel"
                    ref={focusRef}
                    style={focusWidth === null ? undefined : ({ '--focus-width': `${focusWidth}px` } as CSSProperties)}
                    className={cn(
                      'flex min-h-0 flex-col lg:flex-none',
                      focusWidth === null ? 'lg:w-1/4 lg:min-w-72' : 'lg:w-(--focus-width)',
                    )}
                  >
                    <FocusArea
                      miniTasks={miniTasks}
                      getMainTask={getMainTask}
                      onOpen={openDetail}
                      onToggleDone={handleToggleDone}
                      initialDayCount={focusDays}
                      onDayCountChange={setFocusDays}
                    />
                  </div>
                  <ResizeHandle
                    className="hidden lg:flex"
                    label="Largura do Em foco"
                    value={focusWidth ?? undefined}
                    getWidth={() => focusRef.current?.offsetWidth ?? FOCUS_MIN_WIDTH_PX}
                    getMin={() => FOCUS_MIN_WIDTH_PX}
                    getMax={() => (mainRef.current?.clientWidth ?? 0) - BANK_MIN_WIDTH_PX - RESIZE_HANDLE_WIDTH_PX}
                    onResize={setFocusWidth}
                  />
                </>
              )}
              <div className="flex min-h-0 min-w-0 flex-col lg:flex-1">
                <TaskBank
                  mainTasks={mainTasks}
                  miniTasks={miniTasks}
                  onOpen={openDetail}
                  onToggleDone={handleToggleDone}
                />
              </div>
            </main>
            <DragOverlay dropAnimation={null}>
              {showOverlay && dragging && draggingColor && (
                <MiniTaskCard miniTask={dragging} color={draggingColor} compact />
              )}
            </DragOverlay>
          </DndContext>
        )}

        <OverdueDialog
          miniTask={overdueMiniTasks[0]}
          mainTask={overdueMiniTasks[0] ? getMainTask(overdueMiniTasks[0].mainTaskId) : undefined}
          remaining={overdueMiniTasks.length}
          onPostpone={(id) => void postponeMiniTask(id)}
          onForget={(id) => void forgetMiniTask(id)}
        />
        <MainTaskFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={createMainTask} />
        <MiniTaskDetailDialog
          miniTask={detailMiniTask}
          mainTask={detailMainTask}
          siblings={miniTasks.filter((miniTask) => miniTask.mainTaskId === detailMiniTask?.mainTaskId)}
          onToggleDone={handleToggleDone}
          onSetTime={(miniTaskId) => {
            setDetailMiniTaskId(null)
            setTimeFor(miniTaskId)
          }}
          onClose={() => setDetailMiniTaskId(null)}
        />
        <SetTimeDialog
          miniTask={timeMiniTask}
          mainTask={timeMiniTask ? getMainTask(timeMiniTask.mainTaskId) : undefined}
          onSubmit={(miniTaskId, time) => void setMiniTaskTime(miniTaskId, time)}
          onClose={() => setTimeFor(null)}
        />
        <AddStepDialog
          mainTask={addStepMainTask}
          onSubmit={addStep}
          onClose={() => setAddStepFor(null)}
        />
        <DeleteMiniTaskDialog
          miniTask={deleteMiniTaskTarget}
          mainTask={deleteMiniTaskTarget ? getMainTask(deleteMiniTaskTarget.mainTaskId) : undefined}
          isLastStep={deleteIsLastStep}
          onConfirm={(miniTaskId) => void deleteMiniTask(miniTaskId)}
          onClose={() => setDeleteId(null)}
        />
        <DeleteMainTaskDialog
          mainTask={deleteMainTaskTarget}
          steps={miniTasks.filter((miniTask) => miniTask.mainTaskId === deleteMainTaskId)}
          onConfirm={(mainTaskId) => void deleteMainTask(mainTaskId)}
          onClose={() => setDeleteMainTaskId(null)}
        />
      </div>
      </MainTaskMenuContext.Provider>
    </MiniTaskMenuContext.Provider>
  )
}
