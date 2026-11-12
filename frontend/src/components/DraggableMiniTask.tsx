import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { MiniTask } from '@/models/miniTask'
import { MiniTaskCard } from './MiniTaskCard'

interface DraggableMiniTaskProps {
  miniTask: MiniTask
  color: string
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
  compact?: boolean
}

export function DraggableMiniTask({ miniTask, color, onOpen, onToggleDone, compact }: DraggableMiniTaskProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: miniTask.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // nodrag/nopan: keeps React Flow from panning when a drag starts on the card.
      className={cn('nodrag nopan cursor-grab touch-none outline-none', isDragging && 'opacity-30')}
      onClick={() => onOpen(miniTask.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen(miniTask.id)
      }}
    >
      <MiniTaskCard
        miniTask={miniTask}
        color={color}
        compact={compact}
        onToggleDone={() => onToggleDone(miniTask.id)}
      />
    </div>
  )
}
