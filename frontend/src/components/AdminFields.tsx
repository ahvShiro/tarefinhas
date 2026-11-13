import { useId, useState, type ReactNode } from 'react'
import type { NumberRange } from '@/models/bubbleTheme'

// Controls of the admin page: a slider, a color and a text field, and a section that opens and closes.

const NUMBER_FORMAT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })

interface SliderFieldProps {
  label: string
  hint?: string
  value: number
  range: NumberRange
  onChange: (value: number) => void
}

export function SliderField({ label, hint, value, range, onChange }: SliderFieldProps) {
  const id = useId()
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <output htmlFor={id} className="text-[12px] text-ink/60 tabular-nums">
          {NUMBER_FORMAT.format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 block h-5 w-full cursor-pointer touch-manipulation accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/50"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-[12px] leading-snug text-ink/55">
          {hint}
        </p>
      )}
    </div>
  )
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId()
  // Text typed in the code field. It applies while `value` is the color it was typed for (or not valid yet).
  const [typed, setTyped] = useState({ text: value, color: value })
  const text = typed.color === value ? typed.text : value
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="block text-[12px] font-medium text-ink/70">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white p-1 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-7 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <input
          type="text"
          aria-label={`${label}, código da cor`}
          value={text}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          onChange={(event) => {
            const next = event.target.value.trim()
            const valid = HEX_COLOR.test(next)
            setTyped({ text: next, color: valid ? next.toLowerCase() : value })
            if (valid) onChange(next.toLowerCase())
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[12px] text-ink outline-none"
        />
      </div>
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  maxLength: number
  onChange: (value: string) => void
}

export function TextField({ label, value, maxLength, onChange }: TextFieldProps) {
  const id = useId()
  return (
    <div className="py-1.5">
      <label htmlFor={id} className="block text-[12px] font-medium text-ink/70">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-ink/15 bg-white px-2.5 text-[14px] text-ink outline-none focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
      />
    </div>
  )
}

interface SectionProps {
  title: string
  note?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function Section({ title, note, defaultOpen = false, children }: SectionProps) {
  return (
    <details open={defaultOpen} className="group border-b border-ink/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 select-none hover:bg-ink/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand/50 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</span>
        <span className="flex items-center gap-2 text-[12px] text-ink/55">
          {note}
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-3 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          >
            <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <div className="px-5 pb-4">{children}</div>
    </details>
  )
}
