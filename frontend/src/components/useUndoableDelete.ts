import { useCallback, useEffect, useRef, useState } from 'react'

/** A deletion that waits a few seconds, so the person can undo it. */
export interface PendingDelete {
  kind: 'mainTask' | 'miniTask'
  id: string
  /** What the "Desfazer" message names. */
  label: string
}

export const UNDO_DELAY_MS = 6000

/**
 * Deleting goes to the API only after `UNDO_DELAY_MS`. Until then the item is hidden on screen and "Desfazer" brings
 * it back. A new deletion, or leaving the screen, sends the waiting one at once. Closing the browser tab during
 * the wait keeps the item (nothing was sent): the safe side.
 */
export function useUndoableDelete(commit: (pending: PendingDelete) => Promise<void>) {
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const pendingRef = useRef<PendingDelete | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const commitRef = useRef(commit)

  useEffect(() => {
    commitRef.current = commit
  }, [commit])

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current)
    const waiting = pendingRef.current
    if (!waiting) return
    pendingRef.current = null
    setPending(null)
    void commitRef.current(waiting)
  }, [])

  const request = useCallback(
    (next: PendingDelete) => {
      flush()
      pendingRef.current = next
      setPending(next)
      timerRef.current = window.setTimeout(flush, UNDO_DELAY_MS)
    },
    [flush],
  )

  const undo = useCallback(() => {
    window.clearTimeout(timerRef.current)
    pendingRef.current = null
    setPending(null)
  }, [])

  // Leaving the screen sends the waiting deletion.
  useEffect(() => flush, [flush])

  return { pending, request, undo }
}
