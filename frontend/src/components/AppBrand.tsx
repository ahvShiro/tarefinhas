import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/views/routes'

/** The name "Tarefinhas" in the top left corner of every app screen. It goes to the overview. */
export function AppBrand({ className }: { className?: string }) {
  return (
    <Link
      to={ROUTES.tasks}
      className={cn(
        'rounded-sm font-heading text-lg font-semibold outline-none hover:opacity-70 focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      Tarefinhas
    </Link>
  )
}
