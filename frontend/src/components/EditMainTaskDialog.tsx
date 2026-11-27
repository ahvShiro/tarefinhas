import { useState, type FormEvent } from 'react'
import { InfoIcon } from 'lucide-react'
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
import type { EditMainTaskResult } from '@/controllers/tasksContext'
import { EFFORT_LABELS, EFFORTS, MAX_DEADLINE_DAYS, MIN_DEADLINE_DAYS, type Effort, type MainTask } from '@/models/mainTask'
import type { MainTaskEditInput, MainTaskInputErrors } from '@/models/mainTaskInput'
import type { MiniTask } from '@/models/miniTask'

interface EditMainTaskDialogProps {
  /** The MainTask to edit. Undefined closes the dialog. */
  mainTask?: MainTask
  /** All its steps, done or not. */
  steps: MiniTask[]
  onSubmit: (mainTaskId: string, input: MainTaskEditInput) => Promise<EditMainTaskResult>
  onClose: () => void
}

/** "Editar tarefa": name, description, step texts, effort and deadline of a MainTask. */
export function EditMainTaskDialog({ mainTask, steps, onSubmit, onClose }: EditMainTaskDialogProps) {
  return (
    <Dialog open={mainTask !== undefined} onOpenChange={(open) => !open && onClose()}>
      {/* The form mounts only while open, so it starts from the saved values each time. */}
      {mainTask && <EditForm mainTask={mainTask} steps={steps} onSubmit={onSubmit} onClose={onClose} />}
    </Dialog>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  )
}

function EditForm({ mainTask, steps, onSubmit, onClose }: Required<Omit<EditMainTaskDialogProps, 'mainTask'>> & { mainTask: MainTask }) {
  const ordered = [...steps].sort((a, b) => a.position - b.position)
  const [name, setName] = useState(mainTask.name)
  const [description, setDescription] = useState(mainTask.description)
  const [stepTexts, setStepTexts] = useState(() => ordered.map((step) => ({ id: step.id, text: step.text })))
  const [deadlineDays, setDeadlineDays] = useState(mainTask.deadlineDays === undefined ? '' : String(mainTask.deadlineDays))
  const [effort, setEffort] = useState<Effort>(mainTask.effort)
  const [errors, setErrors] = useState<MainTaskInputErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const createdOn = new Date(mainTask.createdAt).toLocaleDateString('pt-BR')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await onSubmit(mainTask.id, { name, description, deadlineDays, effort, steps: stepTexts })
      if (!result.ok) {
        setErrors(result.errors)
        return
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: mainTask.color }} />
        <DialogTitle>Editar tarefa</DialogTitle>
        <DialogDescription>Para tirar um passo, use “Deletar” no menu dele. Para somar um, “Novo passo”.</DialogDescription>
      </DialogHeader>

      <p className="flex items-start gap-2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-950 [&_svg]:mt-px [&_svg]:size-4 [&_svg]:shrink-0">
        <InfoIcon />
        Por enquanto a edição vale até recarregar a página: o servidor ainda não salva edições.
      </p>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-task-name">Nome</Label>
          <Input
            id="edit-task-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby="edit-task-name-error"
          />
          <FieldError id="edit-task-name-error" message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-task-description">Descrição</Label>
          <Textarea
            id="edit-task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby="edit-task-description-error"
          />
          <FieldError id="edit-task-description-error" message={errors.description} />
        </div>

        <fieldset className="flex flex-col gap-1.5" aria-describedby="edit-task-steps-error">
          <legend className="mb-1.5 text-sm font-medium">Passos</legend>
          {stepTexts.map((step, index) => {
            const done = ordered[index]?.done
            return (
              <div key={step.id} className="flex items-center gap-2">
                <span className="w-5 text-right text-xs text-muted-foreground">{index + 1}.</span>
                <Input
                  value={step.text}
                  onChange={(event) =>
                    setStepTexts((current) =>
                      current.map((item) => (item.id === step.id ? { ...item, text: event.target.value } : item)),
                    )
                  }
                  aria-label={`Passo ${index + 1}${done ? ' (feito)' : ''}`}
                  aria-invalid={Boolean(errors.steps) && step.text.trim() === ''}
                />
                {done && <span className="shrink-0 text-xs text-muted-foreground">feito</span>}
              </div>
            )
          })}
          <FieldError id="edit-task-steps-error" message={errors.steps} />
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
          <FieldError id="edit-task-effort-error" message={errors.effort} />
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-task-deadline">Prazo em dias (opcional)</Label>
          <Input
            id="edit-task-deadline"
            type="number"
            inputMode="numeric"
            min={MIN_DEADLINE_DAYS}
            max={MAX_DEADLINE_DAYS}
            step={1}
            className="w-28"
            value={deadlineDays}
            onChange={(event) => setDeadlineDays(event.target.value)}
            aria-invalid={Boolean(errors.deadlineDays)}
            aria-describedby="edit-task-deadline-help edit-task-deadline-error"
          />
          <p id="edit-task-deadline-help" className="text-xs text-muted-foreground">
            Conta a partir do dia em que a tarefa foi criada ({createdOn}).
          </p>
          <FieldError id="edit-task-deadline-error" message={errors.deadlineDays} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
