import { MAX_TEMPLATES, parseTemplates, type TaskTemplate } from '../taskTemplate'
import { createAccountStore } from './accountStore'

// Templates have no API yet: they live in this browser, apart for each account (like the profile photo).

const EMPTY: TaskTemplate[] = []
const store = createAccountStore<TaskTemplate[]>('tarefinhas.templates.', parseTemplates, EMPTY)

export const subscribeTemplates = store.subscribe

/** Newest first. The same array while nothing changes (needed by useSyncExternalStore). */
export function getTemplates(accountId: string | null): TaskTemplate[] {
  return store.get(accountId)
}

/** Adds a template on top. Past `MAX_TEMPLATES`, the oldest goes. */
export function addTemplate(accountId: string, template: TaskTemplate): boolean {
  return store.set(accountId, [template, ...store.get(accountId)].slice(0, MAX_TEMPLATES))
}

export function removeTemplate(accountId: string, templateId: string): boolean {
  return store.set(
    accountId,
    store.get(accountId).filter((template) => template.id !== templateId),
  )
}
