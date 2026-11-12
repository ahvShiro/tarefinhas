import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface FocusSlotProps {
  dropId: string
  label: string
  children?: ReactNode
  className?: string
}

export function FocusSlot({ dropId, label, children, className }: FocusSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId })

  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      className={cn('flex min-h-10 flex-col gap-1 border-b p-1', isOver && 'bg-primary/10', className)}
    >
      {children}
    </div>
  )
}
