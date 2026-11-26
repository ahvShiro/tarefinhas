import { useContext, type ReactNode } from 'react'
import { ContextMenu } from 'radix-ui'
import { ChevronRightIcon, ClockIcon, CopyIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { MiniTaskMenuContext } from '@/controllers/miniTaskMenuContext'
import { cn } from '@/lib/utils'

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4'

const CONTENT_CLASS =
  'z-50 min-w-44 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'

/** Right-click (or long press) menu of a miniTask card: copy, new step and delete. */
export function MiniTaskContextMenu({
  miniTaskId,
  scheduled,
  children,
}: {
  miniTaskId: string
  /** True when the miniTask is in the plan of a day. Only then can it have a time. */
  scheduled: boolean
  children: ReactNode
}) {
  const actions = useContext(MiniTaskMenuContext)
  if (!actions) return children

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={CONTENT_CLASS}>
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={cn(ITEM_CLASS, 'data-[state=open]:bg-accent')}>
              <CopyIcon />
              Copiar para
              <ChevronRightIcon className="ml-auto" />
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={CONTENT_CLASS} sideOffset={4}>
                <ContextMenu.Item className={ITEM_CLASS} onSelect={() => actions.onCopy(miniTaskId)}>
                  Banco de tarefas
                </ContextMenu.Item>
                <ContextMenu.Separator className="my-1 h-px bg-border" />
                {actions.days.map((day) => (
                  <ContextMenu.Item
                    key={day.date}
                    className={ITEM_CLASS}
                    onSelect={() => actions.onCopy(miniTaskId, day.date)}
                  >
                    {day.label}
                  </ContextMenu.Item>
                ))}
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
          {scheduled && (
            <ContextMenu.Item className={ITEM_CLASS} onSelect={() => actions.onSetTime(miniTaskId)}>
              <ClockIcon />
              Definir hora…
            </ContextMenu.Item>
          )}
          <ContextMenu.Item className={ITEM_CLASS} onSelect={() => actions.onAddStep(miniTaskId)}>
            <PlusIcon />
            Novo passo
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item className={cn(ITEM_CLASS, 'text-destructive')} onSelect={() => actions.onDelete(miniTaskId)}>
            <Trash2Icon />
            Deletar
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
