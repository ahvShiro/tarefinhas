import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_FOCUS_DAYS, MAX_FOCUS_DAYS, MIN_FOCUS_DAYS, parseFocusDays } from '@/models/focus'
import type { MainTask } from '@/models/mainTask'
import { hourSlotOf, type MiniTask } from '@/models/miniTask'
import { dayDropId, slotDropId } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'
import { FocusSlot } from './FocusSlot'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const FIRST_VISIBLE_HOUR = 8

interface FocusAreaProps {
  miniTasks: MiniTask[]
  getMainTask: (id: string) => MainTask | undefined
  onOpen: (miniTaskId: string) => void
  onToggleDone: (miniTaskId: string) => void
  /** Number of days at the start. The panel can be closed and opened, so it must start with the last choice. */
  initialDayCount?: number
  /** Called when the person sets a new number of days in the field. */
  onDayCountChange?: (dayCount: number) => void
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function FocusArea({
  miniTasks,
  getMainTask,
  onOpen,
  onToggleDone,
  initialDayCount = DEFAULT_FOCUS_DAYS,
  onDayCountChange,
}: FocusAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hourRowRef = useRef<HTMLDivElement>(null)
  const [dayCount, setDayCount] = useState(initialDayCount)
  // What the field shows while typing; dayCount changes only on a valid value.
  const [dayCountDraft, setDayCountDraft] = useState(String(initialDayCount))

  const days = useMemo(() => {
    const today = startOfToday()
    return Array.from({ length: dayCount }, (_, offset) => {
      const date = addDays(today, offset)
      return { key: format(date, 'yyyy-MM-dd'), label: format(date, 'EEE dd/MM', { locale: ptBR }) }
    })
  }, [dayCount])

  // Key: `${date}` for slots without time, `${date} ${HH:00}` for hour slots (an exact time sits in its hour).
  const bySlot = useMemo(() => {
    const map = new Map<string, MiniTask[]>()
    for (const miniTask of miniTasks) {
      if (!miniTask.scheduledDate) continue
      // An exact time (13:23) sits in the slot of its hour (13:00).
      const key = miniTask.scheduledTime
        ? `${miniTask.scheduledDate} ${hourSlotOf(miniTask.scheduledTime)}`
        : miniTask.scheduledDate
      map.set(key, [...(map.get(key) ?? []), miniTask])
    }
    // Inside a slot, by exact time.
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduledTime ?? '').localeCompare(b.scheduledTime ?? '') || a.position - b.position)
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <h2 className="font-heading font-medium">Em foco</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="focus-days" className="text-xs font-normal text-muted-foreground">
            Dias
          </Label>
          <Input
            id="focus-days"
            type="number"
            inputMode="numeric"
            min={MIN_FOCUS_DAYS}
            max={MAX_FOCUS_DAYS}
            step={1}
            value={dayCountDraft}
            onChange={(event) => {
              setDayCountDraft(event.target.value)
              const parsed = parseFocusDays(event.target.value)
              if (parsed !== null) {
                setDayCount(parsed)
                onDayCountChange?.(parsed)
              }
            }}
            onBlur={() => setDayCountDraft(String(dayCount))}
            className="h-7 w-14 px-2 text-sm"
          />
        </div>
      </header>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `3.5rem repeat(${dayCount}, minmax(8rem, 1fr))` }}
        >
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
