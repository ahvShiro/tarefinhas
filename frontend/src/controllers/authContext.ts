import { createContext } from 'react'
import type { SignInErrors, SignInInput, SignUpErrors, SignUpInput } from '@/models/auth'
import type { Profile } from '@/models/profile'

export type SignInResult = { ok: true } | { ok: false; errors: SignInErrors }
export type SignUpResult = { ok: true } | { ok: false; errors: SignUpErrors }
export type UpdateNameResult = { ok: true } | { ok: false; message: string }

export interface AuthContextValue {
  /** Who is in the app. Null before sign-in and after sign-out. */
  profile: Profile | null
  /** True while the app asks the API, at the start, whether the token cookie still works. Do not decide on `profile` yet. */
  restoring: boolean
  /** True after the person chose to sign out, until the next sign-in. Then no screen is remembered to open next. */
  justSignedOut: boolean
  /** Signs in with the API (`POST /auth/sign-in`). The errors are the ones the API sent, by field. */
  signIn(input: SignInInput): Promise<SignInResult>
  /** Creates the account with the API (`POST /auth/sign-up`). The person is signed in at once. */
  signUp(input: SignUpInput): Promise<SignUpResult>
  /** Leaves at once and asks the API to clear the token cookie (`POST /auth/sign-out`). */
  signOut(): void
  /** Sets the photo (image data URL), or goes back to the default cat with undefined. Returns false if it was not saved. */
  setProfilePhoto(photo: string | undefined): boolean
  /** Changes the name with the API (`PUT /users/me`). */
  updateName(name: string): Promise<UpdateNameResult>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
