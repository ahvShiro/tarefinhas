import { createContext } from 'react'
import type { SignInErrors, SignInInput, SignUpErrors, SignUpInput } from '@/models/auth'

export type SignInResult = { ok: true } | { ok: false; errors: SignInErrors }
export type SignUpResult = { ok: true } | { ok: false; errors: SignUpErrors }

export interface AuthContextValue {
  signedIn: boolean
  signIn(input: SignInInput): Promise<SignInResult>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signOut(): void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
