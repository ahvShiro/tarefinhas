import type { MouseEvent, PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import type { MiniTask } from '@/models/miniTask'

interface MiniTaskCardProps {
  miniTask: MiniTask
  color: string
  onToggleDone?: () => void
  compact?: boolean
  className?: string
}

function stop(event: MouseEvent | PointerEvent) {
  event.stopPropagation()
}

export function MiniTaskCard({ miniTask, color, onToggleDone, compact, className }: MiniTaskCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border-2 bg-card text-card-foreground shadow-sm transition-opacity',
        compact ? 'px-2 py-1 text-xs' : 'w-44 px-3 py-2 text-sm',
        miniTask.done && 'opacity-40',
        className,
      )}
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, var(--card))` }}
    >
      <Checkbox
        checked={miniTask.done}
        onCheckedChange={onToggleDone}
        onClick={stop}
        onPointerDown={stop}
        aria-label={miniTask.done ? 'Marcar como não feita' : 'Marcar como feita'}
      />
      <span className={cn('min-w-0 flex-1 break-words', miniTask.done && 'line-through')}>{miniTask.text}</span>
    </div>
  )
}
