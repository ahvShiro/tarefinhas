import { useState, type FormEvent } from 'react'
import { BookmarkPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateMainTaskResult } from '@/controllers/tasksContext'
import { useTaskTemplates } from '@/controllers/useTaskTemplates'
import {
  DEFAULT_EFFORT,
  EFFORT_LABELS,
  EFFORTS,
  MAX_DEADLINE_DAYS,
  MIN_DEADLINE_DAYS,
  type Effort,
} from '@/models/mainTask'
import type { MainTaskInput, MainTaskInputErrors } from '@/models/mainTaskInput'
import { templateFrom, type TaskTemplate } from '@/models/taskTemplate'
import { StepListEditor } from './StepListEditor'
import { newStep, type StepField } from './stepFields'
import { TemplatePicker } from './TemplatePicker'

interface MainTaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: MainTaskInput) => Promise<CreateMainTaskResult>
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  )
}

export function MainTaskFormDialog({ open, onOpenChange, onSubmit }: MainTaskFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<StepField[]>(() => [newStep()])
  const [deadlineDays, setDeadlineDays] = useState('')
  const [effort, setEffort] = useState<Effort>(DEFAULT_EFFORT)
  const [errors, setErrors] = useState<MainTaskInputErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const { templates, save: saveTemplate, remove: removeTemplate } = useTaskTemplates()
  // Answer to "Salvar como modelo", shown for a moment under the buttons.
  const [templateNote, setTemplateNote] = useState<{ text: string; error: boolean } | null>(null)

  function reset() {
    setName('')
    setDescription('')
    setSteps([newStep()])
    setDeadlineDays('')
    setEffort(DEFAULT_EFFORT)
    setErrors({})
    setTemplateNote(null)
  }

  function applyTemplate(template: TaskTemplate) {
    setName(template.name)
    setDescription(template.description)
    setSteps(template.steps.map((text) => newStep(text)))
    setDeadlineDays(template.deadlineDays === undefined ? '' : String(template.deadlineDays))
    setEffort(template.effort)
    setErrors({})
    setTemplateNote(null)
  }

  function saveAsTemplate() {
    const template = templateFrom(
      { name, description, steps: steps.map((step) => step.text), effort, deadlineDays },
      crypto.randomUUID(),
      new Date().toISOString(),
    )
    if (!template) {
      setTemplateNote({ text: 'Para salvar um modelo, escreva o nome e pelo menos 1 passo.', error: true })
      return
    }
    const stored = saveTemplate(template)
    setTemplateNote(
      stored
        ? { text: `Modelo “${template.name}” salvo neste navegador.`, error: false }
        : { text: 'O navegador não deixou guardar o modelo (espaço cheio ou bloqueado).', error: true },
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await onSubmit({ name, description, steps: steps.map((step) => step.text), deadlineDays, effort })
      if (!result.ok) {
        setErrors(result.errors)
        return
      }
      reset()
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Cada passo vira uma miniTask no banco de tarefas.</DialogDescription>
        </DialogHeader>

        <div className="-mt-1">
          <TemplatePicker templates={templates} onUse={applyTemplate} onRemove={removeTemplate} />
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="main-task-name">Nome</Label>
            <Input
              id="main-task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby="main-task-name-error"
            />
            <FieldError id="main-task-name-error" message={errors.name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="main-task-description">Descrição</Label>
            <Textarea
              id="main-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby="main-task-description-error"
            />
            <FieldError id="main-task-description-error" message={errors.description} />
          </div>

          <fieldset className="flex flex-col gap-1.5" aria-describedby="main-task-steps-error">
            <legend className="mb-1.5 text-sm font-medium">Passos</legend>
            <StepListEditor steps={steps} onChange={setSteps} invalid={Boolean(errors.steps)} />
            <FieldError id="main-task-steps-error" message={errors.steps} />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Esforço</legend>
            <div className="flex gap-2">
              {EFFORTS.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={effort === option ? 'default' : 'outline'}
                  aria-pressed={effort === option}
                  onClick={() => setEffort(option)}
                >
                  {EFFORT_LABELS[option]}
                </Button>
              ))}
            </div>
            <FieldError id="main-task-effort-error" message={errors.effort} />
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="main-task-deadline">Prazo em dias (opcional)</Label>
            <Input
              id="main-task-deadline"
              type="number"
              inputMode="numeric"
              min={MIN_DEADLINE_DAYS}
              max={MAX_DEADLINE_DAYS}
              step={1}
              className="w-28"
              value={deadlineDays}
              onChange={(event) => setDeadlineDays(event.target.value)}
              aria-invalid={Boolean(errors.deadlineDays)}
              aria-describedby="main-task-deadline-error"
            />
            <FieldError id="main-task-deadline-error" message={errors.deadlineDays} />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={saveAsTemplate}>
              <BookmarkPlusIcon />
              Salvar como modelo
            </Button>
            <Button type="submit" disabled={submitting}>
              Salvar
            </Button>
          </DialogFooter>
          {templateNote && (
            <p role="status" className={templateNote.error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
              {templateNote.text}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
