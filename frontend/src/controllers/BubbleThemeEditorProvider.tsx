import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { validateBubbleTheme, type BubbleTheme } from '@/models/bubbleTheme'
import { DEFAULT_BUBBLE_THEME } from '@/models/defaultBubbleTheme'
import { BubbleThemeEditorContext, type BubbleThemeEditorValue, type SaveStatus } from './bubbleThemeEditorContext'

// Development only: the dev server has the endpoint (dev-server/bubbleThemeAdmin.ts).
const SAVE_ENDPOINT = '/__admin/bubble-theme'

const SAVE_ERRORS: Record<string, string> = {
  'local-only': 'Só é possível salvar pelo endereço localhost, neste computador.',
  'invalid-theme': 'O servidor não aceitou os dados das bolhas.',
  'write-failed': 'O servidor não conseguiu gravar o arquivo.',
}

/** State of the admin page: the draft theme, the saved default, and the save action. */
export function BubbleThemeEditorProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<BubbleTheme>(DEFAULT_BUBBLE_THEME)
  const [draft, setDraft] = useState<BubbleTheme>(DEFAULT_BUBBLE_THEME)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ state: 'idle' })

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const change = useCallback((update: (theme: BubbleTheme) => BubbleTheme) => {
    setDraft(update)
    setSaveStatus({ state: 'idle' })
  }, [])

  const discard = useCallback(() => {
    setDraft(saved)
    setSaveStatus({ state: 'idle' })
  }, [saved])

  const save = useCallback(async () => {
    setSaveStatus({ state: 'saving' })
    try {
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result: unknown = await response.json().catch(() => null)
      const body = typeof result === 'object' && result !== null ? (result as { theme?: unknown; error?: unknown }) : {}
      const theme = response.ok ? validateBubbleTheme(body.theme) : null
      if (theme === null) {
        const message = SAVE_ERRORS[String(body.error)] ?? 'O servidor de desenvolvimento não respondeu como esperado.'
        setSaveStatus({ state: 'error', message })
        return
      }
      // The server returns the theme as it wrote it (numbers in range, texts trimmed).
      setSaved(theme)
      setDraft(theme)
      setSaveStatus({ state: 'saved' })
    } catch {
      setSaveStatus({ state: 'error', message: 'Sem resposta do servidor de desenvolvimento. Ele está rodando?' })
    }
  }, [draft])

  // Warns before the page closes with changes that are not saved.
  useEffect(() => {
    if (!dirty) return
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  const value = useMemo<BubbleThemeEditorValue>(
    () => ({ draft, dirty, saveStatus, change, save, discard }),
    [draft, dirty, saveStatus, change, save, discard],
  )

  return <BubbleThemeEditorContext.Provider value={value}>{children}</BubbleThemeEditorContext.Provider>
}
