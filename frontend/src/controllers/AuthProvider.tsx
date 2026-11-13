import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { validateSignIn, validateSignUp, type SignInInput, type SignUpInput } from '@/models/auth'
import { AuthContext, type AuthContextValue, type SignInResult, type SignUpResult } from './authContext'

// Interface only: valid input enters the app without checking an account.
// The session lives in memory, so a page reload shows the homepage again.
// When the backend specifies login, the API call goes here, between validation and setSignedIn.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false)

  const signIn = useCallback(async (input: SignInInput): Promise<SignInResult> => {
    const validation = validateSignIn(input)
    if (!validation.ok) return validation
    setSignedIn(true)
    return { ok: true }
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    const validation = validateSignUp(input)
    if (!validation.ok) return validation
    setSignedIn(true)
    return { ok: true }
  }, [])

  const signOut = useCallback(() => setSignedIn(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({ signedIn, signIn, signUp, signOut }),
    [signedIn, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
