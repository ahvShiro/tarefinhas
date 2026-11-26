import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'

interface AddStepDialogProps {
  /** The miniTask that was right-clicked. The new step goes to its MainTask. Undefined closes the dialog. */
  miniTask?: MiniTask
  mainTask?: MainTask
  onSubmit: (mainTaskId: string, text: string) => Promise<boolean>
  onClose: () => void
}

export function AddStepDialog({ miniTask, mainTask, onSubmit, onClose }: AddStepDialogProps) {
  const open = Boolean(miniTask && mainTask)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* The form mounts only while open, so the text starts empty each time. */}
      {miniTask && mainTask && <AddStepForm mainTask={mainTask} onSubmit={onSubmit} onClose={onClose} />}
    </Dialog>
  )
}

function AddStepForm({
  mainTask,
  onSubmit,
  onClose,
}: {
  mainTask: MainTask
  onSubmit: (mainTaskId: string, text: string) => Promise<boolean>
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!(await onSubmit(mainTask.id, text))) {
      setError('Escreva o passo.')
      return
    }
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Novo passo</DialogTitle>
        <DialogDescription>O passo entra no banco de tarefas, em “{mainTask.name}”.</DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-step-text">Passo</Label>
          <Input
            id="new-step-text"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="new-step-error"
          />
          {error && (
            <p id="new-step-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="submit">Adicionar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

interface DeleteMiniTaskDialogProps {
  miniTask?: MiniTask
  mainTask?: MainTask
  /** True when this is the only step of its MainTask: deleting it deletes the MainTask too. */
  isLastStep: boolean
  onConfirm: (miniTaskId: string) => void
  onClose: () => void
}

/** Deleting is permanent, so the person confirms first. */
export function DeleteMiniTaskDialog({ miniTask, mainTask, isLastStep, onConfirm, onClose }: DeleteMiniTaskDialogProps) {
  const open = Boolean(miniTask && mainTask)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {miniTask && mainTask && (
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deletar passo?</DialogTitle>
            <DialogDescription>
              “{miniTask.text}”, de {mainTask.name}, será apagado e não dá para desfazer.
              {isLastStep && ' Como é o único passo, a tarefa inteira também será apagada.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onConfirm(miniTask.id)
                onClose()
              }}
            >
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
