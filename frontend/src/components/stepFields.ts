/** One step field of the "Nova tarefa" form. The id keeps React rows stable while the order changes. */
export interface StepField {
  id: string
  text: string
}

export function newStep(text = ''): StepField {
  return { id: crypto.randomUUID(), text }
}

/** Moves the item at `from` to `to`, keeping the others in order. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Where a dragged row goes: after every other row whose middle is above the pointer. `middles` are the middles
 * of the other rows (without the dragged one), top to bottom.
 */
export function insertionIndex(middles: number[], pointerY: number): number {
  return middles.filter((middle) => middle < pointerY).length
}
