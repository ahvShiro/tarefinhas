// Checks of the sign-in and sign-up forms, before the request goes to the API. The API checks again with the same
// rules and messages (`SignUpRequest` and `SignInRequest` in the backend): keep both in step.

export const MIN_PASSWORD_LENGTH = 8

/** Shown under the password field of the sign-up form. */
export const PASSWORD_RULE_HINT = 'Pelo menos 8 caracteres, com letra maiúscula, minúscula, número e símbolo.'

// Basic shape check: text, one @, a domain with a dot. The real check is the
// confirmation e-mail, which comes later.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// At least 1 lowercase letter, 1 uppercase letter, 1 digit and 1 symbol.
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/

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
export type SignUpValidation = { ok: true; cleaned: SignUpInput } | { ok: false; errors: SignUpErrors }

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
  if (input.password === '') {
    errors.password = 'Informe uma senha.'
  } else {
    const strength = newPasswordError(input.password)
    if (strength) errors.password = strength
  }
  if (input.passwordConfirmation === '') {
    errors.passwordConfirmation = 'Digite a senha de novo para confirmar.'
  } else if (input.passwordConfirmation !== input.password) {
    errors.passwordConfirmation = 'As senhas não são iguais. Digite a mesma senha nos 2 campos.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, cleaned: { name, email, password: input.password, passwordConfirmation: input.passwordConfirmation } }
}

/** Why a new password is too weak, or undefined when it is good (the sign-up rules). */
function newPasswordError(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (!STRONG_PASSWORD_PATTERN.test(password)) {
    return 'Use pelo menos 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial.'
  }
  return undefined
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}

export type PasswordChangeErrors = Partial<Record<keyof PasswordChangeInput, string>>

export function validatePasswordChange(
  input: PasswordChangeInput,
): { ok: true } | { ok: false; errors: PasswordChangeErrors } {
  const errors: PasswordChangeErrors = {}
  if (input.currentPassword === '') errors.currentPassword = 'Informe sua senha atual.'
  if (input.newPassword === '') {
    errors.newPassword = 'Informe a nova senha.'
  } else {
    const strength = newPasswordError(input.newPassword)
    if (strength) errors.newPassword = strength
    else if (input.newPassword === input.currentPassword) errors.newPassword = 'A nova senha precisa ser diferente da atual.'
  }
  if (input.newPasswordConfirmation === '') {
    errors.newPasswordConfirmation = 'Digite a nova senha de novo para confirmar.'
  } else if (input.newPasswordConfirmation !== input.newPassword) {
    errors.newPasswordConfirmation = 'As senhas não são iguais. Digite a mesma senha nos 2 campos.'
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true }
}
