import { CheckSquareIcon, ImageOffIcon, SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hasFilters, EMPTY_FILTERS, type GalleryFilters, type GalleryPeriod, type GallerySort } from '@/models/taskPhoto'

const SELECT_CLASS =
  'h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const PERIODS: { value: GalleryPeriod; label: string }[] = [
  { value: 'all', label: 'Qualquer data' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'range', label: 'Escolher datas…' },
]

const SORTS: { value: GallerySort; label: string }[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'byTask', label: 'Por tarefa' },
]

interface GalleryToolbarProps {
  filters: GalleryFilters
  onFiltersChange: (filters: GalleryFilters) => void
  sort: GallerySort
  onSortChange: (sort: GallerySort) => void
  shown: number
  total: number
  missingCount: number
  onOpenMissing: () => void
  selecting: boolean
  onToggleSelecting: () => void
}

/** Search, date and order of the gallery, plus "Faltam fotos" and "Selecionar". */
export function GalleryToolbar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  shown,
  total,
  missingCount,
  onOpenMissing,
  selecting,
  onToggleSelecting,
}: GalleryToolbarProps) {
  const set = (change: Partial<GalleryFilters>) => onFiltersChange({ ...filters, ...change })

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 sm:max-w-80">
          <span className="sr-only">Buscar fotos</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={filters.query}
            onChange={(event) => set({ query: event.target.value })}
            placeholder="Buscar por passo ou tarefa"
            className="pl-8"
          />
        </label>

        <label className="flex items-center gap-1.5">
          <span className="sr-only">Período</span>
          <select
            value={filters.period}
            onChange={(event) => set({ period: event.target.value as GalleryPeriod })}
            className={SELECT_CLASS}
          >
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </label>

        {filters.period === 'range' && (
          <div className="flex items-center gap-1.5 text-sm">
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">De</span>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => set({ from: event.target.value })}
                className={SELECT_CLASS}
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">até</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => set({ to: event.target.value })}
                className={SELECT_CLASS}
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-1.5">
          <span className="sr-only">Ordem</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as GallerySort)} className={SELECT_CLASS}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenMissing} disabled={missingCount === 0}>
            <ImageOffIcon />
            Faltam fotos ({missingCount})
          </Button>
          <Button variant={selecting ? 'default' : 'outline'} size="sm" onClick={onToggleSelecting} aria-pressed={selecting}>
            <CheckSquareIcon />
            {selecting ? 'Selecionando' : 'Selecionar'}
          </Button>
        </div>
      </div>

      {hasFilters(filters) && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {shown === 1 ? '1 foto' : `${shown} fotos`} de {total}
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
            <XIcon />
            Limpar filtros
          </Button>
        </p>
      )}
    </div>
  )
}
