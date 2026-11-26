import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/controllers/useAuth'
import { ROUTES } from '@/views/routes'

/**
 * Lets the screens of the app open only for a person who is in. Without sign-in, it goes to the homepage and
 * remembers the screen that was asked for (`state.from`), so after sign-in the person lands there.
 * If the person just chose to sign out, nothing is remembered: the next sign-in opens the overview.
 * While the saved token is being checked with the API, it waits (a reload must not send a signed-in person away).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, restoring, justSignedOut } = useAuth()
  const location = useLocation()
  if (restoring) return <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
  if (!profile) {
    return <Navigate to={ROUTES.home} replace state={justSignedOut ? undefined : { from: location.pathname }} />
  }
  return children
}
