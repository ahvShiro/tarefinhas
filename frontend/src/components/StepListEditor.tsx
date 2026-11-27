import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GripVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { insertionIndex, moveItem, newStep, type StepField } from './stepFields'

interface StepListEditorProps {
  steps: StepField[]
  onChange: (steps: StepField[]) => void
  invalid?: boolean
}

/**
 * The steps of the "Nova tarefa" form. Enter makes a new step right after and goes to it; Backspace in an empty
 * step removes it and goes to the one before; drag the handle (or Alt + ↑/↓) to change the order.
 *
 * Dragging is done with plain pointer events, not dnd-kit: the form is inside a dialog that is centered with a
 * CSS transform and scrolls, which breaks a floating copy. Here the row itself moves in the list while the pointer
 * goes up and down.
 */
export function StepListEditor({ steps, onChange, invalid = false }: StepListEditorProps) {
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const rows = useRef(new Map<string, HTMLDivElement>())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // The same id, readable at once: pointer moves can arrive before React draws the drag state.
  const dragging = useRef<string | null>(null)
  // The list as last sent to the parent: pointer moves can come before React draws the new order.
  const latest = useRef(steps)
  useEffect(() => {
    latest.current = steps
  }, [steps])

  function change(next: StepField[]) {
    latest.current = next
    onChange(next)
  }

  // Focus after React has drawn the new list.
  function focusLater(id: string, atEnd = false) {
    window.requestAnimationFrame(() => {
      const input = inputs.current.get(id)
      if (!input) return
      input.focus()
      if (atEnd) input.setSelectionRange(input.value.length, input.value.length)
    })
  }

  function update(id: string, text: string) {
    change(steps.map((step) => (step.id === id ? { ...step, text } : step)))
  }

  function remove(id: string) {
    change(steps.length > 1 ? steps.filter((step) => step.id !== id) : [newStep()])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    const step = steps[index]
    if (event.key === 'Enter') {
      event.preventDefault()
      const added = newStep()
      change([...steps.slice(0, index + 1), added, ...steps.slice(index + 1)])
      focusLater(added.id)
    } else if (event.key === 'Backspace' && step.text === '' && steps.length > 1) {
      event.preventDefault()
      const previous = steps[index - 1] ?? steps[index + 1]
      change(steps.filter((item) => item.id !== step.id))
      focusLater(previous.id, true)
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      const target = event.key === 'ArrowUp' ? index - 1 : index + 1
      if (target < 0 || target >= steps.length) return
      change(moveItem(steps, index, target))
      focusLater(step.id)
    }
  }

  // Moves and the release are read on the whole window, not on the handle: when the step goes down, React moves
  // the handle element itself in the page, and the browser would drop a pointer captured by it.
  function startDrag(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) return
    event.preventDefault()
    dragging.current = id
    setDraggingId(id)
    const pointerId = event.pointerId
    const onMove = (move: globalThis.PointerEvent) => {
      if (move.pointerId === pointerId) moveDrag(move.clientY, id)
    }
    const onEnd = (end: globalThis.PointerEvent) => {
      if (end.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
      dragging.current = null
      setDraggingId(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
  }

  function moveDrag(pointerY: number, id: string) {
    if (dragging.current !== id) return
    const list = latest.current
    const from = list.findIndex((step) => step.id === id)
    // Middle of every other row, top to bottom: the step goes after the ones above the pointer.
    const middles = list
      .filter((step) => step.id !== id)
      .map((step) => {
        const box = rows.current.get(step.id)?.getBoundingClientRect()
        return box ? box.top + box.height / 2 : Number.POSITIVE_INFINITY
      })
    const to = insertionIndex(middles, pointerY)
    if (to !== from) change(moveItem(list, from, to))
  }

  return (
    <div className={cn('flex flex-col gap-1.5', draggingId !== null && 'select-none')}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          ref={(element) => {
            if (element) rows.current.set(step.id, element)
            else rows.current.delete(step.id)
          }}
          className={cn(
            'flex items-center gap-2 rounded-md transition-colors',
            step.id === draggingId && 'bg-accent shadow-sm ring-1 ring-foreground/10',
          )}
        >
          <button
            type="button"
            onPointerDown={(event) => startDrag(event, step.id)}
            // The keyboard moves steps with Alt + ↑/↓ in the field; this handle is for the mouse and touch.
            tabIndex={-1}
            aria-label={`Arrastar passo ${index + 1}`}
            title="Arraste para mudar a ordem"
            className={cn(
              '-ml-1 grid h-8 w-7 shrink-0 touch-none place-content-center rounded text-muted-foreground hover:text-foreground [&_svg]:size-4',
              step.id === draggingId ? 'cursor-grabbing' : 'cursor-grab',
            )}
          >
            <GripVerticalIcon />
          </button>
          <span className="w-5 text-right text-xs text-muted-foreground">{index + 1}.</span>
          <Input
            ref={(element) => {
              if (element) inputs.current.set(step.id, element)
              else inputs.current.delete(step.id)
            }}
            value={step.text}
            onChange={(event) => update(step.id, event.target.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            aria-label={`Passo ${index + 1}`}
            aria-invalid={invalid}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => remove(step.id)}
            aria-label={`Remover passo ${index + 1}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          const added = newStep()
          change([...steps, added])
          focusLater(added.id)
        }}
      >
        <PlusIcon />
        Adicionar passo
      </Button>
    </div>
  )
}
