import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  PHOTOS_AVAILABLE,
  PhotoStoreError,
  deletePhoto as removePhoto,
  fetchPhotoBytes,
  listPhotos,
  uploadPhoto,
} from '@/models/repositories/photoStore'
import { MAX_PHOTO_BYTES, type TaskPhoto } from '@/models/taskPhoto'
import { downloadBlob } from '@/lib/download'
import { createZip } from '@/lib/zip'
import { PhotosContext, type PhotoDownload, type PhotosContextValue, type UploadPhotosResult } from './photosContext'

function messageOf(error: unknown): string {
  return error instanceof PhotoStoreError ? error.message : 'Não foi possível concluir. Tente de novo.'
}

/** Photos that prove how each step was done. Loads them once and keeps the list as photos come and go. */
export function PhotosProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<TaskPhoto[]>([])
  const [loading, setLoading] = useState(PHOTOS_AVAILABLE)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!PHOTOS_AVAILABLE) return
    let cancelled = false
    listPhotos()
      .then((loaded) => {
        if (!cancelled) setPhotos(loaded)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(messageOf(error))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const photosOf = useCallback(
    (miniTaskId: string) =>
      photos
        .filter((photo) => photo.miniTaskId === miniTaskId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [photos],
  )

  const uploadPhotos = useCallback(async (miniTaskId: string, files: File[]): Promise<UploadPhotosResult> => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) return { ok: false, message: `“${file.name}” não é uma imagem.` }
      if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: `“${file.name}” passa de 20 MB.` }
      try {
        const saved = await uploadPhoto(miniTaskId, file)
        setPhotos((list) => [...list, saved])
      } catch (error) {
        return { ok: false, message: messageOf(error) }
      }
    }
    return { ok: true }
  }, [])

  const deletePhoto = useCallback(async (photoId: string): Promise<UploadPhotosResult> => {
    try {
      await removePhoto(photoId)
      setPhotos((list) => list.filter((photo) => photo.id !== photoId))
      return { ok: true }
    } catch (error) {
      return { ok: false, message: messageOf(error) }
    }
  }, [])

  const deletePhotos = useCallback(async (photoIds: string[]): Promise<UploadPhotosResult> => {
    for (const photoId of photoIds) {
      try {
        await removePhoto(photoId)
        setPhotos((list) => list.filter((photo) => photo.id !== photoId))
      } catch (error) {
        return { ok: false, message: messageOf(error) }
      }
    }
    return { ok: true }
  }, [])

  const downloadPhotos = useCallback(async (files: PhotoDownload[], zipName: string): Promise<UploadPhotosResult> => {
    try {
      const contents = await Promise.all(
        files.map(async (file) => ({ name: file.fileName, date: file.date, data: await fetchPhotoBytes(file.photoId) })),
      )
      downloadBlob(createZip(contents), zipName)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: messageOf(error) }
    }
  }, [])

  const value = useMemo<PhotosContextValue>(
    () => ({
      available: PHOTOS_AVAILABLE,
      loading,
      loadError,
      photos,
      photosOf,
      uploadPhotos,
      deletePhoto,
      deletePhotos,
      downloadPhotos,
    }),
    [loading, loadError, photos, photosOf, uploadPhotos, deletePhoto, deletePhotos, downloadPhotos],
  )

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>
}
