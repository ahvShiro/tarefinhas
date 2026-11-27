import { useCallback, useSyncExternalStore } from 'react'
import { addTemplate, getTemplates, removeTemplate, subscribeTemplates } from '@/models/repositories/templateStore'
import type { TaskTemplate } from '@/models/taskTemplate'
import { useAuth } from './useAuth'

/** The task templates of the person who is in, and the actions to save and delete them. */
export function useTaskTemplates() {
  const { accountId } = useAuth()
  const templates = useSyncExternalStore(subscribeTemplates, () => getTemplates(accountId))

  const save = useCallback(
    (template: TaskTemplate) => (accountId === null ? false : addTemplate(accountId, template)),
    [accountId],
  )
  const remove = useCallback(
    (templateId: string) => (accountId === null ? false : removeTemplate(accountId, templateId)),
    [accountId],
  )

  return { templates, save, remove }
}
