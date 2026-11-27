import { createAccountStore } from './accountStore'

/** Small choices of each person, kept in this browser until the API has preferences. */
export interface Preferences {
  /** True after "Não perguntar de novo" on the photo suggestion. */
  photoPromptOff: boolean
}

const DEFAULTS: Preferences = { photoPromptOff: false }

function parsePreferences(data: unknown): Preferences {
  if (typeof data !== 'object' || data === null) return DEFAULTS
  const { photoPromptOff } = data as Record<string, unknown>
  return { photoPromptOff: photoPromptOff === true }
}

export const preferenceStore = createAccountStore<Preferences>('tarefinhas.preferences.', parsePreferences, DEFAULTS)
