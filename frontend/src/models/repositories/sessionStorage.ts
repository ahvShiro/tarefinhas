const LEGACY_TOKEN_KEY = 'tarefinhas.token'
const LEGACY_DATABASE = 'tarefinhas'
const PHOTO_KEY_PREFIX = 'tarefinhas.photo.'

/**
 * Removes what older versions kept in this browser: the token (now in an HttpOnly cookie) and the IndexedDB tasks
 * (now in the API). Leaving them would let anyone with this browser read them.
 */
export function clearLegacyStorage(): void {
  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Blocked storage: there is nothing saved either.
  }
  try {
    window.indexedDB?.deleteDatabase(LEGACY_DATABASE)
  } catch {
    // Same as above.
  }
}

// The API has no photo yet, so the photo of each person is kept in this browser, apart for each account id.

/** The chosen photo (image data URL) of an account, or undefined for the default cat. */
export function loadPhoto(userId: string): string | undefined {
  try {
    const photo = window.localStorage.getItem(PHOTO_KEY_PREFIX + userId)
    return photo !== null && photo.startsWith('data:image/') ? photo : undefined
  } catch {
    return undefined
  }
}

/** Saves the photo of an account, or removes it with undefined. Returns false when the browser refused. */
export function savePhoto(userId: string, photo: string | undefined): boolean {
  try {
    if (photo === undefined) window.localStorage.removeItem(PHOTO_KEY_PREFIX + userId)
    else window.localStorage.setItem(PHOTO_KEY_PREFIX + userId, photo)
    return true
  } catch {
    return false
  }
}
