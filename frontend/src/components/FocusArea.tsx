import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, Maximize2Icon, Minimize2Icon } from 'lucide-react'
import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_FOCUS_DAYS,
  MAX_FOCUS_DAYS,
  MIN_FOCUS_DAYS,
  deadlineHintOf,
  nowLinePosition,
  parseFocusDays,
} from '@/models/focus'
import { getDeadline, type MainTask } from '@/models/mainTask'
import { hourSlotOf, type MiniTask } from '@/models/miniTask'
import { dayDropId, slotDropId } from '@/views/dropTargets'
import { DraggableMiniTask } from './DraggableMiniTask'
import { cn } from '@/lib/utils'
import { FocusSlot } from './FocusSlot'

// The day starts at 06:00. 00:00 to 05:00 ("Madrugada") fold into one row that opens on a click.
const DAY_START_HOUR = 6
const EARLY_HOURS = Array.from({ length: DAY_START_HOUR }, (_, hour) => hour)
const DAY_HOURS = Array.from({ length: 24 - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index)
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
  /** How many photos a step has (the photo mark on the card). */
  photoCountOf?: (miniTaskId: string) => number
  /** True while "Em foco" fills the screen (the task bank is hidden). */
  expanded?: boolean
  onToggleExpanded?: () => void
}

/** The current time, again every 30 seconds, for the "now" line and the deadline warnings. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
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
  photoCountOf,
  expanded = false,
  onToggleExpanded,
}: FocusAreaProps) {
  const now = useNow()
  const todayKey = format(now, 'yyyy-MM-dd')
  const nowLine = nowLinePosition(now)
  // Opens by itself when the panel is opened during the early hours, so the "now" line shows.
  const [earlyOpen, setEarlyOpen] = useState(() => new Date().getHours() < DAY_START_HOUR)
  // The panel opens on the morning, or on the hour before now when the day is past it (in the early hours, on now).
  const scrollHour =
    nowLine.hour < DAY_START_HOUR ? Math.max(0, nowLine.hour - 1) : Math.max(FIRST_VISIBLE_HOUR, nowLine.hour - 1)
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
    // todayKey moves the days on at midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayCount, todayKey])

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

  /** Steps planned for 00:00 to 05:00 of a day, shown on the folded row. */
  const earlyCount = (dayKey: string) =>
    EARLY_HOURS.reduce((total, hour) => total + (bySlot.get(`${dayKey} ${hourLabel(hour)}`)?.length ?? 0), 0)

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
          deadline={deadlineHintOf(getDeadline(mainTask), now)}
          photoCount={photoCountOf?.(miniTask.id)}
          compact
        />
      )
    })

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <header className="border-b px-4 py-2">
        <div className="flex items-center justify-between gap-3">
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
            {onToggleExpanded && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleExpanded}
                aria-pressed={expanded}
                aria-label={expanded ? 'Voltar ao tamanho normal' : 'Encher a tela com o Em foco'}
                title={expanded ? 'Voltar ao tamanho normal' : 'Encher a tela'}
              >
                {expanded ? <Minimize2Icon /> : <Maximize2Icon />}
              </Button>
            )}
          </div>
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

          <div className="sticky left-0 z-10 border-b bg-card">
            <button
              type="button"
              onClick={() => setEarlyOpen((open) => !open)}
              aria-expanded={earlyOpen}
              className="flex w-full items-center gap-0.5 px-1 py-1 text-left text-[10px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3"
              title={earlyOpen ? 'Recolher 00:00 a 05:00' : 'Mostrar 00:00 a 05:00'}
            >
              Madrugada
              {earlyOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
          </div>
          {days.map((day) => {
            const count = earlyCount(day.key)
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setEarlyOpen((open) => !open)}
                aria-label={`${day.label}, madrugada: ${count === 1 ? '1 passo' : `${count} passos`}. ${earlyOpen ? 'Recolher' : 'Mostrar'}`}
                className="border-b border-l bg-muted/40 px-2 py-1 text-left text-[10px] text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {count > 0 && (
                  <span className="rounded-full bg-foreground/10 px-1.5 py-px font-semibold text-foreground">
                    {count === 1 ? '1 passo' : `${count} passos`}
                  </span>
                )}
              </button>
            )
          })}

          {(earlyOpen ? [...EARLY_HOURS, ...DAY_HOURS] : DAY_HOURS).map((hour) => (
            <div key={hour} className="contents">
              <div
                ref={hour === scrollHour ? hourRowRef : undefined}
                className={cn(
                  'sticky left-0 z-10 border-b bg-card px-1 py-1 text-[10px] text-muted-foreground',
                  hour < DAY_START_HOUR && 'bg-muted/60',
                  hour === nowLine.hour && 'font-semibold text-red-600',
                )}
              >
                {hourLabel(hour)}
              </div>
              {days.map((day) => (
                <FocusSlot
                  key={day.key}
                  dropId={slotDropId(day.key, hour)}
                  label={`${day.label}, ${hourLabel(hour)}`}
                  className={cn('border-l', hour < DAY_START_HOUR && 'bg-muted/30')}
                  nowFraction={day.key === todayKey && hour === nowLine.hour ? nowLine.fraction : undefined}
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
