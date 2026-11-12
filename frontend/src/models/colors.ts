export const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Random color among the ones no MainTask uses yet. Repeats only when the palette runs out. */
export function pickRandomColor(usedColors: readonly string[]): string {
  const used = new Set(usedColors)
  const free = PALETTE.filter((color) => !used.has(color))
  return pickRandom(free.length > 0 ? free : PALETTE)
}
