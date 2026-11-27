import { useState } from 'react'
import { usePhotos } from '@/controllers/usePhotos'
import type { MiniTask } from '@/models/miniTask'

/** State shared by the "Enviar foto" button (top of the dialog) and the photo list (in the body). */
export interface StepPhotosState {
  miniTask: MiniTask
  available: boolean
  loading: boolean
  sending: boolean
  error: string | null
  loadError: string | null
  send: (files: File[]) => Promise<void>
  remove: (photoId: string) => Promise<void>
}

/** Sending and taking out the photos that prove how a step was done. */
export function useStepPhotos(miniTask: MiniTask): StepPhotosState {
  const { available, loading, loadError, uploadPhotos, deletePhoto } = usePhotos()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(files: File[]) {
    if (files.length === 0) return
    setSending(true)
    setError(null)
    const result = await uploadPhotos(miniTask.id, files)
    setSending(false)
    if (!result.ok) setError(result.message)
  }

  async function remove(photoId: string) {
    setError(null)
    const result = await deletePhoto(photoId)
    if (!result.ok) setError(result.message)
  }

  return { miniTask, available, loading, sending, error, loadError, send, remove }
}
