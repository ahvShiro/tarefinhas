import { MAX_PHOTO_FILE_BYTES, PROFILE_PHOTO_SIZE_PX } from '@/models/profile'

/** Why a file was not accepted as a photo. The message is for the person. */
export class PhotoError extends Error {}

/**
 * Turns an image file into a small square photo (an image data URL): the largest centered square of the image,
 * scaled to `PROFILE_PHOTO_SIZE_PX`. A big camera photo becomes some tens of KB, so it fits in the browser storage.
 */
export async function photoFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoError('Escolha um arquivo de imagem.')
  if (file.size > MAX_PHOTO_FILE_BYTES) throw new PhotoError('A imagem é grande demais. Use uma de até 8 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new PhotoError('Não foi possível ler essa imagem. Tente outra.')
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = PROFILE_PHOTO_SIZE_PX
    canvas.height = PROFILE_PHOTO_SIZE_PX
    const context = canvas.getContext('2d')
    if (!context) throw new PhotoError('Não foi possível preparar a imagem.')
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      PROFILE_PHOTO_SIZE_PX,
      PROFILE_PHOTO_SIZE_PX,
    )
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}
