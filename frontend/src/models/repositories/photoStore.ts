import type { TaskPhoto } from '../taskPhoto'

// For now the photos live on this computer, saved by the dev server (`dev-server/taskPhotos.ts`). The account is
// the one in the login cookie. When the backend gets photo routes, only this file changes.

const ENDPOINT = '/__local/photos'

/** Photos work only with the dev server (`npm run dev`). The production build has no photo endpoint yet. */
export const PHOTOS_AVAILABLE = import.meta.env.DEV

export class PhotoStoreError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const MESSAGES: Record<string, string> = {
  'too-large': 'A foto passa de 20 MB.',
  'not-an-image': 'O arquivo não é uma imagem JPEG, PNG, GIF ou WebP.',
  'signed-out': 'Sua sessão acabou. Entre de novo.',
  'local-only': 'As fotos só funcionam neste computador por enquanto.',
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${ENDPOINT}${path}`, { ...init, credentials: 'same-origin' })
  } catch {
    throw new PhotoStoreError(0, 'Não foi possível falar com o servidor local das fotos.')
  }
  let data: { ok?: boolean; error?: string } & Record<string, unknown> = {}
  try {
    data = (await response.json()) as typeof data
  } catch {
    // Not JSON: the generic message below covers it.
  }
  if (!response.ok || data.ok !== true) {
    throw new PhotoStoreError(response.status, MESSAGES[data.error ?? ''] ?? 'Não foi possível concluir. Tente de novo.')
  }
  return data as T
}

export async function listPhotos(): Promise<TaskPhoto[]> {
  const { photos } = await call<{ photos: TaskPhoto[] }>('')
  return photos
}

export async function uploadPhoto(miniTaskId: string, file: File): Promise<TaskPhoto> {
  const { photo } = await call<{ photo: TaskPhoto }>(`?miniTaskId=${encodeURIComponent(miniTaskId)}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  return photo
}

export async function deletePhoto(photoId: string): Promise<void> {
  await call(`/${encodeURIComponent(photoId)}`, { method: 'DELETE' })
}

/** Address of the image itself, for `<img src>` and downloads. */
export function photoUrl(photoId: string): string {
  return `${ENDPOINT}/${encodeURIComponent(photoId)}/file`
}

/** The bytes of a photo, to put in a .zip. */
export async function fetchPhotoBytes(photoId: string): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(photoUrl(photoId), { credentials: 'same-origin' })
  } catch {
    throw new PhotoStoreError(0, 'Não foi possível falar com o servidor local das fotos.')
  }
  if (!response.ok) throw new PhotoStoreError(response.status, 'Uma das fotos não foi encontrada.')
  return new Uint8Array(await response.arrayBuffer())
}
