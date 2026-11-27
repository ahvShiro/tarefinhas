import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface FocusSlotProps {
  dropId: string
  label: string
  children?: ReactNode
  className?: string
  /** Draws the "now" line this far into the slot (0 to 1). Only the current hour of today has it. */
  nowFraction?: number
}

export function FocusSlot({ dropId, label, children, className, nowFraction }: FocusSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId })

  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      className={cn('relative flex min-h-10 flex-col gap-1 border-b p-1', isOver && 'bg-primary/10', className)}
    >
      {nowFraction !== undefined && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-red-500 before:absolute before:-top-[3px] before:-left-1 before:size-2 before:rounded-full before:bg-red-500"
          style={{ top: `${nowFraction * 100}%` }}
        />
      )}
      {children}
    </div>
  )
}
