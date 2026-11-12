import { TasksProvider } from '@/controllers/TasksProvider'
import { OverviewView } from '@/views/OverviewView'

export default function App() {
  return (
    <TasksProvider>
      <OverviewView />
    </TasksProvider>
  )
}
