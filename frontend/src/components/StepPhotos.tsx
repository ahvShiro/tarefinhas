import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePhotos } from '@/controllers/usePhotos'
import { photoUrl } from '@/models/repositories/photoStore'
import { PhotoLightbox } from './PhotoLightbox'
import type { StepPhotosState } from './useStepPhotos'

/** "Enviar foto": picks one or more images from the computer. `compact` shows only the icon (narrow lists). */
export function SendPhotoButton({ state, compact = false }: { state: StepPhotosState; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  if (!state.available) return null

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    void state.send(files)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        hidden
        onChange={handleFiles}
      />
      <Button
        variant={compact ? 'ghost' : 'outline'}
        size={compact ? 'icon-sm' : 'sm'}
        disabled={state.sending || state.loading}
        onClick={() => inputRef.current?.click()}
        aria-label={compact ? `Enviar foto de “${state.miniTask.text}”` : undefined}
        title={compact ? (state.sending ? 'Enviando…' : 'Enviar foto') : undefined}
      >
        {state.sending ? <Loader2Icon className="animate-spin" /> : <ImagePlusIcon />}
        {!compact && (state.sending ? 'Enviando…' : 'Enviar foto')}
      </Button>
    </>
  )
}

/** The photos of the step, with a button to take each one out (second click confirms). */
export function StepPhotoList({ state }: { state: StepPhotosState }) {
  const { photosOf } = usePhotos()
  // A photo is taken out on the second click, so a slip does not delete it.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  // Index of the photo open large, or null.
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const { miniTask } = state

  if (!state.available) {
    return <p className="text-xs text-muted-foreground">As fotos só funcionam no servidor local por enquanto.</p>
  }

  const photos = photosOf(miniTask.id)

  function handleRemove(photoId: string) {
    if (confirmingId !== photoId) {
      setConfirmingId(photoId)
      return
    }
    setConfirmingId(null)
    void state.remove(photoId)
  }

  return (
    <div className="flex flex-col gap-2">
      {state.loadError && <p className="text-xs text-destructive">{state.loadError}</p>}
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto ainda. Use “Enviar foto”, no topo.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`Abrir a foto ${index + 1} do passo em tamanho grande`}
                className="block w-full cursor-zoom-in rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <img
                  src={photoUrl(photo.id)}
                  alt={`Foto do passo “${miniTask.text}”`}
                  loading="lazy"
                  className="aspect-square w-full rounded-md border object-cover transition-[filter] hover:brightness-90"
                />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(photo.id)}
                onBlur={() => setConfirmingId((current) => (current === photo.id ? null : current))}
                aria-label={confirmingId === photo.id ? 'Confirmar: tirar esta foto' : 'Tirar esta foto'}
                title={confirmingId === photo.id ? 'Clique de novo para tirar' : 'Tirar esta foto'}
                className={
                  confirmingId === photo.id
                    ? 'absolute top-1 right-1 rounded-md bg-destructive px-1.5 py-0.5 text-[11px] font-medium text-white'
                    : 'absolute top-1 right-1 grid size-6 place-content-center rounded-full bg-black/60 text-white hover:bg-black/80 [&_svg]:size-3.5'
                }
              >
                {confirmingId === photo.id ? 'Tirar?' : <XIcon />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && !miniTask.done && (
        <p className="text-xs text-muted-foreground">Entra na galeria quando o passo for feito.</p>
      )}
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <PhotoLightbox
        photos={photos}
        index={openIndex !== null && openIndex < photos.length ? openIndex : null}
        title={miniTask.text}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  )
}

const STRIP_MAX = 4

/** A small row with the first photos of a step, for narrow lists. Nothing when the step has no photos. */
export function StepPhotoStrip({ state }: { state: StepPhotosState }) {
  const { photosOf } = usePhotos()
  if (!state.available) return null
  const photos = photosOf(state.miniTask.id)
  if (photos.length === 0) return null
  const extra = photos.length - STRIP_MAX
  return (
    <ul className="flex items-center gap-1" aria-label={`${photos.length} foto(s) do passo`}>
      {photos.slice(0, STRIP_MAX).map((photo) => (
        <li key={photo.id}>
          <img src={photoUrl(photo.id)} alt="" loading="lazy" className="size-8 rounded object-cover ring-1 ring-border" />
        </li>
      ))}
      {extra > 0 && <li className="text-xs text-muted-foreground">+{extra}</li>}
    </ul>
  )
}
