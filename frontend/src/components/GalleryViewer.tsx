import type { KeyboardEvent } from 'react'
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  DownloadIcon,
  FolderDownIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { MiniTask } from '@/models/miniTask'
import { photoUrl } from '@/models/repositories/photoStore'
import { downloadNameOf, formatDay, type GalleryEntry } from '@/models/taskPhoto'
import { useStepNotes } from '@/controllers/useStepNotes'

interface GalleryViewerProps {
  /** The photo open now. Undefined closes the viewer. */
  entry?: GalleryEntry
  /** The gallery photos of the same MainTask, in step order. The open photo is one of them. */
  carousel: GalleryEntry[]
  /** All the steps of the MainTask, done or not. */
  steps: MiniTask[]
  /** True while a download or delete is running. */
  busy: boolean
  onSelect: (photoId: string) => void
  /** Downloads every photo of the carousel (the same MainTask) in one .zip. */
  onDownloadTask: () => void
  /** Asks to delete this photo (the screen confirms first). */
  onDelete: (photoId: string) => void
  onClose: () => void
}

/**
 * One photo of the gallery, large: download it, see its step and MainTask, and go through the photos of the
 * other steps of the same MainTask (buttons, thumbnails or the arrow keys).
 */
export function GalleryViewer({
  entry,
  carousel,
  steps,
  busy,
  onSelect,
  onDownloadTask,
  onDelete,
  onClose,
}: GalleryViewerProps) {
  const index = entry ? carousel.findIndex((item) => item.photo.id === entry.photo.id) : -1
  const previous = index > 0 ? carousel[index - 1] : undefined
  const next = index >= 0 && index < carousel.length - 1 ? carousel[index + 1] : undefined

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' && previous) {
      event.preventDefault()
      onSelect(previous.photo.id)
    }
    if (event.key === 'ArrowRight' && next) {
      event.preventDefault()
      onSelect(next.photo.id)
    }
  }

  const orderedSteps = [...steps].sort((a, b) => a.position - b.position)
  const { notes } = useStepNotes()
  const note = entry ? notes[entry.miniTask.id] : undefined
  const stepNumber = entry ? orderedSteps.findIndex((step) => step.id === entry.miniTask.id) + 1 : 0

  return (
    <Dialog open={entry !== undefined} onOpenChange={(open) => !open && onClose()}>
      {entry && (
        <DialogContent
          onKeyDown={handleKeyDown}
          className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-5xl md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden"
        >
          {/* Which task this photo proves, first and large, in the color of the task. */}
          <header
            className="flex flex-col gap-1 border-l-[6px] px-4 py-3 pr-12 md:col-span-2 md:px-5"
            style={{
              borderLeftColor: entry.mainTask.color,
              backgroundColor: `color-mix(in srgb, ${entry.mainTask.color} 22%, var(--popover))`,
            }}
          >
            <p className="text-[11px] font-semibold tracking-wider text-foreground/60 uppercase">Tarefa</p>
            <DialogTitle className="font-heading text-xl leading-tight font-semibold md:text-2xl">
              {entry.mainTask.name}
            </DialogTitle>
            <p className="text-sm">
              <span className="font-semibold">
                Passo {stepNumber} de {orderedSteps.length}:
              </span>{' '}
              {entry.miniTask.text}
              <span className="text-foreground/60">
                {' '}
                · feito em {formatDay(entry.miniTask.doneAt ?? entry.photo.createdAt)}
              </span>
            </p>
          </header>

          <div className="flex min-w-0 flex-col gap-3 bg-muted/60 p-3 md:overflow-y-auto md:p-4">
            <div className="relative grid min-h-64 place-items-center">
              <img
                key={entry.photo.id}
                src={photoUrl(entry.photo.id)}
                alt={`Foto do passo “${entry.miniTask.text}”`}
                className="max-h-[55dvh] w-auto max-w-full rounded-lg object-contain md:max-h-[62dvh]"
              />
              <span
                className="absolute top-2 left-2 max-w-[70%] truncate rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: `color-mix(in srgb, ${entry.mainTask.color} 75%, black)` }}
              >
                {entry.mainTask.name} · Passo {stepNumber}
              </span>
              {previous && (
                <CarouselButton side="left" label="Foto anterior" onClick={() => onSelect(previous.photo.id)} />
              )}
              {next && <CarouselButton side="right" label="Próxima foto" onClick={() => onSelect(next.photo.id)} />}
            </div>
            {carousel.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-center text-xs text-muted-foreground">
                  {index + 1} de {carousel.length} fotos de “{entry.mainTask.name}”
                </p>
                <ul className="flex gap-2 overflow-x-auto pb-1">
                  {carousel.map((item) => {
                    const current = item.photo.id === entry.photo.id
                    return (
                      <li key={item.photo.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => onSelect(item.photo.id)}
                          aria-label={`Foto do passo “${item.miniTask.text}”`}
                          aria-current={current ? 'true' : undefined}
                          className={cn(
                            'block size-16 overflow-hidden rounded-md ring-offset-2 ring-offset-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            current ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100',
                          )}
                        >
                          <img src={photoUrl(item.photo.id)} alt="" className="size-full object-cover" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-4 p-4 md:overflow-y-auto">
            {entry.mainTask.description ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Sobre a tarefa</p>
                <DialogDescription className="whitespace-pre-wrap text-foreground">
                  {entry.mainTask.description}
                </DialogDescription>
              </div>
            ) : (
              <DialogDescription className="sr-only">Foto do passo e passos da tarefa</DialogDescription>
            )}

            {note && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">Nota do passo</p>
                <p className="rounded-md bg-muted/60 px-3 py-2 text-sm whitespace-pre-wrap">{note.text}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">Foto enviada em {formatDay(entry.photo.createdAt)}</p>

            <div className="flex flex-wrap gap-2">
              <a
                href={photoUrl(entry.photo.id)}
                download={downloadNameOf(entry)}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <DownloadIcon />
                Baixar foto
              </a>
              {carousel.length > 1 && (
                <Button variant="outline" size="sm" disabled={busy} onClick={onDownloadTask}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <FolderDownIcon />}
                  Baixar as {carousel.length} da tarefa (.zip)
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onDelete(entry.photo.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon />
                Apagar foto
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Passos da tarefa</p>
              <ul className="flex flex-col gap-1">
                {orderedSteps.map((step) => (
                  <li
                    key={step.id}
                    aria-current={step.id === entry.miniTask.id ? 'step' : undefined}
                    className={cn(
                      'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
                      step.id === entry.miniTask.id && 'bg-muted font-medium',
                    )}
                  >
                    {step.done ? (
                      <CheckCircle2Icon style={{ color: entry.mainTask.color }} aria-label="Feito" />
                    ) : (
                      <CircleIcon className="text-muted-foreground" aria-label="Não feito" />
                    )}
                    <span className={cn(step.done && step.id !== entry.miniTask.id && 'text-muted-foreground')}>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </DialogContent>
      )}
    </Dialog>
  )
}

function CarouselButton({ side, label, onClick }: { side: 'left' | 'right'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'absolute top-1/2 grid size-10 -translate-y-1/2 place-content-center rounded-full bg-background/90 text-foreground shadow-md outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-5',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      {side === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}
