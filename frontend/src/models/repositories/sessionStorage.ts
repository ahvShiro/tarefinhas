const TOKEN_KEY = 'tarefinhas.token'
const PHOTO_KEY_PREFIX = 'tarefinhas.photo.'

// The token is the key to the account, so it lives only in this browser's storage and goes out only in the
// `Authorization` header to the API.

/** The saved token of the person who is in, or null. */
export function loadToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Saves the token, or clears it with null. */
export function saveToken(token: string | null): void {
  try {
    if (token === null) window.localStorage.removeItem(TOKEN_KEY)
    else window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Blocked storage: the person stays in until the page reloads.
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
