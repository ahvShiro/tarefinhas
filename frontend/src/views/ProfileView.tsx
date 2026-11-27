import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AppBrand } from '@/components/AppBrand'
import { PhotoError, photoFromFile } from '@/components/profilePhoto'
import { DeleteAccountSection, PasswordForm } from '@/components/AccountSettings'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/controllers/useAuth'
import { DEFAULT_PHOTO_URL } from '@/models/profile'
import { ROUTES } from './routes'

/**
 * The profile screen: photo, name and e-mail, change of name, links to the other screens, and
 * sign-out. It opens only for a person who is in (see RequireAuth). More profile functions will come here later.
 */
export function ProfileView() {
  const { profile, signOut, setProfilePhoto } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const photoUrl = profile?.photo ?? DEFAULT_PHOTO_URL

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clear the field, so choosing the same file again still fires the event.
    event.target.value = ''
    if (!file) return
    try {
      const photo = await photoFromFile(file)
      setMessage(setProfilePhoto(photo) ? null : 'Não foi possível salvar a foto neste navegador.')
    } catch (error) {
      setMessage(error instanceof PhotoError ? error.message : 'Não foi possível usar essa imagem.')
    }
  }

  async function handleSignOut() {
    await signOut()
    void navigate(ROUTES.home, { replace: true })
  }

  // RequireAuth keeps this screen closed without a profile, so this only guards the types.
  if (!profile) return null

  return (
    <div className="flex min-h-dvh flex-col gap-3 p-3">
      <header className="flex items-center justify-between">
        <AppBrand />
        <div className="flex items-center gap-2">
          <Link to={ROUTES.tasks} className={buttonVariants({ variant: 'outline' })}>
            Visão geral
          </Link>
          <Link to={ROUTES.pick} className={buttonVariants({ variant: 'outline' })}>
            Escolher tarefas do dia
          </Link>
          <Link to={ROUTES.gallery} className={buttonVariants({ variant: 'outline' })}>
            Galeria
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-6 pt-8 pb-8">
        <h1 className="sr-only">Perfil</h1>

        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={photoUrl}
            alt={`Foto de ${profile.name}`}
            className="size-36 rounded-full object-cover ring-1 ring-foreground/15"
          />
          <div className="min-w-0">
            <p className="font-heading text-2xl font-semibold break-words">{profile.name}</p>
            <p className="text-sm break-all text-muted-foreground">{profile.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-label="Escolher uma foto"
              onChange={(event) => void handleFile(event)}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              Trocar foto
            </Button>
            {profile.photo && (
              <Button
                variant="ghost"
                onClick={() => {
                  setMessage(null)
                  setProfilePhoto(undefined)
                }}
              >
                Usar o gatinho
              </Button>
            )}
          </div>
          {message && (
            <p role="alert" className="text-xs text-destructive">
              {message}
            </p>
          )}
        </div>

        <NameForm />
        <PasswordForm />
        <DeleteAccountSection />

        <Button variant="outline" onClick={() => void handleSignOut()}>
          Sair
        </Button>
      </main>
    </div>
  )
}

/** Change of the name. The field starts with the saved name; after saving, the two are the same. */
function NameForm() {
  const { profile, updateName } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await updateName(name)
      setStatus(result.ok ? { ok: true, text: 'Nome salvo.' } : { ok: false, text: result.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex w-full flex-col gap-3 border-t pt-5">
      <h2 className="font-heading font-medium">Nome</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-name">Seu nome</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setStatus(null)
          }}
          aria-invalid={status?.ok === false}
          aria-describedby="profile-name-status"
        />
        {status && (
          <p
            id="profile-name-status"
            role={status.ok ? 'status' : undefined}
            className={status.ok ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}
          >
            {status.text}
          </p>
        )}
      </div>
      <Button type="submit" variant="outline" className="self-start" disabled={saving}>
        Salvar nome
      </Button>
    </form>
  )
}
