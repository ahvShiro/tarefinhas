import type { SignInInput, SignUpInput } from '../auth'
import { request } from './apiClient'

/** What the API says about the person. `GET /users/me`. */
export interface ApiUser {
  id: string
  name: string
  email: string
}

/** `POST /auth/sign-in`. The backend sets the token cookie and answers with the person. */
export function signInRequest(input: SignInInput): Promise<ApiUser> {
  return request<ApiUser>('/auth/sign-in', { method: 'POST', body: input, public: true })
}

/** `POST /auth/sign-up`. The person is signed in at once: the backend sets the token cookie. */
export function signUpRequest(input: SignUpInput): Promise<ApiUser> {
  return request<ApiUser>('/auth/sign-up', { method: 'POST', body: input, public: true })
}

/** `POST /auth/sign-out`. The backend expires the token cookie. */
export function signOutRequest(): Promise<void> {
  return request<void>('/auth/sign-out', { method: 'POST', public: true })
}

/** `GET /users/me`. 401 when nobody is signed in in this browser. */
export function fetchCurrentUser(): Promise<ApiUser> {
  return request<ApiUser>('/users/me', { public: true })
}

/** `PUT /users/me`. Only the name can change. */
export function updateCurrentUser(name: string): Promise<ApiUser> {
  return request<ApiUser>('/users/me', { method: 'PUT', body: { name } })
}

/** The backend cannot do this yet (no route). The screen says so instead of pretending. */
export class AccountActionNotSupportedError extends Error {
  constructor() {
    super('Ainda não disponível: o servidor não tem essa função.')
  }
}

// No route yet. When the backend adds them (for example PUT /users/me/password with the current and the new
// password, and DELETE /users/me), call them here; the screens stay the same.
export async function changePasswordRequest(): Promise<void> {
  throw new AccountActionNotSupportedError()
}

export async function deleteAccountRequest(): Promise<void> {
  throw new AccountActionNotSupportedError()
}
