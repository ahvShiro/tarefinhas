import { createContext } from 'react'
import type { BubbleTheme } from '@/models/bubbleTheme'

export type SaveStatus =
  { state: 'idle' } | { state: 'saving' } | { state: 'saved' } | { state: 'error'; message: string }

export interface BubbleThemeEditorValue {
  /** The theme on the admin page now. The preview shows it. */
  draft: BubbleTheme
  /** True when the draft is different from the saved default. */
  dirty: boolean
  saveStatus: SaveStatus
  /** Changes the draft. `update` gets the draft and returns the new one. */
  change(update: (theme: BubbleTheme) => BubbleTheme): void
  /** Writes the draft to the project as the default theme. */
  save(): Promise<void>
  /** Puts the saved default back in the draft. */
  discard(): void
}

export const BubbleThemeEditorContext = createContext<BubbleThemeEditorValue | null>(null)
