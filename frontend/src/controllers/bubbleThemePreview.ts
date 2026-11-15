import { useEffect, useState } from 'react'
import { validateBubbleTheme, type BubbleTheme } from '@/models/bubbleTheme'

// Development only. The admin page shows the homepage in a frame, and sends its draft theme to that frame.
// The 2 pages are on the same origin. Each side accepts messages only from the other side.

const ADMIN_SOURCE = 'tarefinhas-bubble-admin'
const PREVIEW_SOURCE = 'tarefinhas-bubble-preview'

function isMessage(data: unknown, source: string): data is { source: string; theme?: unknown } {
  return typeof data === 'object' && data !== null && (data as { source?: unknown }).source === source
}

/** Admin side: sends the draft theme to the homepage in the frame. */
export function sendThemeToPreview(frame: HTMLIFrameElement | null, theme: BubbleTheme) {
  frame?.contentWindow?.postMessage({ source: ADMIN_SOURCE, theme }, window.location.origin)
}

/** Admin side: calls `onReady` each time the homepage in the frame starts and asks for the theme. */
export function listenForPreviewReady(frame: () => HTMLIFrameElement | null, onReady: () => void) {
  function handleMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin || event.source !== frame()?.contentWindow) return
    if (isMessage(event.data, PREVIEW_SOURCE)) onReady()
  }
  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}

/**
 * Homepage side: the theme that the admin page sends, or null.
 * Always null in production, and when the page is not in a frame.
 */
export function usePreviewBubbleTheme(): BubbleTheme | null {
  const [theme, setTheme] = useState<BubbleTheme | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV || window.parent === window) return
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      if (!isMessage(event.data, ADMIN_SOURCE)) return
      const received = validateBubbleTheme(event.data.theme)
      if (received) setTheme(received)
    }
    window.addEventListener('message', handleMessage)
    // Tells the admin page that this page can get the theme now.
    window.parent.postMessage({ source: PREVIEW_SOURCE }, window.location.origin)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return theme
}
