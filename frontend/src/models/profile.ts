/** The person who is in the app, as the screens see them. It has no password. */
export interface Profile {
  name: string
  email: string
  /** The chosen photo, as an image data URL. Undefined shows the default cat. */
  photo?: string
}

/** The photo that every account has until the person chooses another. A file in `public/`. */
export const DEFAULT_PHOTO_URL = '/default-cat.svg'

/** The chosen photo is cut to a square of this side (px) before it is saved. */
export const PROFILE_PHOTO_SIZE_PX = 256

/** A file bigger than this is refused before it is read. */
export const MAX_PHOTO_FILE_BYTES = 8 * 1024 * 1024
