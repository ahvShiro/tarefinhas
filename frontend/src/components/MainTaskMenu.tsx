import { useContext } from 'react'
import { DropdownMenu } from 'radix-ui'
import {
  BookmarkPlusIcon,
  CalendarCheckIcon,
  CopyIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { MainTaskMenuContext } from '@/controllers/mainTaskMenuContext'
import { cn } from '@/lib/utils'

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50 [&_svg]:size-4'

const CONTENT_CLASS =
  'z-50 min-w-52 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'

/** The "⋯" button of a MainTask card in the task bank: edit, new step, duplicate, save as template, send to today and delete. */
export function MainTaskMenu({
  mainTaskId,
  mainTaskName,
  hasStepsToSend,
}: {
  mainTaskId: string
  mainTaskName: string
  /** True when some step is in the bank and not done. Otherwise "Mandar para hoje" has nothing to do. */
  hasStepsToSend: boolean
}) {
  const actions = useContext(MainTaskMenuContext)
  if (!actions) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Ações da tarefa ${mainTaskName}`}
        title="Ações da tarefa"
        // The card is draggable: the press on the button must not start a drag.
        onPointerDown={(event) => event.stopPropagation()}
        className="grid size-8 cursor-pointer place-content-center rounded-md text-foreground/70 outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-foreground/10 [&_svg]:size-4"
      >
        <EllipsisIcon />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={CONTENT_CLASS} align="end" sideOffset={4}>
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => actions.onEdit(mainTaskId)}>
            <PencilIcon />
            Editar tarefa
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => actions.onAddStep(mainTaskId)}>
            <PlusIcon />
            Novo passo
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => actions.onDuplicate(mainTaskId)}>
            <CopyIcon />
            Duplicar tarefa
          </DropdownMenu.Item>
          <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => actions.onSaveTemplate(mainTaskId)}>
            <BookmarkPlusIcon />
            Salvar como modelo
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM_CLASS}
            disabled={!hasStepsToSend}
            onSelect={() => actions.onSendToToday(mainTaskId)}
          >
            <CalendarCheckIcon />
            Mandar passos para hoje
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={cn(ITEM_CLASS, 'text-destructive')} onSelect={() => actions.onDelete(mainTaskId)}>
            <Trash2Icon />
            Excluir tarefa
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
