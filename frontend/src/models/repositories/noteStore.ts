import { parseNotes, type StepNotes } from '../stepNote'
import { createAccountStore } from './accountStore'

// Step notes have no API yet: they live in this browser, apart for each account.
const EMPTY: StepNotes = {}
export const noteStore = createAccountStore<StepNotes>('tarefinhas.notes.', parseNotes, EMPTY)
