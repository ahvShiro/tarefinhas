import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/controllers/useAuth'
import { PASSWORD_RULE_HINT, type PasswordChangeErrors } from '@/models/auth'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  )
}

/** "Senha": current, new and confirmation, with the sign-up rules. The backend has no route for it yet. */
export function PasswordForm() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [errors, setErrors] = useState<PasswordChangeErrors>({})
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const result = await changePassword({ currentPassword, newPassword, newPasswordConfirmation })
    setSaving(false)
    if (result.ok) {
      setErrors({})
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setStatus({ ok: true, text: 'Senha trocada.' })
      return
    }
    setErrors(result.errors)
    setStatus(result.message ? { ok: false, text: result.message } : null)
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex w-full flex-col gap-3 border-t pt-5">
      <h2 className="font-heading font-medium">Senha</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-current">Senha atual</Label>
        <Input
          id="password-current"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby="password-current-error"
        />
        <FieldError id="password-current-error" message={errors.currentPassword} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-new">Nova senha</Label>
        <Input
          id="password-new"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-invalid={Boolean(errors.newPassword)}
          aria-describedby="password-new-hint password-new-error"
        />
        <p id="password-new-hint" className="text-xs text-muted-foreground">
          {PASSWORD_RULE_HINT}
        </p>
        <FieldError id="password-new-error" message={errors.newPassword} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-confirmation">Confirmar nova senha</Label>
        <Input
          id="password-confirmation"
          type="password"
          autoComplete="new-password"
          value={newPasswordConfirmation}
          onChange={(event) => setNewPasswordConfirmation(event.target.value)}
          aria-invalid={Boolean(errors.newPasswordConfirmation)}
          aria-describedby="password-confirmation-error"
        />
        <FieldError id="password-confirmation-error" message={errors.newPasswordConfirmation} />
      </div>
      {status && (
        <p role="status" className={status.ok ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
          {status.text}
        </p>
      )}
      <Button type="submit" variant="outline" className="self-start" disabled={saving}>
        Trocar senha
      </Button>
    </form>
  )
}

/** "Excluir conta": the person types their e-mail to confirm. The backend has no route for it yet. */
export function DeleteAccountSection() {
  const { profile, deleteAccount } = useAuth()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const email = profile?.email ?? ''
  const matches = typed.trim().toLowerCase() === email.toLowerCase() && email !== ''

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)
    if (!result.ok) setMessage(result.message)
  }

  return (
    <section className="flex w-full flex-col gap-3 border-t pt-5">
      <h2 className="font-heading font-medium">Excluir conta</h2>
      <p className="text-sm text-muted-foreground">Apaga a conta e todas as tarefas. Não dá para desfazer.</p>
      <Button
        variant="outline"
        className="self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => {
          setOpen(true)
          setTyped('')
          setMessage(null)
        }}
      >
        Excluir conta…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir a conta?</DialogTitle>
            <DialogDescription>
              A conta, as tarefas e os passos serão apagados e não dá para desfazer. Para confirmar, escreva seu e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-account-email">E-mail</Label>
            <Input
              id="delete-account-email"
              type="email"
              autoComplete="off"
              placeholder={email}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value)
                setMessage(null)
              }}
            />
          </div>
          {message && (
            <p role="alert" className="text-xs text-destructive">
              {message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!matches || deleting} onClick={() => void handleDelete()}>
              Excluir conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
