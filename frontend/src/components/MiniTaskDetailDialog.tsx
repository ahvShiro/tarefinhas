import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'
import { MiniTaskCard } from './MiniTaskCard'

interface MiniTaskDetailDialogProps {
  miniTask?: MiniTask
  mainTask?: MainTask
  siblings: MiniTask[]
  onToggleDone: (miniTaskId: string) => void
  onClose: () => void
}

export function MiniTaskDetailDialog({ miniTask, mainTask, siblings, onToggleDone, onClose }: MiniTaskDetailDialogProps) {
  const open = Boolean(miniTask && mainTask)
  const remaining = miniTask
    ? siblings
        .filter((sibling) => sibling.id !== miniTask.id && !sibling.done)
        .sort((a, b) => a.position - b.position)
    : []

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {miniTask && mainTask && (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: mainTask.color }} />
            <DialogTitle>{mainTask.name}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">{mainTask.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">Passo {miniTask.position}</h3>
            <MiniTaskCard
              miniTask={miniTask}
              color={mainTask.color}
              className="w-full"
              onToggleDone={() => onToggleDone(miniTask.id)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">Restantes</h3>
            {remaining.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma miniTask restante.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {remaining.map((sibling) => (
                  <li key={sibling.id}>
                    <MiniTaskCard
                      miniTask={sibling}
                      color={mainTask.color}
                      compact
                      onToggleDone={() => onToggleDone(sibling.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
