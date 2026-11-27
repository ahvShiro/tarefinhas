import { useMemo, useState } from 'react'
import { CheckIcon, DownloadIcon, Loader2Icon, Trash2Icon, XIcon } from 'lucide-react'
import { Link } from 'react-router'
import { AppBrand } from '@/components/AppBrand'
import { DeletePhotosDialog, MissingPhotosDialog } from '@/components/GalleryDialogs'
import { GalleryToolbar } from '@/components/GalleryToolbar'
import { GalleryViewer } from '@/components/GalleryViewer'
import { COLUMN_OFFSETS, shapeOf, toColumns, useColumnCount } from '@/components/galleryLayout'
import { ProfileButton } from '@/components/ProfileButton'
import { Button, buttonVariants } from '@/components/ui/button'
import { usePhotos } from '@/controllers/usePhotos'
import { useTasks } from '@/controllers/useTasks'
import { cn } from '@/lib/utils'
import { photoUrl } from '@/models/repositories/photoStore'
import {
  EMPTY_FILTERS,
  carouselOf,
  downloadNameOf,
  filterGallery,
  formatDay,
  galleryEntries,
  sortGallery,
  stepsMissingPhotos,
  zipNameOf,
  type GalleryEntry,
  type GalleryFilters,
  type GallerySort,
} from '@/models/taskPhoto'
import { ROUTES } from './routes'

/**
 * The gallery: the photos of every step that is done, loose like Pinterest. Search, filter by date,
 * change the order, select many to download (.zip) or delete, and see which done steps still have no photo.
 * A click opens the photo with its task and a carousel of the photos of the same MainTask.
 */
export function GalleryView() {
  const { loading: tasksLoading, loadFailed, miniTasks, getMainTask } = useTasks()
  const { available, loading: photosLoading, loadError, photos, deletePhotos, downloadPhotos } = usePhotos()
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null)
  const [filters, setFilters] = useState<GalleryFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<GallerySort>('newest')
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [missingOpen, setMissingOpen] = useState(false)
  // Photos waiting for the delete confirmation.
  const [toDelete, setToDelete] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const columnCount = useColumnCount()

  const entries = useMemo(() => galleryEntries(photos, miniTasks, getMainTask), [photos, miniTasks, getMainTask])
  const shown = useMemo(() => sortGallery(filterGallery(entries, filters), sort), [entries, filters, sort])
  const columns = useMemo(
    () => toColumns(shown, columnCount, (entry) => shapeOf(entry.photo.id)),
    [shown, columnCount],
  )
  const missing = useMemo(() => stepsMissingPhotos(miniTasks, photos, getMainTask), [miniTasks, photos, getMainTask])

  const open = entries.find((entry) => entry.photo.id === openPhotoId)
  const carousel = open ? carouselOf(entries, open.mainTask.id) : []
  // Only the selected photos that are still shown count (a filter can hide some).
  const selectedShown = shown.filter((entry) => selected.has(entry.photo.id))

  function toggleSelecting() {
    setSelecting((current) => !current)
    setSelected(new Set())
    setActionError(null)
  }

  function toggleSelected(photoId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  async function download(items: GalleryEntry[], what: string) {
    if (items.length === 0) return
    setBusy(true)
    setActionError(null)
    const result = await downloadPhotos(
      items.map((entry) => ({
        photoId: entry.photo.id,
        fileName: downloadNameOf(entry),
        date: new Date(entry.miniTask.doneAt ?? entry.photo.createdAt),
      })),
      zipNameOf(what),
    )
    setBusy(false)
    if (!result.ok) setActionError(result.message)
  }

  async function confirmDelete() {
    const ids = toDelete
    // The open photo is going away: show the next one of its carousel, or close.
    if (open && ids.includes(open.photo.id)) {
      const rest = carousel.filter((entry) => !ids.includes(entry.photo.id))
      setOpenPhotoId(rest[0]?.photo.id ?? null)
    }
    setBusy(true)
    setActionError(null)
    const result = await deletePhotos(ids)
    setBusy(false)
    setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))))
    if (!result.ok) setActionError(result.message)
  }

  const ready = available && !tasksLoading && !photosLoading && !loadFailed && !loadError

  return (
    <div className="flex min-h-dvh flex-col gap-4 p-3 pb-24">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AppBrand />
          <h1 className="font-heading text-lg font-semibold">Galeria</h1>
          {entries.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {entries.length === 1 ? '1 foto' : `${entries.length} fotos`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.tasks} className={buttonVariants({ variant: 'outline' })}>
            Visão geral
          </Link>
          <Link to={ROUTES.pick} className={buttonVariants({ variant: 'outline' })}>
            Escolher tarefas do dia
          </Link>
          <ProfileButton />
        </div>
      </header>

      {!available ? (
        <p className="text-sm text-muted-foreground">A galeria só funciona no servidor local por enquanto.</p>
      ) : tasksLoading || photosLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : loadFailed || loadError ? (
        <p className="text-sm text-muted-foreground">
          {loadError ?? 'Não foi possível carregar as tarefas.'} Recarregue a página para tentar de novo.
        </p>
      ) : (
        <GalleryToolbar
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          shown={shown.length}
          total={entries.length}
          missingCount={missing.length}
          onOpenMissing={() => setMissingOpen(true)}
          selecting={selecting}
          onToggleSelecting={toggleSelecting}
        />
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {ready &&
        (entries.length === 0 ? (
          <div className="grid flex-1 place-content-center gap-1 text-center">
            <p className="font-medium">Nenhuma foto ainda.</p>
            <p className="text-sm text-muted-foreground">
              Abra um passo, envie uma foto de como você fez e marque o passo como feito.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="grid flex-1 place-content-center gap-2 text-center">
            <p className="font-medium">Nenhuma foto com esses filtros.</p>
            <Button variant="outline" className="justify-self-center" onClick={() => setFilters(EMPTY_FILTERS)}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="flex items-start gap-4 sm:gap-5" role="list">
            {columns.map((column, index) => (
              <ul
                key={index}
                role="presentation"
                className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6"
                style={{ paddingTop: COLUMN_OFFSETS[index % COLUMN_OFFSETS.length] }}
              >
                {column.map((entry) => (
                  <li key={entry.photo.id} role="listitem">
                    <GalleryCard
                      entry={entry}
                      selecting={selecting}
                      selected={selected.has(entry.photo.id)}
                      onOpen={() => (selecting ? toggleSelected(entry.photo.id) : setOpenPhotoId(entry.photo.id))}
                    />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}

      {selecting && ready && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border bg-popover p-2 pl-4 shadow-lg">
          <span className="text-sm font-medium">
            {selectedShown.length === 0
              ? 'Toque nas fotos para selecionar'
              : selectedShown.length === 1
                ? '1 selecionada'
                : `${selectedShown.length} selecionadas`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSelected(
                selectedShown.length === shown.length ? new Set() : new Set(shown.map((entry) => entry.photo.id)),
              )
            }
          >
            {selectedShown.length === shown.length ? 'Desmarcar todas' : 'Selecionar todas'}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || selectedShown.length === 0}
              onClick={() => void download(selectedShown, 'selecionadas')}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
              Baixar (.zip)
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy || selectedShown.length === 0}
              onClick={() => setToDelete(selectedShown.map((entry) => entry.photo.id))}
            >
              <Trash2Icon />
              Apagar
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleSelecting} aria-label="Sair da seleção" title="Sair da seleção">
              <XIcon />
            </Button>
          </div>
        </div>
      )}

      <GalleryViewer
        entry={open}
        carousel={carousel}
        steps={open ? miniTasks.filter((miniTask) => miniTask.mainTaskId === open.mainTask.id) : []}
        busy={busy}
        onSelect={setOpenPhotoId}
        onDownloadTask={() => open && void download(carousel, open.mainTask.name)}
        onDelete={(photoId) => setToDelete([photoId])}
        onClose={() => setOpenPhotoId(null)}
      />
      <MissingPhotosDialog open={missingOpen} steps={missing} onClose={() => setMissingOpen(false)} />
      <DeletePhotosDialog count={toDelete.length} onConfirm={() => void confirmDelete()} onClose={() => setToDelete([])} />
    </div>
  )
}

function GalleryCard({
  entry,
  selecting,
  selected,
  onOpen,
}: {
  entry: GalleryEntry
  selecting: boolean
  selected: boolean
  onOpen: () => void
}) {
  const day = formatDay(entry.miniTask.doneAt ?? entry.photo.createdAt)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        selecting
          ? `${entry.miniTask.text}, feito em ${day}. ${selected ? 'Desmarcar' : 'Selecionar'}`
          : `${entry.miniTask.text}, feito em ${day}. Abrir foto`
      }
      aria-pressed={selecting ? selected : undefined}
      className={cn(
        'group relative block w-full overflow-hidden rounded-3xl bg-muted text-left shadow-sm outline-none transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected && 'ring-4 ring-primary',
      )}
      style={{ aspectRatio: shapeOf(entry.photo.id) }}
    >
      <img
        src={photoUrl(entry.photo.id)}
        alt=""
        loading="lazy"
        className={cn(
          'absolute inset-0 size-full object-cover transition-[filter,scale] duration-200 group-hover:brightness-90',
          selected && 'scale-95 rounded-2xl',
        )}
      />
      <div className="absolute inset-x-0 top-0 flex flex-col gap-0.5 bg-linear-to-b from-black/70 via-black/35 to-transparent px-3 pt-2.5 pb-8 text-white">
        <span className={cn('line-clamp-2 text-sm font-semibold [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]', selecting && 'pr-7')}>
          {entry.miniTask.text}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-white/85">
          <span className="size-2 shrink-0 rounded-full ring-1 ring-white/70" style={{ backgroundColor: entry.mainTask.color }} />
          {day}
        </span>
      </div>
      {selecting && (
        <span
          aria-hidden
          className={cn(
            'absolute top-2.5 right-2.5 grid size-6 place-content-center rounded-full border-2 border-white shadow [&_svg]:size-4',
            selected ? 'bg-primary text-primary-foreground' : 'bg-black/30',
          )}
        >
          {selected && <CheckIcon />}
        </span>
      )}
    </button>
  )
}
