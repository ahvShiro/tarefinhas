import { createContext } from 'react'
import type { TaskPhoto } from '@/models/taskPhoto'

export type UploadPhotosResult = { ok: true } | { ok: false; message: string }

export interface PhotosContextValue {
  /** False in the production build: photos need the dev server for now. */
  available: boolean
  loading: boolean
  /** Why the photos did not load, or null. */
  loadError: string | null
  photos: TaskPhoto[]
  /** The photos of a step, oldest first. */
  photosOf(miniTaskId: string): TaskPhoto[]
  /** Sends the images, one by one. Stops at the first one that fails and says why. */
  uploadPhotos(miniTaskId: string, files: File[]): Promise<UploadPhotosResult>
  deletePhoto(photoId: string): Promise<UploadPhotosResult>
  /** Deletes the photos one by one. Stops at the first one that fails; the ones before it stay deleted. */
  deletePhotos(photoIds: string[]): Promise<UploadPhotosResult>
  /** Downloads the photos in one .zip file, each with its own name. */
  downloadPhotos(files: PhotoDownload[], zipName: string): Promise<UploadPhotosResult>
}

export interface PhotoDownload {
  photoId: string
  /** Name inside the .zip. */
  fileName: string
  /** Date of the file inside the .zip (the day the step was done). */
  date: Date
}

export const PhotosContext = createContext<PhotosContextValue | null>(null)
