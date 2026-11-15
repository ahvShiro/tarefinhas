import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { SignInResult } from '@/controllers/authContext'
import type { SignInErrors, SignInInput } from '@/models/auth'
import { AuthField, GoogleIcon, Notice, OrDivider, PasswordField } from './AuthField'
import { focusFirstInvalid, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './authForm'

const FIELD_ORDER = ['email', 'password'] as const

interface SignInFormProps {
  onSubmit: (input: SignInInput) => Promise<SignInResult>
}

export function SignInForm({ onSubmit }: SignInFormProps) {
  const [values, setValues] = useState<SignInInput>({ email: '', password: '' })
  const [errors, setErrors] = useState<SignInErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as keyof SignInInput
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitting(true)
    try {
      const result = await onSubmit(values)
      if (!result.ok) {
        setErrors(result.errors)
        focusFirstInvalid(form, FIELD_ORDER, result.errors)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
      <AuthField
        id="sign-in-email"
        name="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        placeholder="nome@exemplo.com"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <PasswordField
        id="sign-in-password"
        name="password"
        label="Senha"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        labelAction={
          <button
            type="button"
            onClick={() => setNotice('Recuperar a senha ainda não está disponível.')}
            className="rounded-md text-[13px] text-brand underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
          >
            Esqueci a senha
          </button>
        }
      />

      <Button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
        {submitting ? 'Entrando…' : 'Entrar'}
      </Button>

      <OrDivider />

      <Button
        type="button"
        variant="outline"
        className={SECONDARY_BUTTON_CLASS}
        onClick={() => setNotice('Entrar com Google ainda não está disponível. Use e-mail e senha.')}
      >
        <GoogleIcon />
        Continuar com Google
      </Button>

      <Notice message={notice} />
    </form>
  )
}
