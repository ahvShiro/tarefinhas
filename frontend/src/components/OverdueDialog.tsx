import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'

interface OverdueDialogProps {
  /** The first overdue miniTask. Undefined when there is none, and the dialog is closed. */
  miniTask?: MiniTask
  mainTask?: MainTask
  /** How many overdue miniTasks wait for a choice, this one included. */
  remaining: number
  onPostpone: (miniTaskId: string) => void
  onForget: (miniTaskId: string) => void
}

/**
 * A miniTask of a MainTask with a deadline was not done. The person must choose: the dialog has no close button
 * and does not close on Escape or on a click outside.
 */
export function OverdueDialog({ miniTask, mainTask, remaining, onPostpone, onForget }: OverdueDialogProps) {
  const open = Boolean(miniTask && mainTask)

  return (
    <Dialog open={open}>
      {miniTask && mainTask && (
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Tarefa não feita</DialogTitle>
            <DialogDescription>
              “{miniTask.text}”, de {mainTask.name}, estava planejada para{' '}
              {miniTask.scheduledDate?.split('-').reverse().join('/')} e não foi feita.
              {remaining > 1 && ` Faltam ${remaining - 1} depois desta.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onForget(miniTask.id)}>
              Esquecer (volta ao banco)
            </Button>
            <Button onClick={() => onPostpone(miniTask.id)}>Postergar para hoje</Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
