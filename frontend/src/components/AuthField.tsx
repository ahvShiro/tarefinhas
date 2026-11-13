import { useState, type ComponentProps, type ReactNode } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const INPUT_CLASS =
  'h-11 rounded-xl border-ink/15 bg-white px-3.5 text-[15px] md:text-[15px] text-ink focus-visible:border-brand focus-visible:ring-brand/20'

interface AuthFieldProps extends Omit<ComponentProps<'input'>, 'id' | 'name'> {
  id: string
  name: string
  label: string
  error?: string
  hint?: string
  /** Element shown at the right of the label, for example a "forgot password" button. */
  labelAction?: ReactNode
  /** Element placed inside the input, at the right edge. */
  trailing?: ReactNode
}

export function AuthField({
  id,
  name,
  label,
  error,
  hint,
  labelAction,
  trailing,
  className,
  ...inputProps
}: AuthFieldProps) {
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-ink">
          {label}
        </Label>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          className={cn(INPUT_CLASS, trailing !== undefined && 'pr-12', className)}
          {...inputProps}
        />
        {trailing !== undefined && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
        )}
      </div>
      {message && (
        <p id={messageId} className={cn('text-[13px] leading-snug', error ? 'text-destructive' : 'text-ink/60')}>
          {message}
        </p>
      )}
    </div>
  )
}

type PasswordFieldProps = Omit<AuthFieldProps, 'type' | 'trailing'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          aria-controls={props.id}
          className="flex size-8 items-center justify-center rounded-lg text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
        >
          {visible ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
        </button>
      }
    />
  )
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-ink/50" aria-hidden="true">
      <span className="h-px flex-1 bg-ink/10" />
      ou
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  )
}

/** Polite live region for messages about features that are not available yet. */
export function Notice({ message }: { message: string }) {
  return (
    <p aria-live="polite" className="min-h-5 text-[13px] leading-snug text-ink/70">
      {message}
    </p>
  )
}
