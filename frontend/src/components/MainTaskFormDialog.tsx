import { useState, type FormEvent } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
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
import { MAX_DEADLINE_DAYS, MIN_DEADLINE_DAYS } from '@/models/mainTask'
import type { MainTaskInput, MainTaskInputErrors } from '@/models/mainTaskInput'

interface StepField {
  id: string
  text: string
}

function newStep(): StepField {
  return { id: crypto.randomUUID(), text: '' }
}

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
  const [errors, setErrors] = useState<MainTaskInputErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName('')
    setDescription('')
    setSteps([newStep()])
    setDeadlineDays('')
    setErrors({})
  }

  function updateStep(id: string, text: string) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, text } : step)))
  }

  function removeStep(id: string) {
    setSteps((current) => (current.length > 1 ? current.filter((step) => step.id !== id) : [newStep()]))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await onSubmit({ name, description, steps: steps.map((step) => step.text), deadlineDays })
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Cada passo vira uma miniTask no banco de tarefas.</DialogDescription>
        </DialogHeader>

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
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <span className="w-5 text-right text-xs text-muted-foreground">{index + 1}.</span>
                <Input
                  value={step.text}
                  onChange={(event) => updateStep(step.id, event.target.value)}
                  aria-label={`Passo ${index + 1}`}
                  aria-invalid={Boolean(errors.steps)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeStep(step.id)}
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
              onClick={() => setSteps((current) => [...current, newStep()])}
            >
              <PlusIcon />
              Adicionar passo
            </Button>
            <FieldError id="main-task-steps-error" message={errors.steps} />
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

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
