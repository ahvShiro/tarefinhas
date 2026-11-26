import { createContext } from 'react'
import type { UpcomingDay } from '@/models/focus'

/** What the right-click menu of a miniTask can do. The screen that owns the dialogs provides it. */
export interface MiniTaskMenuActions {
  /** The days that "Em foco" shows now. "Copiar para" offers only these, besides the task bank. */
  days: UpcomingDay[]
  /** Copies the miniTask to a day (`YYYY-MM-DD`), or to the task bank when `date` is undefined. */
  onCopy: (miniTaskId: string, date?: string) => void
  onAddStep: (miniTaskId: string) => void
  onSetTime: (miniTaskId: string) => void
  onDelete: (miniTaskId: string) => void
}

/** Null where a miniTask has no menu. */
export const MiniTaskMenuContext = createContext<MiniTaskMenuActions | null>(null)
