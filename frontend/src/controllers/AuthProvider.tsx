import { useCallback, useMemo, type ReactNode } from 'react'
import type { SignInInput, SignUpInput } from '@/models/auth'
import { AuthContext, type AuthContextValue, type SignInResult, type SignUpResult } from './authContext'

// No login yet: the buttons always enter the app, without checking the form or an account.
// When the backend specifies login, validate here (`validateSignIn`/`validateSignUp` in models/auth.ts)
// and then call the API.
export function AuthProvider({ children }: { children: ReactNode }) {
  const signIn = useCallback(async (input: SignInInput): Promise<SignInResult> => {
    void input
    return { ok: true }
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    void input
    return { ok: true }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ signIn, signUp }), [signIn, signUp])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
