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
import { parseTime, type MiniTask } from '@/models/miniTask'

interface SetTimeDialogProps {
  /** The scheduled miniTask that gets the time. Undefined closes the dialog. */
  miniTask?: MiniTask
  mainTask?: MainTask
  /** `time` is `HH:mm`, or undefined to take the time off. */
  onSubmit: (miniTaskId: string, time: string | undefined) => void
  onClose: () => void
}

/** The exact time of a step, like 13:23. It stays in the agenda slot of its hour. */
export function SetTimeDialog({ miniTask, mainTask, onSubmit, onClose }: SetTimeDialogProps) {
  const open = Boolean(miniTask && mainTask)
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* The form mounts only while open, so the field starts with the time of the step each time. */}
      {miniTask && mainTask && (
        <SetTimeForm miniTask={miniTask} mainTask={mainTask} onSubmit={onSubmit} onClose={onClose} />
      )}
    </Dialog>
  )
}

function SetTimeForm({
  miniTask,
  mainTask,
  onSubmit,
  onClose,
}: {
  miniTask: MiniTask
  mainTask: MainTask
  onSubmit: (miniTaskId: string, time: string | undefined) => void
  onClose: () => void
}) {
  const [time, setTime] = useState(miniTask.scheduledTime ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseTime(time)
    if (parsed === null) {
      setError('Informe uma hora, como 13:23.')
      return
    }
    onSubmit(miniTask.id, parsed)
    onClose()
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Definir hora</DialogTitle>
        <DialogDescription>
          “{miniTask.text}”, de {mainTask.name}. O passo fica na faixa da hora e mostra a hora exata.
        </DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="set-time-value">Hora</Label>
          <Input
            id="set-time-value"
            type="time"
            autoFocus
            className="w-32"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="set-time-error"
          />
          {error && (
            <p id="set-time-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          {miniTask.scheduledTime !== undefined && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSubmit(miniTask.id, undefined)
                onClose()
              }}
            >
              Tirar a hora
            </Button>
          )}
          <Button type="submit">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
