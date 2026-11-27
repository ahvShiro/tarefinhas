import type { MainTask } from './mainTask'
import type { MiniTask } from './miniTask'
import { normalizeText } from './text'

/** A photo that proves how a step (miniTask) was done. A step can have many. */
export interface TaskPhoto {
  id: string
  miniTaskId: string
  contentType: string
  /** When the photo was sent (ISO). */
  createdAt: string
}

/** A photo in the gallery, with the step it proves and the MainTask of that step. */
export interface GalleryEntry {
  photo: TaskPhoto
  miniTask: MiniTask
  mainTask: MainTask
}

/** Largest photo the app sends. The dev server refuses more than this. */
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/**
 * The gallery: photos of the steps that are done, newest done first. A photo of a step that is not done yet
 * waits outside the gallery.
 */
export function galleryEntries(
  photos: TaskPhoto[],
  miniTasks: MiniTask[],
  getMainTask: (id: string) => MainTask | undefined,
): GalleryEntry[] {
  const miniTasksById = new Map(miniTasks.map((miniTask) => [miniTask.id, miniTask]))
  const entries = photos.flatMap((photo): GalleryEntry[] => {
    const miniTask = miniTasksById.get(photo.miniTaskId)
    if (!miniTask?.done) return []
    const mainTask = getMainTask(miniTask.mainTaskId)
    return mainTask ? [{ photo, miniTask, mainTask }] : []
  })
  return entries.sort(
    (a, b) =>
      doneTimeOf(b).localeCompare(doneTimeOf(a)) || b.photo.createdAt.localeCompare(a.photo.createdAt),
  )
}

function doneTimeOf(entry: GalleryEntry): string {
  return entry.miniTask.doneAt ?? entry.photo.createdAt
}

/** The carousel of a photo: the gallery photos of the same MainTask, in step order. */
export function carouselOf(entries: GalleryEntry[], mainTaskId: string): GalleryEntry[] {
  return entries
    .filter((entry) => entry.mainTask.id === mainTaskId)
    .sort(
      (a, b) => a.miniTask.position - b.miniTask.position || a.photo.createdAt.localeCompare(b.photo.createdAt),
    )
}

/** `dd/MM/yyyy` of an ISO date-time, in local time. */
export function formatDay(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/** Name of the downloaded file: `tarefinhas-<step>-<yyyy-mm-dd>.<ext>`. */
export function downloadNameOf(entry: GalleryEntry): string {
  const slug =
    entry.miniTask.text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'passo'
  const day = formatDay(entry.miniTask.doneAt ?? entry.photo.createdAt).split('/').reverse().join('-')
  return `tarefinhas-${slug}-${day}.${EXTENSIONS[entry.photo.contentType] ?? 'jpg'}`
}

/** Date presets of the gallery. `range` uses `from` and `to`. */
export type GalleryPeriod = 'all' | 'last7' | 'thisMonth' | 'range'

export type GallerySort = 'newest' | 'oldest' | 'byTask'

export interface GalleryFilters {
  /** Words to find in the step, the MainTask name or its description. Accents and case do not matter. */
  query: string
  period: GalleryPeriod
  /** `YYYY-MM-DD`, both ends included. Only with `period: 'range'`. Empty means open. */
  from: string
  to: string
}

export const EMPTY_FILTERS: GalleryFilters = { query: '', period: 'all', from: '', to: '' }

export function hasFilters(filters: GalleryFilters): boolean {
  return filters.query.trim() !== '' || filters.period !== 'all'
}

/** `YYYY-MM-DD` of a date, in local time. */
function dayKeyOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The day the photo counts for: the day its step was done. */
export function entryDayKey(entry: GalleryEntry): string {
  return dayKeyOf(new Date(entry.miniTask.doneAt ?? entry.photo.createdAt))
}

/** The entries that match every filter. `today` is a parameter so the rule can be tested. */
export function filterGallery(entries: GalleryEntry[], filters: GalleryFilters, today = new Date()): GalleryEntry[] {
  const words = normalizeText(filters.query).split(/\s+/).filter(Boolean)
  let from = ''
  let to = ''
  if (filters.period === 'last7') {
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    from = dayKeyOf(start)
    to = dayKeyOf(today)
  } else if (filters.period === 'thisMonth') {
    from = dayKeyOf(new Date(today.getFullYear(), today.getMonth(), 1))
    to = dayKeyOf(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  } else if (filters.period === 'range') {
    from = filters.from
    to = filters.to
  }

  return entries.filter((entry) => {
    const day = entryDayKey(entry)
    if (from !== '' && day < from) return false
    if (to !== '' && day > to) return false
    if (words.length === 0) return true
    const haystack = normalizeText(`${entry.miniTask.text} ${entry.mainTask.name} ${entry.mainTask.description}`)
    return words.every((word) => haystack.includes(word))
  })
}

/** Newest done first (as `galleryEntries`), oldest first, or grouped by MainTask (by name, then step order). */
export function sortGallery(entries: GalleryEntry[], sort: GallerySort): GalleryEntry[] {
  if (sort === 'newest') return entries
  if (sort === 'oldest') return [...entries].reverse()
  return [...entries].sort(
    (a, b) =>
      a.mainTask.name.localeCompare(b.mainTask.name, 'pt-BR') ||
      a.mainTask.id.localeCompare(b.mainTask.id) ||
      a.miniTask.position - b.miniTask.position ||
      a.photo.createdAt.localeCompare(b.photo.createdAt),
  )
}

/** Steps that are done but have no photo yet, newest done first. */
export function stepsMissingPhotos(
  miniTasks: MiniTask[],
  photos: TaskPhoto[],
  getMainTask: (id: string) => MainTask | undefined,
): { miniTask: MiniTask; mainTask: MainTask }[] {
  const withPhoto = new Set(photos.map((photo) => photo.miniTaskId))
  return miniTasks
    .filter((miniTask) => miniTask.done && !withPhoto.has(miniTask.id))
    .flatMap((miniTask) => {
      const mainTask = getMainTask(miniTask.mainTaskId)
      return mainTask ? [{ miniTask, mainTask }] : []
    })
    .sort((a, b) => (b.miniTask.doneAt ?? '').localeCompare(a.miniTask.doneAt ?? ''))
}

/** Name of a .zip download: `tarefinhas-<what>-<yyyy-mm-dd>.zip`. */
export function zipNameOf(what: string, today = new Date()): string {
  const slug =
    normalizeText(what)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'fotos'
  return `tarefinhas-${slug}-${dayKeyOf(today)}.zip`
}
