import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePhotos } from '@/controllers/usePhotos'
import type { MiniTask } from '@/models/miniTask'
import { SendPhotoButton, StepPhotoStrip } from './StepPhotos'
import { useStepPhotos } from './useStepPhotos'

interface PhotoPromptDialogProps {
  /** The step just checked as done. Undefined closes it. */
  miniTask?: MiniTask
  onClose: () => void
  /** "Não perguntar de novo". */
  onTurnOff: () => void
}

/** After a step without photo is done: send a photo of how it was done, or skip. Never required. */
export function PhotoPromptDialog({ miniTask, onClose, onTurnOff }: PhotoPromptDialogProps) {
  return (
    <Dialog open={miniTask !== undefined} onOpenChange={(open) => !open && onClose()}>
      {miniTask && <PromptBody miniTask={miniTask} onClose={onClose} onTurnOff={onTurnOff} />}
    </Dialog>
  )
}

function PromptBody({ miniTask, onClose, onTurnOff }: Required<PhotoPromptDialogProps>) {
  const photos = useStepPhotos(miniTask)
  const { photosOf } = usePhotos()
  const sent = photosOf(miniTask.id).length > 0

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{sent ? 'Foto guardada' : 'Passo feito'}</DialogTitle>
        <DialogDescription>
          {sent
            ? 'Ela já está na galeria. Pode mandar mais, se quiser.'
            : `“${miniTask.text}”. Quer guardar uma foto de como você fez? Ela vai para a galeria.`}
        </DialogDescription>
      </DialogHeader>
      <StepPhotoStrip state={photos} />
      {photos.error && <p className="text-xs text-destructive">{photos.error}</p>}
      <DialogFooter className="items-center sm:justify-between">
        {sent ? (
          <span />
        ) : (
          <Button variant="link" size="sm" className="px-0 text-muted-foreground" onClick={onTurnOff}>
            Não perguntar de novo
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            {sent ? 'Pronto' : 'Agora não'}
          </Button>
          <SendPhotoButton state={photos} />
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
