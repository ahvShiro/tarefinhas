import { useContext } from 'react'
import { TasksContext, type TasksContextValue } from './tasksContext'

export function useTasks(): TasksContextValue {
  const value = useContext(TasksContext)
  if (value === null) throw new Error('useTasks must be used inside TasksProvider')
  return value
}
