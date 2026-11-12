import { useEffect, useMemo, useRef } from 'react'
import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MainTask } from '@/models/mainTask'
import type { MiniTask } from '@/models/miniTask'
import { dayDropId, slotDropId } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'
import { FocusSlot } from './FocusSlot'

const DAY_COUNT = 7
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const FIRST_VISIBLE_HOUR = 8

interface FocusAreaProps {
  miniTasks: MiniTask[]
  getMainTask: (id: string) => MainTask | undefined
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function FocusArea({ miniTasks, getMainTask, onOpen, onToggleDone }: FocusAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hourRowRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const today = startOfToday()
    return Array.from({ length: DAY_COUNT }, (_, offset) => {
      const date = addDays(today, offset)
      return { key: format(date, 'yyyy-MM-dd'), label: format(date, 'EEE dd/MM', { locale: ptBR }) }
    })
  }, [])

  // Key: `${date}` for slots without time, `${date} ${HH:00}` for hour slots.
  const bySlot = useMemo(() => {
    const map = new Map<string, MiniTask[]>()
    for (const miniTask of miniTasks) {
      if (!miniTask.scheduledDate) continue
      const key = miniTask.scheduledTime
        ? `${miniTask.scheduledDate} ${miniTask.scheduledTime}`
        : miniTask.scheduledDate
      map.set(key, [...(map.get(key) ?? []), miniTask])
    }
    return map
  }, [miniTasks])

  useEffect(() => {
    if (scrollRef.current && hourRowRef.current) {
      scrollRef.current.scrollTop = hourRowRef.current.offsetTop - 80
    }
  }, [])

  const renderMiniTasks = (key: string) =>
    (bySlot.get(key) ?? []).map((miniTask) => {
      const mainTask = getMainTask(miniTask.mainTaskId)
      if (!mainTask) return null
      return (
        <DraggableMiniTask
          key={miniTask.id}
          miniTask={miniTask}
          color={mainTask.color}
          onOpen={onOpen}
          onToggleDone={onToggleDone}
          compact
        />
      )
    })

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b px-4 py-2 font-heading font-medium">Em foco</h2>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-max grid-cols-[3.5rem_repeat(7,minmax(8rem,1fr))]">
          <div className="sticky top-0 left-0 z-20 border-b bg-card" />
          {days.map((day) => (
            <div
              key={day.key}
              className="sticky top-0 z-10 border-b border-l bg-card px-2 py-1 text-center text-xs font-medium capitalize"
            >
              {day.label}
            </div>
          ))}

          <div className="sticky left-0 z-10 border-b bg-card px-1 py-2 text-[10px] text-muted-foreground">
            Sem hora
          </div>
          {days.map((day) => (
            <FocusSlot
              key={day.key}
              dropId={dayDropId(day.key)}
              label={`${day.label}, sem hora`}
              className="min-h-14 border-l bg-muted/40"
            >
              {renderMiniTasks(day.key)}
            </FocusSlot>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div
                ref={hour === FIRST_VISIBLE_HOUR ? hourRowRef : undefined}
                className="sticky left-0 z-10 border-b bg-card px-1 py-1 text-[10px] text-muted-foreground"
              >
                {hourLabel(hour)}
              </div>
              {days.map((day) => (
                <FocusSlot
                  key={day.key}
                  dropId={slotDropId(day.key, hour)}
                  label={`${day.label}, ${hourLabel(hour)}`}
                  className="border-l"
                >
                  {renderMiniTasks(`${day.key} ${hourLabel(hour)}`)}
                </FocusSlot>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
