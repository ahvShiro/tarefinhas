import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/controllers/AuthProvider'
import { usePreviewBubbleTheme } from '@/controllers/bubbleThemePreview'
import { TasksProvider } from '@/controllers/TasksProvider'
import { HomeView } from '@/views/HomeView'
import { OverviewView } from '@/views/OverviewView'
import { ROUTES } from '@/views/routes'

// Admin page of the homepage bubbles: only on the dev server. The production build leaves it out.
const AdminView = import.meta.env.DEV
  ? lazy(() => import('@/views/AdminView').then((module) => ({ default: module.AdminView })))
  : null

function HomeScreen() {
  // Inside the admin page's preview frame, the homepage shows the draft theme. Elsewhere this is null.
  const previewTheme = usePreviewBubbleTheme()
  return <HomeView bubbleTheme={previewTheme ?? undefined} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.home} element={<HomeScreen />} />
          <Route
            path={ROUTES.tasks}
            element={
              <TasksProvider>
                <OverviewView />
              </TasksProvider>
            }
          />
          {AdminView && (
            <Route
              path={ROUTES.admin}
              element={
                <Suspense fallback={null}>
                  <AdminView />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
