import type { SignInInput, SignUpInput } from '../auth'

// Address of the backend. In `frontend/.env.local`: VITE_API_URL=http://host:8080. The default is the backend that
// runs on this computer (`docker compose up`, port 8080).
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080').replace(/\/+$/, '')

/** Key of an error that belongs to no field (wrong password, expired session). The same key the backend uses. */
export const FORM_ERROR_KEY = 'form'

/** What the API says about the person. `GET /users/me`. */
export interface ApiUser {
  id: string
  name: string
  email: string
}

/** A refused request. `errors` is `{ field: message }`, as the backend sends it (`{ "errors": { ... } }`). */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string>

  constructor(status: number, errors: Record<string, string>) {
    super(Object.values(errors)[0] ?? 'Erro na API.')
    this.status = status
    this.errors = errors
  }
}

function readErrors(data: unknown): Record<string, string> {
  if (typeof data !== 'object' || data === null) return {}
  const { errors } = data as { errors?: unknown }
  if (typeof errors !== 'object' || errors === null) return {}
  const result: Record<string, string> = {}
  for (const [field, message] of Object.entries(errors)) {
    if (typeof message === 'string') result[field] = message
  }
  return result
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const { method = 'GET', body, token } = options
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // No answer at all: the backend is off, or there is no network.
    throw new ApiError(0, { [FORM_ERROR_KEY]: 'Não foi possível falar com o servidor. Tente de novo em instantes.' })
  }

  if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T

  let errors: Record<string, string> = {}
  try {
    errors = readErrors(await response.json())
  } catch {
    // The body is not JSON: the generic message below covers it.
  }
  if (Object.keys(errors).length === 0) errors = { [FORM_ERROR_KEY]: 'Algo deu errado no servidor. Tente de novo.' }
  throw new ApiError(response.status, errors)
}

/** `POST /auth/sign-in`. Returns the token. */
export async function signInRequest(input: SignInInput): Promise<string> {
  const { token } = await request<{ token: string }>('/auth/sign-in', { method: 'POST', body: input })
  return token
}

/** `POST /auth/sign-up`. The person is signed in: returns the token. */
export async function signUpRequest(input: SignUpInput): Promise<string> {
  const { token } = await request<{ token: string }>('/auth/sign-up', { method: 'POST', body: input })
  return token
}

/** `GET /users/me`. */
export function fetchCurrentUser(token: string): Promise<ApiUser> {
  return request<ApiUser>('/users/me', { token })
}

/** `PUT /users/me`. Only the name can change. */
export function updateCurrentUser(token: string, name: string): Promise<ApiUser> {
  return request<ApiUser>('/users/me', { method: 'PUT', body: { name }, token })
}
