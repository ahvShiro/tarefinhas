import { useSyncExternalStore } from 'react'

// Loose Pinterest look: each card gets its own shape (picked from the photo id, so it does not change on reload),
// each column starts at its own height, and cards go to the shortest column.

const SHAPES = [3 / 4, 2 / 3, 4 / 5, 1, 3 / 5, 5 / 6, 4 / 3] as const // width / height

/** Extra space at the top of each column, in px, so the rows do not line up. */
export const COLUMN_OFFSETS = [0, 56, 20, 84, 36] as const

/** Width / height of the card of a photo. Same id, same shape. */
export function shapeOf(photoId: string): number {
  let hash = 0
  for (const char of photoId) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return SHAPES[Math.abs(hash) % SHAPES.length]
}

/** Puts each item in the column that is shortest so far, keeping the order inside each column. */
export function toColumns<T>(items: T[], columnCount: number, shape: (item: T) => number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => [])
  // Heights in "card widths", starting from each column's offset (cards are about 260 px wide).
  const heights = Array.from({ length: columnCount }, (_, index) => (COLUMN_OFFSETS[index % COLUMN_OFFSETS.length] ?? 0) / 260)
  for (const item of items) {
    let shortest = 0
    for (let index = 1; index < columnCount; index += 1) if (heights[index] < heights[shortest]) shortest = index
    columns[shortest].push(item)
    heights[shortest] += 1 / shape(item) + 0.08
  }
  return columns
}

const BREAKPOINTS = [
  { query: '(min-width: 1280px)', columns: 5 },
  { query: '(min-width: 1024px)', columns: 4 },
  { query: '(min-width: 640px)', columns: 3 },
] as const

function currentColumnCount(): number {
  return BREAKPOINTS.find(({ query }) => window.matchMedia(query).matches)?.columns ?? 2
}

function subscribe(onChange: () => void) {
  const lists = BREAKPOINTS.map(({ query }) => window.matchMedia(query))
  lists.forEach((list) => list.addEventListener('change', onChange))
  return () => lists.forEach((list) => list.removeEventListener('change', onChange))
}

/** 2 columns on a phone, up to 5 on a wide screen. */
export function useColumnCount(): number {
  return useSyncExternalStore(subscribe, currentColumnCount, () => 2)
}
