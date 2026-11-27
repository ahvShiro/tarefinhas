import { useState } from 'react'
import { Popover } from 'radix-ui'
import { ChevronDownIcon, LayoutTemplateIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EFFORT_LABELS } from '@/models/mainTask'
import type { TaskTemplate } from '@/models/taskTemplate'

/** "Usar modelo ▾": the saved templates; a click fills the form, the bin deletes one (second click confirms). */
export function TemplatePicker({
  templates,
  onUse,
  onRemove,
}: {
  templates: TaskTemplate[]
  onUse: (template: TaskTemplate) => void
  onRemove: (templateId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setConfirmingId(null)
      }}
    >
      <Popover.Trigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={templates.length === 0}>
          <LayoutTemplateIcon />
          {templates.length === 0 ? 'Nenhum modelo' : `Usar modelo (${templates.length})`}
          {templates.length > 0 && <ChevronDownIcon />}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 flex max-h-80 w-80 flex-col overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <ul className="flex flex-col">
            {templates.map((template) => (
              <li key={template.id} className="flex items-center gap-1 rounded-md hover:bg-accent">
                <button
                  type="button"
                  onClick={() => {
                    onUse(template)
                    setOpen(false)
                  }}
                  className="min-w-0 flex-1 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-sm font-medium">{template.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {template.steps.length === 1 ? '1 passo' : `${template.steps.length} passos`} ·{' '}
                    {EFFORT_LABELS[template.effort]}
                    {template.deadlineDays !== undefined && ` · ${template.deadlineDays} dia(s)`}
                  </span>
                </button>
                {confirmingId === template.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onRemove(template.id)
                      setConfirmingId(null)
                    }}
                  >
                    Apagar?
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmingId(template.id)}
                    aria-label={`Apagar o modelo “${template.name}”`}
                    title="Apagar modelo"
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
