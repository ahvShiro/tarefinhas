import { useEffect } from 'react'

/** A short message at the bottom of the screen that goes away by itself (or with a click). */
export function NoticeToast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (message === null) return
    const timer = window.setTimeout(onDone, 3000)
    return () => window.clearTimeout(timer)
  }, [message, onDone])

  if (message === null) return null
  return (
    <button
      type="button"
      role="status"
      onClick={onDone}
      className="fixed bottom-4 left-1/2 z-50 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background shadow-lg"
    >
      {message}
    </button>
  )
}
