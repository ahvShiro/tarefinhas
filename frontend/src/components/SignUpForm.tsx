import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { SignUpResult } from '@/controllers/authContext'
import { PASSWORD_RULE_HINT, type SignUpErrors, type SignUpInput } from '@/models/auth'
import { AuthField, GoogleIcon, Notice, OrDivider, PasswordField } from './AuthField'
import { focusFirstInvalid, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from './authForm'

const FIELD_ORDER = ['name', 'email', 'password', 'passwordConfirmation'] as const

interface SignUpFormProps {
  onSubmit: (input: SignUpInput) => Promise<SignUpResult>
}

export function SignUpForm({ onSubmit }: SignUpFormProps) {
  const [values, setValues] = useState<SignUpInput>({ name: '', email: '', password: '', passwordConfirmation: '' })
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as keyof SignUpInput
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
        id="sign-up-name"
        name="name"
        label="Nome"
        autoComplete="name"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
      />
      <AuthField
        id="sign-up-email"
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
        id="sign-up-password"
        name="password"
        label="Senha"
        autoComplete="new-password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
        hint={PASSWORD_RULE_HINT}
      />
      <PasswordField
        id="sign-up-password-confirmation"
        name="passwordConfirmation"
        label="Confirmar senha"
        autoComplete="new-password"
        value={values.passwordConfirmation}
        onChange={handleChange}
        error={errors.passwordConfirmation}
      />

      <Button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
        {submitting ? 'Criando conta…' : 'Criar conta'}
      </Button>

      <OrDivider />

      <Button
        type="button"
        variant="outline"
        className={SECONDARY_BUTTON_CLASS}
        onClick={() => setNotice('Criar conta com Google ainda não está disponível. Use e-mail e senha.')}
      >
        <GoogleIcon />
        Continuar com Google
      </Button>

      <Notice message={notice} />
    </form>
  )
}
