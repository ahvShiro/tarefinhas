import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStepNotes } from '@/controllers/useStepNotes'
import { MAX_NOTE_LENGTH } from '@/models/stepNote'

/** The note of a step (how it was done, what was learned). Saved in this browser; it shows in the gallery. */
export function StepNoteEditor({ miniTaskId }: { miniTaskId: string }) {
  const { notes, save } = useStepNotes()
  const saved = notes[miniTaskId]?.text ?? ''
  const [draft, setDraft] = useState(saved)
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null)
  const changed = draft.trim() !== saved

  function handleSave() {
    const stored = save(miniTaskId, draft)
    setStatus(
      stored
        ? { text: draft.trim() === '' ? 'Nota apagada.' : 'Nota salva.', error: false }
        : { text: 'O navegador não deixou guardar a nota.', error: true },
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value.slice(0, MAX_NOTE_LENGTH))
          setStatus(null)
        }}
        placeholder="Como você fez, o que aprendeu…"
        aria-label="Nota do passo"
        className="min-h-16 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!changed} onClick={handleSave}>
          Salvar nota
        </Button>
        {status && (
          <span role="status" className={status.error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {status.text}
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {draft.length}/{MAX_NOTE_LENGTH}
        </span>
      </div>
    </div>
  )
}
