/** A note on a step: how it was done, what the person learned. Shown in the step detail and in the gallery. */
export interface StepNote {
  text: string
  /** When it was last saved (ISO). */
  updatedAt: string
}

/** Notes by miniTask id. */
export type StepNotes = Record<string, StepNote>

export const MAX_NOTE_LENGTH = 1000

/** Keeps only well-formed notes from storage (it can hold anything). */
export function parseNotes(data: unknown): StepNotes {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
  const notes: StepNotes = {}
  for (const [miniTaskId, value] of Object.entries(data)) {
    if (typeof value !== 'object' || value === null) continue
    const { text, updatedAt } = value as Record<string, unknown>
    if (typeof text === 'string' && text.trim() !== '' && typeof updatedAt === 'string') {
      notes[miniTaskId] = { text: text.slice(0, MAX_NOTE_LENGTH), updatedAt }
    }
  }
  return notes
}

/** The notes with this step's note set, or removed when the text is blank. */
export function withNote(notes: StepNotes, miniTaskId: string, text: string, now: string): StepNotes {
  const cleaned = text.trim().slice(0, MAX_NOTE_LENGTH)
  const next = { ...notes }
  if (cleaned === '') delete next[miniTaskId]
  else next[miniTaskId] = { text: cleaned, updatedAt: now }
  return next
}
