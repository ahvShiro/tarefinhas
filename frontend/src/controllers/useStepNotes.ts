import { useCallback, useSyncExternalStore } from 'react'
import { noteStore } from '@/models/repositories/noteStore'
import { withNote } from '@/models/stepNote'
import { useAuth } from './useAuth'

/** Step notes of the person who is in: read one, save one (blank text removes it). */
export function useStepNotes() {
  const { accountId } = useAuth()
  const notes = useSyncExternalStore(noteStore.subscribe, () => noteStore.get(accountId))

  const save = useCallback(
    (miniTaskId: string, text: string) =>
      accountId === null
        ? false
        : noteStore.set(accountId, withNote(noteStore.get(accountId), miniTaskId, text, new Date().toISOString())),
    [accountId],
  )

  return { notes, save }
}
