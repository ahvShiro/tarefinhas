import { lazy, Suspense } from 'react'
import { AuthProvider } from '@/controllers/AuthProvider'
import { usePreviewBubbleTheme } from '@/controllers/bubbleThemePreview'
import { TasksProvider } from '@/controllers/TasksProvider'
import { useAuth } from '@/controllers/useAuth'
import { HomeView } from '@/views/HomeView'
import { OverviewView } from '@/views/OverviewView'

// Admin page of the homepage bubbles: only on the dev server, at /admin. The production build leaves it out.
const AdminView = import.meta.env.DEV
  ? lazy(() => import('@/views/AdminView').then((module) => ({ default: module.AdminView })))
  : null

function isAdminPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin'
}

function Screen() {
  const { signedIn } = useAuth()
  // Inside the admin page's preview frame, the homepage shows the draft theme. Elsewhere this is null.
  const previewTheme = usePreviewBubbleTheme()
  if (!signedIn) return <HomeView bubbleTheme={previewTheme ?? undefined} />
  return (
    <TasksProvider>
      <OverviewView />
    </TasksProvider>
  )
}

export default function App() {
  if (AdminView && isAdminPath()) {
    return (
      <Suspense fallback={null}>
        <AdminView />
      </Suspense>
    )
  }
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
