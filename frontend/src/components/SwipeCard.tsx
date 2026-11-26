import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

export type SwipeDirection = 'left' | 'right'

/** How far (px) the card must be dragged for the release to count as a choice. */
const SWIPE_THRESHOLD_PX = 110
const EXIT_DISTANCE_PX = 700
const EXIT_MS = 220

interface SwipeCardProps {
  children: ReactNode
  /** Set by the parent to make the card fly out. Dragging past the threshold asks for it with `onRequestExit`. */
  exit: SwipeDirection | null
  onRequestExit: (direction: SwipeDirection) => void
  /** The card finished flying out. */
  onExited: () => void
}

/**
 * A card that follows the pointer sideways. Released past the threshold, it flies out to that side; released
 * before, it comes back. Right is "do it", left is "not now".
 */
export function SwipeCard({ children, exit, onRequestExit, onExited }: SwipeCardProps) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)

  // The animation end event does not fire when the page is hidden or the animation is cut short.
  // This timer makes sure that the card always finishes.
  useEffect(() => {
    if (!exit) return
    const timer = window.setTimeout(onExited, EXIT_MS + 120)
    return () => window.clearTimeout(timer)
  }, [exit, onExited])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (exit) return
    startX.current = event.clientX - offset
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    setOffset(event.clientX - startX.current)
  }

  function handlePointerEnd() {
    if (!dragging) return
    setDragging(false)
    if (offset >= SWIPE_THRESHOLD_PX) onRequestExit('right')
    else if (offset <= -SWIPE_THRESHOLD_PX) onRequestExit('left')
    else setOffset(0)
  }

  const x = exit === 'right' ? EXIT_DISTANCE_PX : exit === 'left' ? -EXIT_DISTANCE_PX : offset
  const strength = Math.min(Math.abs(x) / SWIPE_THRESHOLD_PX, 1)
  const leaning = x > 0 ? 'right' : x < 0 ? 'left' : null

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onTransitionEnd={(event) => {
        if (exit && event.propertyName === 'transform') onExited()
      }}
      className="relative w-full max-w-sm touch-pan-y select-none"
      style={{
        transform: `translateX(${x}px) rotate(${x / 25}deg)`,
        transition: dragging ? 'none' : `transform ${EXIT_MS}ms ease-out`,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 right-3 rounded-md border-2 border-green-600 px-2 py-0.5 text-sm font-bold text-green-700"
        style={{ opacity: leaning === 'right' ? strength : 0 }}
      >
        FAZER
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-3 left-3 rounded-md border-2 border-red-600 px-2 py-0.5 text-sm font-bold text-red-700"
        style={{ opacity: leaning === 'left' ? strength : 0 }}
      >
        AGORA NÃO
      </span>
    </div>
  )
}
