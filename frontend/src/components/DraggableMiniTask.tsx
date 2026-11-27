import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { DeadlineHint } from '@/models/focus'
import type { MiniTask } from '@/models/miniTask'
import { MiniTaskCard } from './MiniTaskCard'
import { MiniTaskContextMenu } from './MiniTaskContextMenu'

interface DraggableMiniTaskProps {
  miniTask: MiniTask
  color: string
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
  compact?: boolean
  /** Fades the card while it is dragged (a copy follows the pointer). False when the card itself moves. */
  ghost?: boolean
  deadline?: DeadlineHint | null
  photoCount?: number
}

export function DraggableMiniTask({
  miniTask,
  color,
  onOpen,
  onToggleDone,
  compact,
  ghost = true,
  deadline,
  photoCount,
}: DraggableMiniTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: miniTask.id })

  return (
    <MiniTaskContextMenu miniTaskId={miniTask.id} scheduled={miniTask.scheduledDate !== undefined}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        // nodrag/nopan: keeps React Flow from panning when a drag starts on the card.
        className={cn('nodrag nopan cursor-grab touch-none outline-none', isDragging && ghost && 'opacity-30')}
        onClick={() => onOpen(miniTask.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onOpen(miniTask.id)
        }}
      >
        <MiniTaskCard
          miniTask={miniTask}
          color={color}
          compact={compact}
          deadline={deadline}
          photoCount={photoCount}
          onToggleDone={() => onToggleDone(miniTask.id)}
        />
      </div>
    </MiniTaskContextMenu>
  )
}
