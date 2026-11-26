import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

const KEY_STEP_PX = 24

interface ResizeHandleProps {
  /** Reads the width of the panel now, when a drag or a key press starts. */
  getWidth: () => number
  getMin: () => number
  getMax: () => number
  onResize: (width: number) => void
  /** Current width in px, only to tell assistive technology. Undefined while the panel has its default width. */
  value?: number
  label: string
  className?: string
}

/** A vertical bar on the right edge of a panel. Drag it, or focus it and use the left and right arrows. */
export function ResizeHandle({ getWidth, getMin, getMax, onResize, value, label, className }: ResizeHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)

  const clamp = (width: number) => Math.round(Math.min(Math.max(width, getMin()), Math.max(getMax(), getMin())))

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startWidth: getWidth() }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    onResize(clamp(drag.current.startWidth + event.clientX - drag.current.startX))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') onResize(clamp(getWidth() - KEY_STEP_PX))
    else if (event.key === 'ArrowRight') onResize(clamp(getWidth() + KEY_STEP_PX))
    else return
    event.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex w-3 shrink-0 cursor-col-resize touch-none items-stretch justify-center outline-none',
        className,
      )}
    >
      <div className="my-2 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/50 group-focus-visible:bg-primary group-active:bg-primary" />
    </div>
  )
}
