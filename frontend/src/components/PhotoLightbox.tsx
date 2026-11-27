import type { KeyboardEvent } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { photoUrl } from '@/models/repositories/photoStore'
import type { TaskPhoto } from '@/models/taskPhoto'

interface PhotoLightboxProps {
  /** The photos to go through (the photos of one step). */
  photos: TaskPhoto[]
  /** Index of the photo open now. Null closes it. */
  index: number | null
  /** What the photos prove (the step text). */
  title: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

/** One photo large, with arrows (and ← →) to the other photos of the same step, and a download button. */
export function PhotoLightbox({ photos, index, title, onIndexChange, onClose }: PhotoLightboxProps) {
  const photo = index === null ? undefined : photos[index]
  const hasPrevious = index !== null && index > 0
  const hasNext = index !== null && index < photos.length - 1

  function handleKeyDown(event: KeyboardEvent) {
    if (index === null) return
    if (event.key === 'ArrowLeft' && hasPrevious) onIndexChange(index - 1)
    if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
  }

  return (
    <Dialog open={photo !== undefined} onOpenChange={(open) => !open && onClose()}>
      {photo && index !== null && (
        <DialogContent onKeyDown={handleKeyDown} className="gap-3 p-3 sm:max-w-3xl">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="truncate text-sm">{title}</DialogTitle>
            {photos.length > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {index + 1} de {photos.length}
              </span>
            )}
          </div>
          <DialogDescription className="sr-only">Foto do passo em tamanho grande</DialogDescription>
          <div className="relative grid min-h-48 place-items-center rounded-lg bg-muted/60">
            <img
              key={photo.id}
              src={photoUrl(photo.id)}
              alt={`Foto do passo “${title}”`}
              className="max-h-[75dvh] w-auto max-w-full rounded-lg object-contain"
            />
            {hasPrevious && <ArrowButton side="left" onClick={() => onIndexChange(index - 1)} />}
            {hasNext && <ArrowButton side="right" onClick={() => onIndexChange(index + 1)} />}
          </div>
          <a
            href={photoUrl(photo.id)}
            download
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'self-start' })}
          >
            <DownloadIcon />
            Baixar foto
          </a>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const label = side === 'left' ? 'Foto anterior' : 'Próxima foto'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'absolute top-1/2 grid size-10 -translate-y-1/2 place-content-center rounded-full bg-background/90 shadow-md outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-5',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      {side === 'left' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  )
}
