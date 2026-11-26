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
  signUpRequest,
  updateCurrentUser,
  type ApiUser,
} from '@/models/repositories/authApi'
import { loadPhoto, loadToken, savePhoto, saveToken } from '@/models/repositories/sessionStorage'
import {
  AuthContext,
  type AuthContextValue,
  type SignInResult,
  type SignUpResult,
  type UpdateNameResult,
} from './authContext'

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.'

// Accounts live in the backend (`/auth/sign-in`, `/auth/sign-up`, `/users/me`). The token that it gives is saved in
// this browser, so a reload keeps the person in. The photo is not in the API yet: it is kept in this browser.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  // With a saved token, the person may be in: wait for the API before deciding.
  const [restoring, setRestoring] = useState(() => loadToken() !== null)
  const [justSignedOut, setJustSignedOut] = useState(false)
  // Photos chosen in this session. An account that is not here yet reads its photo from the browser storage.
  const [chosenPhotos, setChosenPhotos] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    const token = loadToken()
    if (token === null) return
    let cancelled = false
    fetchCurrentUser(token)
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch((error: unknown) => {
        // A refused token (expired or invalid) is dropped. If the API did not answer, it stays for the next try.
        if (error instanceof ApiError && error.status !== 0) saveToken(null)
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

  const enter = useCallback((token: string, current: ApiUser) => {
    saveToken(token)
    setUser(current)
    setJustSignedOut(false)
  }, [])

  const signIn = useCallback(
    async (input: SignInInput): Promise<SignInResult> => {
      const validation = validateSignIn(input)
      if (!validation.ok) return validation
      try {
        const token = await signInRequest(validation.cleaned)
        enter(token, await fetchCurrentUser(token))
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
        const token = await signUpRequest(validation.cleaned)
        enter(token, await fetchCurrentUser(token))
        return { ok: true }
      } catch (error) {
        return { ok: false, errors: signUpErrors(error) }
      }
    },
    [enter],
  )

  const signOut = useCallback(() => {
    saveToken(null)
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
    const token = loadToken()
    if (token === null) return { ok: false, message: 'Sua sessão acabou. Entre de novo.' }
    try {
      setUser(await updateCurrentUser(token, cleaned))
      return { ok: true }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The token no longer works: the person is out.
        saveToken(null)
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
