// Interface-only authentication rules. No account is checked yet: the backend
// API will replace the sign-in and sign-up check when login is specified.

export const MIN_PASSWORD_LENGTH = 8

// Basic shape check: text, one @, a domain with a dot. The real check is the
// confirmation e-mail, which comes with the backend.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

export type SignInErrors = Partial<Record<keyof SignInInput, string>>
export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>

export type SignInValidation = { ok: true; cleaned: SignInInput } | { ok: false; errors: SignInErrors }
export type SignUpValidation =
  | { ok: true; cleaned: Omit<SignUpInput, 'passwordConfirmation'> }
  | { ok: false; errors: SignUpErrors }

function emailError(email: string): string | undefined {
  if (email === '') return 'Informe seu e-mail.'
  if (!EMAIL_PATTERN.test(email)) return 'Use um e-mail no formato nome@exemplo.com.'
  return undefined
}

export function validateSignIn(input: SignInInput): SignInValidation {
  const email = input.email.trim()
  const errors: SignInErrors = {}

  const emailMessage = emailError(email)
  if (emailMessage) errors.email = emailMessage
  if (input.password === '') errors.password = 'Informe sua senha.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, cleaned: { email, password: input.password } }
}

export function validateSignUp(input: SignUpInput): SignUpValidation {
  const name = input.name.trim()
  const email = input.email.trim()
  const errors: SignUpErrors = {}

  if (name === '') errors.name = 'Informe seu nome.'
  const emailMessage = emailError(email)
  if (emailMessage) errors.email = emailMessage
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (input.passwordConfirmation === '') {
    errors.passwordConfirmation = 'Digite a senha de novo para confirmar.'
  } else if (input.passwordConfirmation !== input.password) {
    errors.passwordConfirmation = 'As senhas não são iguais. Digite a mesma senha nos 2 campos.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, cleaned: { name, email, password: input.password } }
}
