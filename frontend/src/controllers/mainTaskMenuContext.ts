import { createContext } from 'react'

/** What the menu of a MainTask card in the task bank can do. The screen that owns the dialogs provides it. */
export interface MainTaskMenuActions {
  onEdit: (mainTaskId: string) => void
  onAddStep: (mainTaskId: string) => void
  onDuplicate: (mainTaskId: string) => void
  onSaveTemplate: (mainTaskId: string) => void
  onSendToToday: (mainTaskId: string) => void
  onDelete: (mainTaskId: string) => void
}

/** Null where a MainTask card has no menu. */
export const MainTaskMenuContext = createContext<MainTaskMenuActions | null>(null)
