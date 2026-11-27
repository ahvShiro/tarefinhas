import { useEffect } from 'react'
import { Undo2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UNDO_DELAY_MS, type PendingDelete } from './useUndoableDelete'

/** "… excluída. Desfazer", at the bottom of the screen, with a bar that runs out. Ctrl+Z also undoes. */
export function UndoToast({ pending, onUndo }: { pending: PendingDelete | null; onUndo: () => void }) {
  useEffect(() => {
    if (!pending) return
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        onUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pending, onUndo])

  if (!pending) return null
  const what = pending.kind === 'mainTask' ? 'Tarefa' : 'Passo'

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-foreground text-background shadow-lg"
    >
      <div className="flex items-center gap-3 py-2 pr-2 pl-4 text-sm">
        <span className="min-w-0 flex-1 truncate">
          {what} “{pending.label}” excluíd{pending.kind === 'mainTask' ? 'a' : 'o'}.
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={onUndo}
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2Icon />
          Desfazer
        </Button>
      </div>
      {/* key restarts the bar for each new deletion. */}
      <div
        key={pending.id}
        className="h-1 origin-left bg-background/60 motion-reduce:hidden"
        style={{ animation: `undo-countdown ${UNDO_DELAY_MS}ms linear forwards` }}
      />
    </div>
  )
}
