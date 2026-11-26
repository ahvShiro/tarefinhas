import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  validateSignIn,
  validateSignUp,
  type SignInErrors,
  type SignInInput,
  type SignUpErrors,
  type SignUpInput,
} from '@/models/auth'
import {
  ApiError,
  FORM_ERROR_KEY,
  fetchCurrentUser,
  signInRequest,
  signOutRequest,
  signUpRequest,
  updateCurrentUser,
  type ApiUser,
} from '@/models/repositories/authApi'
import { forgetLegacyToken, loadPhoto, savePhoto } from '@/models/repositories/sessionStorage'
import {
  AuthContext,
  type AuthContextValue,
  type SignInResult,
  type SignUpResult,
  type UpdateNameResult,
} from './authContext'

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.'

// Accounts live in the backend (`/auth/sign-in`, `/auth/sign-up`, `/auth/sign-out`, `/users/me`). The token is in an
// HttpOnly cookie that the API sets, so a reload keeps the person in and page scripts never see the token.
// The photo is not in the API yet: it is kept in this browser.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  // The cookie is invisible to scripts, so at the start only the API knows whether the person is in: wait for it.
  const [restoring, setRestoring] = useState(true)
  const [justSignedOut, setJustSignedOut] = useState(false)
  // Photos chosen in this session. An account that is not here yet reads its photo from the browser storage.
  const [chosenPhotos, setChosenPhotos] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    forgetLegacyToken()
    let cancelled = false
    fetchCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {
        // No cookie, an expired token or no answer from the API: the person is not in.
      })
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const userId = user?.id
  const photo = useMemo(() => {
    if (userId === undefined) return undefined
    return userId in chosenPhotos ? chosenPhotos[userId] : loadPhoto(userId)
  }, [userId, chosenPhotos])
  const profile = useMemo(() => (user ? { name: user.name, email: user.email, photo } : null), [user, photo])

  const enter = useCallback((current: ApiUser) => {
    setUser(current)
    setJustSignedOut(false)
  }, [])

  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResult> => {
      const validation = validateSignIn(input)
      if (!validation.ok) return validation
      try {
        enter(await signInRequest(validation.cleaned))
        return { ok: true }
      } catch (error) {
        return { ok: false, errors: signInErrors(error) }
      }
    },
    [enter],
  )

  const signUp = useCallback(
    async (input: SignUpInput): Promise<SignUpResult> => {
      const validation = validateSignUp(input)
      if (!validation.ok) return validation
      try {
        enter(await signUpRequest(validation.cleaned))
        return { ok: true }
      } catch (error) {
        return { ok: false, errors: signUpErrors(error) }
      }
    },
    [enter],
  )

  const signOut = useCallback(() => {
    // The API clears the cookie. Without an answer the person still leaves this screen; the cookie expires by itself.
    signOutRequest().catch(() => {})
    setUser(null)
    setJustSignedOut(true)
  }, [])

  const setProfilePhoto = useCallback(
    (next: string | undefined) => {
      if (userId === undefined) return false
      const saved = savePhoto(userId, next)
      setChosenPhotos((current) => ({ ...current, [userId]: next }))
      return saved
    },
    [userId],
  )

  const updateName = useCallback(async (name: string): Promise<UpdateNameResult> => {
    const cleaned = name.trim()
    if (cleaned === '') return { ok: false, message: 'Informe seu nome.' }
    try {
      setUser(await updateCurrentUser(cleaned))
      return { ok: true }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The token cookie no longer works: the person is out.
        setUser(null)
      }
      return { ok: false, message: firstMessage(error) }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ profile, restoring, justSignedOut, signIn, signUp, signOut, setProfilePhoto, updateName }),
    [profile, restoring, justSignedOut, signIn, signUp, signOut, setProfilePhoto, updateName],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function firstMessage(error: unknown): string {
  return error instanceof ApiError ? (Object.values(error.errors)[0] ?? GENERIC_ERROR) : GENERIC_ERROR
}

/** Errors of the sign-in form: by field when the API says the field, and the rest (wrong password) under the password. */
function signInErrors(error: unknown): SignInErrors {
  if (!(error instanceof ApiError)) return { password: GENERIC_ERROR }
  const { email, password, [FORM_ERROR_KEY]: form } = error.errors
  const errors: SignInErrors = { email, password: password ?? form }
  return email === undefined && errors.password === undefined ? { password: firstMessage(error) } : errors
}

/** Errors of the sign-up form. What belongs to no field (the server is off) goes under the e-mail. */
function signUpErrors(error: unknown): SignUpErrors {
  if (!(error instanceof ApiError)) return { email: GENERIC_ERROR }
  const { name, email, password, passwordConfirmation, [FORM_ERROR_KEY]: form } = error.errors
  const errors: SignUpErrors = { name, email: email ?? form, password, passwordConfirmation }
  const hasAny = Object.values(errors).some((message) => message !== undefined)
  return hasAny ? errors : { email: firstMessage(error) }
}
