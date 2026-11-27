import { useContext } from 'react'
import { PhotosContext, type PhotosContextValue } from './photosContext'

export function usePhotos(): PhotosContextValue {
  const value = useContext(PhotosContext)
  if (value === null) throw new Error('usePhotos must be used inside PhotosProvider')
  return value
}
