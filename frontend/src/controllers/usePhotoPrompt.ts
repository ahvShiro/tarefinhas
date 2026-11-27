import { useCallback, useState, useSyncExternalStore } from 'react'
import type { MiniTask } from '@/models/miniTask'
import { preferenceStore } from '@/models/repositories/preferenceStore'
import { useAuth } from './useAuth'
import { usePhotos } from './usePhotos'

/**
 * Suggests a photo when a step without one is checked as done. Call `beforeToggle` with the step as it was before
 * the click; the suggestion opens only when it goes from not done to done, has no photo, photos work here and the
 * person did not choose "Não perguntar de novo".
 */
export function usePhotoPrompt() {
  const { accountId } = useAuth()
  const { available, photosOf } = usePhotos()
  const preferences = useSyncExternalStore(preferenceStore.subscribe, () => preferenceStore.get(accountId))
  const [promptId, setPromptId] = useState<string | null>(null)

  const beforeToggle = useCallback(
    (miniTask: MiniTask | undefined) => {
      if (!miniTask || miniTask.done || !available || preferences.photoPromptOff) return
      if (photosOf(miniTask.id).length > 0) return
      setPromptId(miniTask.id)
    },
    [available, preferences.photoPromptOff, photosOf],
  )

  const close = useCallback(() => setPromptId(null), [])

  const turnOff = useCallback(() => {
    if (accountId !== null) preferenceStore.set(accountId, { ...preferenceStore.get(accountId), photoPromptOff: true })
    setPromptId(null)
  }, [accountId])

  return { promptId, beforeToggle, close, turnOff }
}
