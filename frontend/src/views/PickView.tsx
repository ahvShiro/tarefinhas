import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, ListChecksIcon, PlusIcon, XIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MainTaskFormDialog } from '@/components/MainTaskFormDialog'
import { AppBrand } from '@/components/AppBrand'
import { ProfileButton } from '@/components/ProfileButton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoPromptDialog } from '@/components/PhotoPromptDialog'
import { SendPhotoButton, StepPhotoStrip } from '@/components/StepPhotos'
import { SwipeCard, type SwipeDirection } from '@/components/SwipeCard'
import { useStepPhotos } from '@/components/useStepPhotos'
import { usePrefersReducedMotion } from '@/components/usePrefersReducedMotion'
import { usePhotoPrompt } from '@/controllers/usePhotoPrompt'
import { useTasks } from '@/controllers/useTasks'
import { EFFORT_LABELS, type MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'
import { todayKey } from '@/models/overdue'
import { buildSuggestionQueue, effortSentence, isSuggestible, roundSummary } from '@/models/suggestion'
import { ROUTES } from './routes'

/**
 * The second way to plan the day, like a card deck: the system suggests one task at a time and the person swipes.
 * Right runs it (it goes to today's plan and starts). Left leaves it in the task bank, and it does not come back
 * in this round.
 */
export function PickView() {
  const { loading, loadFailed, createMainTask } = useTasks()
  const [round, setRound] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppBrand />
          <TodayPanel />
          <h1 className="font-heading text-lg font-semibold">Escolher tarefas do dia</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.tasks} className={buttonVariants({ variant: 'outline' })}>
            Visão geral
          </Link>
          <Link to={ROUTES.gallery} className={buttonVariants({ variant: 'outline' })}>
            Galeria
          </Link>
          <Button onClick={() => setFormOpen(true)}>
            <PlusIcon />
            Nova tarefa
          </Button>
          <ProfileButton />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {loadFailed
            ? 'Não foi possível carregar as tarefas. Recarregue a página para tentar de novo.'
            : 'Carregando…'}
        </p>
      ) : (
        // A new key builds a new queue: the deck reads the bank once, when it mounts.
        <Deck key={round} onRestart={() => setRound((current) => current + 1)} />
      )}

      <MainTaskFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={createMainTask} />
    </div>
  )
}

function Deck({ onRestart }: { onRestart: () => void }) {
  const { miniTasks, getMainTask, runMiniTask } = useTasks()
  const today = todayKey()
  const pickedCount = miniTasks.filter((miniTask) => miniTask.scheduledDate === today).length
  const reducedMotion = usePrefersReducedMotion()
  // The order is drawn once, when the deck mounts. Swiping changes the bank, but not this order.
  const [queue] = useState(() => buildSuggestionQueue(miniTasks, getMainTask))
  // MiniTasks that got into the bank after the order was drawn (a new task made on this page) wait at the end.
  const order = useMemo(() => {
    const known = new Set(queue)
    const extra = miniTasks.filter((miniTask) => isSuggestible(miniTask) && !known.has(miniTask.id)).map((m) => m.id)
    return [...queue, ...extra]
  }, [queue, miniTasks])
  const suggestible = (id: string) => miniTasks.some((miniTask) => miniTask.id === id && isSuggestible(miniTask))
  const [index, setIndex] = useState(0)
  const [exit, setExit] = useState<SwipeDirection | null>(null)
  // The miniTask the person decided on last. It shows faded on the left.
  const [lastId, setLastId] = useState<string | null>(null)
  // What this round chose and skipped, for the summary at the end.
  const [chosenIds, setChosenIds] = useState<string[]>([])
  const [skipped, setSkipped] = useState(0)

  // The first suggestion that is still in the bank and not done.
  const currentIndex = order.findIndex((id, position) => position >= index && suggestible(id))
  const current: MiniTask | undefined = currentIndex === -1 ? undefined : miniTasks.find((m) => m.id === order[currentIndex])
  const mainTask = current ? getMainTask(current.mainTaskId) : undefined
  const left = currentIndex === -1 ? 0 : order.slice(currentIndex).filter(suggestible).length
  const nextId = currentIndex === -1 ? undefined : order.find((id, position) => position > currentIndex && suggestible(id))
  const previous = miniTasks.find((miniTask) => miniTask.id === lastId)
  const next = miniTasks.find((miniTask) => miniTask.id === nextId)

  function finish(direction: SwipeDirection) {
    if (!current) return
    if (direction === 'right') {
      void runMiniTask(current.id)
      setChosenIds((ids) => [...ids, current.id])
    } else {
      setSkipped((count) => count + 1)
    }
    setLastId(current.id)
    setIndex(currentIndex + 1)
    setExit(null)
  }

  function decide(direction: SwipeDirection) {
    if (!current || exit) return
    if (reducedMotion) {
      finish(direction)
      return
    }
    setExit(direction)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // The arrows move the cursor in a field, and they belong to an open panel or form: do not swipe then.
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, [role="dialog"]')) return
      if (event.key === 'ArrowRight') decide('right')
      if (event.key === 'ArrowLeft') decide('left')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!current || !mainTask) {
    if (order.length === 0) {
      return (
        <section className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground" role="status">
            Não há tarefas no banco para sugerir. Crie uma tarefa na visão geral.
          </p>
          <Link to={ROUTES.tasks} className={buttonVariants()}>
            Ir para a visão geral
          </Link>
        </section>
      )
    }
    return (
      <RoundSummaryView
        summary={roundSummary(chosenIds, skipped, miniTasks, getMainTask)}
        pickedToday={pickedCount}
        onRestart={onRestart}
      />
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5">
      <p className="text-xs text-muted-foreground" role="status">
        Hoje: {pickedCount} {pickedCount === 1 ? 'escolhida' : 'escolhidas'} · {left} {left === 1 ? 'sugestão' : 'sugestões'}
      </p>

      <div className="flex w-full items-center justify-center gap-4">
        <GhostCard miniTask={previous} getMainTask={getMainTask} />
        <SwipeCard key={current.id} exit={exit} onRequestExit={decide} onExited={() => finish(exit ?? 'left')}>
          <SuggestionCard miniTask={current} mainTask={mainTask} />
        </SwipeCard>
        <GhostCard miniTask={next} getMainTask={getMainTask} />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="lg" onClick={() => decide('left')}>
          <XIcon />
          Agora não
        </Button>
        <Button size="lg" onClick={() => decide('right')}>
          <CheckIcon />
          Vou fazer
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Arraste o cartão ou use as setas do teclado.</p>
    </section>
  )
}

function SuggestionCard({ miniTask, mainTask }: { miniTask: MiniTask; mainTask: MainTask }) {
  return (
    <article
      className="flex min-h-56 flex-col gap-3 rounded-xl border-2 bg-card p-5 text-card-foreground shadow-sm"
      style={{ borderColor: mainTask.color, backgroundColor: `color-mix(in srgb, ${mainTask.color} 12%, var(--card))` }}
    >
      <p className="text-xs font-medium text-muted-foreground">{mainTask.name}</p>
      <p className="text-xl font-semibold break-words">{miniTask.text}</p>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{mainTask.description}</p>
      <p className="mt-auto text-xs text-muted-foreground">
        Esforço: {EFFORT_LABELS[mainTask.effort]}
        {mainTask.deadlineDays !== undefined && ` · Prazo: ${mainTask.deadlineDays} dia(s)`}
      </p>
    </article>
  )
}

/** The task that was just before, or comes next: small and faded, only to give a sense of the order. */
function GhostCard({ miniTask, getMainTask }: { miniTask?: MiniTask; getMainTask: (id: string) => MainTask | undefined }) {
  const mainTask = miniTask ? getMainTask(miniTask.mainTaskId) : undefined
  // The empty slot keeps the main card in the center.
  if (!miniTask || !mainTask) return <div aria-hidden="true" className="hidden w-36 shrink-0 md:block" />
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none hidden w-36 shrink-0 scale-90 rounded-xl border-2 p-3 opacity-30 select-none md:block"
      style={{ borderColor: mainTask.color, backgroundColor: `color-mix(in srgb, ${mainTask.color} 12%, var(--card))` }}
    >
      <p className="truncate text-[10px] text-muted-foreground">{mainTask.name}</p>
      <p className="line-clamp-3 text-sm font-semibold break-words">{miniTask.text}</p>
    </div>
  )
}

/**
 * Button in the upper left corner that opens a panel on the left with the miniTasks in today's plan: the ones
 * chosen here and the ones planned before.
 */
function TodayPanel() {
  const { miniTasks, getMainTask, toggleDone, unscheduleMiniTask } = useTasks()
  const photoPrompt = usePhotoPrompt()
  const [open, setOpen] = useState(false)
  const today = todayKey()
  const chosen = miniTasks
    .filter((miniTask) => miniTask.scheduledDate === today)
    .sort(
      (a, b) =>
        (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '') ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.position - b.position,
    )

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <ListChecksIcon />
        Escolhidas ({chosen.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-0 left-0 h-dvh w-80 max-w-[85vw] translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none sm:max-w-80 data-open:slide-in-from-left data-open:zoom-in-100 data-closed:slide-out-to-left data-closed:zoom-out-100"
        >
          <DialogHeader>
            <DialogTitle>Escolhidas para hoje ({chosen.length})</DialogTitle>
            <DialogDescription>
              As tarefas do plano de hoje. Envie uma foto de como fez: a foto de uma tarefa feita vai para a galeria.
            </DialogDescription>
          </DialogHeader>
          {chosen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ainda. Deslize um cartão para a direita.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {chosen.map((miniTask) => (
                <TodayItem
                  key={miniTask.id}
                  miniTask={miniTask}
                  mainTask={getMainTask(miniTask.mainTaskId)}
                  onToggleDone={() => {
                    photoPrompt.beforeToggle(miniTask)
                    void toggleDone(miniTask.id)
                  }}
                  onRemove={() => void unscheduleMiniTask(miniTask.id)}
                />
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      <PhotoPromptDialog
        miniTask={miniTasks.find((miniTask) => miniTask.id === photoPrompt.promptId)}
        onClose={photoPrompt.close}
        onTurnOff={photoPrompt.turnOff}
      />
    </>
  )
}

/** One task of today's plan: mark it done, send photos of how it was done, or take it out of today. */
function TodayItem({
  miniTask,
  mainTask,
  onToggleDone,
  onRemove,
}: {
  miniTask: MiniTask
  mainTask?: MainTask
  onToggleDone: () => void
  onRemove: () => void
}) {
  const photos = useStepPhotos(miniTask)
  return (
    <li
      className="flex flex-col gap-1.5 rounded-lg border-l-4 bg-card px-2 py-1.5 text-sm shadow-sm"
      style={{ borderLeftColor: mainTask?.color }}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          checked={miniTask.done}
          onCheckedChange={onToggleDone}
          aria-label={miniTask.done ? 'Marcar como não feita' : 'Marcar como feita'}
        />
        <span className="min-w-0 flex-1">
          <span className={miniTask.done ? 'block break-words line-through opacity-50' : 'block break-words'}>
            {miniTask.text}
          </span>
          {mainTask && <span className="block truncate text-xs text-muted-foreground">{mainTask.name}</span>}
        </span>
        <SendPhotoButton state={photos} compact />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Tirar “${miniTask.text}” de hoje`}
          title="Tirar de hoje (volta ao banco)"
        >
          <XIcon />
        </Button>
      </div>
      <div className="pl-6 empty:hidden">
        <StepPhotoStrip state={photos} />
      </div>
      {photos.error && <p className="pl-6 text-xs text-destructive">{photos.error}</p>}
    </li>
  )
}

/** End of the deck: what this round chose (by effort, and the list), what was left for later, and today's total. */
function RoundSummaryView({
  summary,
  pickedToday,
  onRestart,
}: {
  summary: ReturnType<typeof roundSummary>
  pickedToday: number
  onRestart: () => void
}) {
  const count = summary.chosen.length
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex flex-col gap-1" role="status">
        <h2 className="font-heading text-lg font-semibold">Rodada encerrada</h2>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? 'Você não escolheu nenhuma tarefa nesta rodada.'
            : `Você escolheu ${count} ${count === 1 ? 'tarefa' : 'tarefas'}: ${effortSentence(summary.byEffort)}.`}
          {summary.skipped > 0 && ` ${summary.skipped} ${summary.skipped === 1 ? 'ficou' : 'ficaram'} para depois.`}
        </p>
      </div>
      {count > 0 && (
        <ul className="flex w-full flex-col gap-1.5 text-left">
          {summary.chosen.map(({ miniTask, mainTask }) => (
            <li
              key={miniTask.id}
              className="flex flex-col rounded-lg border-l-4 bg-card px-3 py-1.5 text-sm shadow-sm"
              style={{ borderLeftColor: mainTask.color }}
            >
              <span className="break-words">{miniTask.text}</span>
              <span className="truncate text-xs text-muted-foreground">
                {mainTask.name} · {EFFORT_LABELS[mainTask.effort]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Hoje: {pickedToday} {pickedToday === 1 ? 'tarefa' : 'tarefas'} no plano.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRestart}>
          Ver de novo
        </Button>
        <Link to={ROUTES.tasks} className={buttonVariants()}>
          Ir para a visão geral
        </Link>
      </div>
    </section>
  )
}
