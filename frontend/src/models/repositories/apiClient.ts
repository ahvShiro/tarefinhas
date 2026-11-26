// Address of the backend. In `frontend/.env.local`: VITE_API_URL=http://host:8080. The default is the backend that
// runs on this computer (`docker compose up`, port 8080).
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080').replace(/\/+$/, '')

/** Key of an error that belongs to no field (wrong password, expired session). The same key the backend uses. */
export const FORM_ERROR_KEY = 'form'

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

// Called when a request that needed the session got 401: the cookie expired. The AuthProvider sets it.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
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

/**
 * Calls the API. The token is in an HttpOnly cookie that the backend sets: page scripts never see it, and
 * `credentials: 'include'` makes the browser send it.
 */
export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; public?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body } = options
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
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
  // A 401 on the sign-in route is a wrong password, not an expired session.
  if (response.status === 401 && !options.public) onUnauthorized?.()
  throw new ApiError(response.status, errors)
}
