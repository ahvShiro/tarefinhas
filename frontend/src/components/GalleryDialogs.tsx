import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDay } from '@/models/taskPhoto'
import type { MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'
import { SendPhotoButton, StepPhotoStrip } from './StepPhotos'
import { useStepPhotos } from './useStepPhotos'

/** Deleting photos is permanent, so the person confirms first. */
export function DeletePhotosDialog({
  count,
  onConfirm,
  onClose,
}: {
  /** How many photos. 0 closes the dialog. */
  count: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open={count > 0} onOpenChange={(open) => !open && onClose()}>
      {count > 0 && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{count === 1 ? 'Apagar foto?' : `Apagar ${count} fotos?`}</DialogTitle>
            <DialogDescription>
              {count === 1 ? 'A foto será apagada' : 'As fotos serão apagadas'} deste computador e não dá para desfazer.
              Os passos continuam feitos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

/** "Faltam fotos": steps that are done but have no photo, each with a button to send one. */
export function MissingPhotosDialog({
  open,
  steps,
  onClose,
}: {
  open: boolean
  steps: { miniTask: MiniTask; mainTask: MainTask }[]
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] content-start overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Faltam fotos ({steps.length})</DialogTitle>
          <DialogDescription>
            Passos feitos que ainda não têm foto. Envie uma de como você fez e ela entra na galeria.
          </DialogDescription>
        </DialogHeader>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos os passos feitos já têm foto.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {steps.map(({ miniTask, mainTask }) => (
              <MissingStep key={miniTask.id} miniTask={miniTask} mainTask={mainTask} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MissingStep({ miniTask, mainTask }: { miniTask: MiniTask; mainTask: MainTask }) {
  const photos = useStepPhotos(miniTask)
  return (
    <li
      className="flex flex-col gap-1.5 rounded-lg border-l-4 bg-card px-3 py-2 text-sm shadow-sm"
      style={{ borderLeftColor: mainTask.color }}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block break-words font-medium">{miniTask.text}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {mainTask.name}
            {miniTask.doneAt && ` · feito em ${formatDay(miniTask.doneAt)}`}
          </span>
        </span>
        <SendPhotoButton state={photos} />
      </div>
      <StepPhotoStrip state={photos} />
      {photos.error && <p className="text-xs text-destructive">{photos.error}</p>}
    </li>
  )
}
