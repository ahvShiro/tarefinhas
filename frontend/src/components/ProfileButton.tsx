import { Link } from 'react-router'
import { useAuth } from '@/controllers/useAuth'
import { DEFAULT_PHOTO_URL } from '@/models/profile'
import { ROUTES } from '@/views/routes'

/** The person's round photo in the top right corner. It opens the profile screen. */
export function ProfileButton() {
  const { profile } = useAuth()

  return (
    <Link
      to={ROUTES.profile}
      aria-label="Abrir perfil"
      title="Perfil"
      className="size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/15 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <img src={profile?.photo ?? DEFAULT_PHOTO_URL} alt="" className="size-full object-cover" />
    </Link>
  )
}
