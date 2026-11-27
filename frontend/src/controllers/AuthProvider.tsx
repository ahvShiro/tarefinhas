import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  validatePasswordChange,
  validateSignIn,
  validateSignUp,
  type PasswordChangeInput,
  type SignInErrors,
  type SignInInput,
  type SignUpErrors,
  type SignUpInput,
} from '@/models/auth'
import { ApiError, FORM_ERROR_KEY, setUnauthorizedHandler } from '@/models/repositories/apiClient'
import {
  changePasswordRequest,
  deleteAccountRequest,
  fetchCurrentUser,
  signInRequest,
  signOutRequest,
  signUpRequest,
  updateCurrentUser,
  type ApiUser,
} from '@/models/repositories/authApi'
import { clearLegacyStorage, loadPhoto, savePhoto } from '@/models/repositories/sessionStorage'
import {
  AuthContext,
  type AuthContextValue,
  type DeleteAccountResult,
  type PasswordChangeResult,
  type SignInResult,
  type SignUpResult,
  type UpdateNameResult,
} from './authContext'

const GENERIC_ERROR = 'Não foi possível concluir. Tente de novo.'

// Accounts live in the backend (`/auth/sign-in`, `/auth/sign-up`, `/users/me`). The backend keeps the token in an
// HttpOnly cookie, so page scripts never see it and a reload keeps the person in. The photo is not in the API yet: it
// is kept in this browser.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  // The cookie is out of reach of scripts: only the API knows whether someone is in. Wait for it before deciding.
  const [restoring, setRestoring] = useState(true)
  const [justSignedOut, setJustSignedOut] = useState(false)
  // Photos chosen in this session. An account that is not here yet reads its photo from the browser storage.
  const [chosenPhotos, setChosenPhotos] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    clearLegacyStorage()
    // Any request that finds the session over (401) signs the person out of the screen too.
    setUnauthorizedHandler(() => setUser(null))
    let cancelled = false
    fetchCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {
        // 401: nobody is in. No answer: the person enters again when the API is back.
      })
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
      setUnauthorizedHandler(null)
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

  const signOut = useCallback(async () => {
    try {
      // The cookie is HttpOnly: only the backend can remove it.
      await signOutRequest()
    } catch {
      // No answer: the screen signs out anyway. The cookie expires with the token (24 h).
    }
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
      // A 401 already signed the person out (setUnauthorizedHandler).
      return { ok: false, message: firstMessage(error) }
    }
  }, [])

  const changePassword = useCallback(async (input: PasswordChangeInput): Promise<PasswordChangeResult> => {
    const validation = validatePasswordChange(input)
    if (!validation.ok) return validation
    try {
      await changePasswordRequest()
      return { ok: true }
    } catch (error) {
      return { ok: false, errors: {}, message: error instanceof Error ? error.message : GENERIC_ERROR }
    }
  }, [])

  const deleteAccount = useCallback(async (): Promise<DeleteAccountResult> => {
    try {
      await deleteAccountRequest()
      setUser(null)
      setJustSignedOut(true)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : GENERIC_ERROR }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      accountId: userId ?? null,
      restoring,
      justSignedOut,
      signIn,
      signUp,
      signOut,
      setProfilePhoto,
      updateName,
      changePassword,
      deleteAccount,
    }),
    [
      profile,
      userId,
      restoring,
      justSignedOut,
      signIn,
      signUp,
      signOut,
      setProfilePhoto,
      updateName,
      changePassword,
      deleteAccount,
    ],
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
