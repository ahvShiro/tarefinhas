import { createContext } from 'react'
import type { SignInErrors, SignInInput, SignUpErrors, SignUpInput } from '@/models/auth'

export type SignInResult = { ok: true } | { ok: false; errors: SignInErrors }
export type SignUpResult = { ok: true } | { ok: false; errors: SignUpErrors }

export interface AuthContextValue {
  signIn(input: SignInInput): Promise<SignInResult>
  signUp(input: SignUpInput): Promise<SignUpResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
