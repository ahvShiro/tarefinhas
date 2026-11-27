import type { MouseEvent, PointerEvent } from 'react'
import { AlarmClockIcon, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import type { DeadlineHint } from '@/models/focus'
import { hasExactMinutes, type MiniTask } from '@/models/miniTask'

interface MiniTaskCardProps {
  miniTask: MiniTask
  color: string
  onToggleDone?: () => void
  compact?: boolean
  className?: string
  /** Close or past deadline of the MainTask. Shown only while the step is not done. */
  deadline?: DeadlineHint | null
  /** How many photos prove the step. Shown when more than 0. */
  photoCount?: number
}

function stop(event: MouseEvent | PointerEvent) {
  event.stopPropagation()
}

export function MiniTaskCard({
  miniTask,
  color,
  onToggleDone,
  compact,
  className,
  deadline,
  photoCount = 0,
}: MiniTaskCardProps) {
  const showDeadline = deadline && !miniTask.done
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
      <span className={cn('min-w-0 flex-1 break-words', miniTask.done && 'line-through')}>
        {hasExactMinutes(miniTask.scheduledTime) && (
          <span className="mr-1.5 font-semibold tabular-nums">{miniTask.scheduledTime}</span>
        )}
        {miniTask.text}
        {(showDeadline || photoCount > 0) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-1 [&_svg]:size-3">
            {showDeadline && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold',
                  deadline.level === 'overdue' ? 'bg-destructive text-white' : 'bg-amber-200 text-amber-950',
                )}
              >
                <AlarmClockIcon />
                {deadline.label}
              </span>
            )}
            {photoCount > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"
                title={photoCount === 1 ? '1 foto' : `${photoCount} fotos`}
                aria-label={photoCount === 1 ? '1 foto' : `${photoCount} fotos`}
              >
                <ImageIcon />
                {photoCount}
              </span>
            )}
          </span>
        )}
      </span>
    </div>
  )
}
