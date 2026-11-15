import { ColorField, Section, SliderField, TextField } from '@/components/AdminFields'
import { useBubbleThemeEditor } from '@/controllers/useBubbleThemeEditor'
import {
  addBubble,
  BACKDROP_RANGES,
  changeBubble,
  DISTANT_OPACITY_RANGE,
  DISTANT_SIZE_RANGE,
  GLASS_RANGES,
  HEADLINE_MAX_LENGTH,
  MAX_BUBBLES,
  MIN_BUBBLES,
  MOTION_RANGES,
  PLACEMENT_RANGES,
  removeBubble,
  STEP_SIZE_RANGE,
  TASK_NAME_MAX_LENGTH,
  TASK_STEP_MAX_LENGTH,
  TEXT_RANGES,
  type BackdropNumbers,
  type BubbleDefinition,
  type BubblePlacement,
  type BubbleTones,
  type GlassLook,
  type MotionSettings,
  type TextNumbers,
} from '@/models/bubbleTheme'

/** Which layout the place and size sliders change. The preview shows the same layout. */
export type EditedLayout = 'wide' | 'tall'

interface Control<Key extends string> {
  key: Key
  label: string
  hint?: string
}

const GLASS_CONTROLS: Control<keyof GlassLook>[] = [
  {
    key: 'density',
    label: 'Densidade da cor',
    hint: 'Mais alto: cor mais funda e o que aparece atrás fica mais tingido.',
  },
  {
    key: 'opacity',
    label: 'Opacidade no centro',
    hint: '0 deixa ver tudo através do vidro. 1 esconde o que está atrás.',
  },
  {
    key: 'edgeOpacity',
    label: 'Opacidade na borda',
    hint: 'Mais baixo: a borda fica fina e clara. Mais alto: borda firme.',
  },
  {
    key: 'innerGlow',
    label: 'Brilho interno',
    hint: 'Luz que atravessa o vidro e acende o lado oposto, como lâmpada de lava.',
  },
  { key: 'saturation', label: 'Saturação', hint: '1 mantém as cores como escolhidas.' },
]

const REFLECTION_CONTROLS: Control<keyof GlassLook>[] = [
  { key: 'rimShine', label: 'Borda brilhante' },
  { key: 'softHighlight', label: 'Brilho largo' },
  {
    key: 'sharpness',
    label: 'Nitidez do brilho largo',
    hint: '0 é acetinado. 1 tem contorno definido, de vidro molhado.',
  },
  { key: 'glint', label: 'Ponto de brilho' },
  { key: 'rimLight', label: 'Luz colorida na borda' },
]

const MOTION_CONTROLS: Control<keyof MotionSettings>[] = [
  { key: 'drift', label: 'Flutuação' },
  { key: 'ripple', label: 'Ondulação' },
  { key: 'colorFlow', label: 'Fluxo das cores' },
  { key: 'mouse', label: 'Reação ao mouse' },
]

const BACKDROP_CONTROLS: Control<keyof BackdropNumbers>[] = [
  { key: 'beamStrength', label: 'Força do facho de luz', hint: '0 desliga o facho.' },
  { key: 'metallic', label: 'Fosco ↔ metálico', hint: '0 é uma parede fosca. 1 é metal escovado.' },
  { key: 'bubbleGlow', label: 'Reflexo das bolhas no fundo', hint: 'Luz colorida que cada bolha joga na parede.' },
  { key: 'links', label: 'Fios entre as bolhas', hint: '0 remove os fios.' },
]

const PLACEMENT_CONTROLS: Control<keyof BubblePlacement>[] = [
  { key: 'x', label: 'Horizontal' },
  { key: 'y', label: 'Vertical' },
  { key: 'z', label: 'Profundidade', hint: 'Mais alto: mais perto, na frente das outras.' },
]

const TEXT_CONTROLS: Control<keyof TextNumbers>[] = [
  { key: 'size', label: 'Tamanho do texto', hint: '1 é o tamanho padrão.' },
  { key: 'weight', label: 'Peso das letras', hint: '400 é normal. 800 é extranegrito.' },
  { key: 'shadow', label: 'Sombra do texto', hint: 'Ajuda a ler sobre partes claras do vidro. 0 desliga.' },
  { key: 'seconds', label: 'Tempo de cada passo (segundos)', hint: 'Quanto um passo fica na bolha antes do próximo.' },
]

const TONE_CONTROLS: Control<keyof BubbleTones>[] = [
  { key: 'color', label: 'Principal' },
  { key: 'light', label: 'Clara' },
  { key: 'deep', label: 'Profunda' },
]

const DISTANT_LABELS = ['Cor da bolha 1', 'Cor da bolha 2', 'Cor da bolha 3']

interface BubbleCardProps {
  bubble: BubbleDefinition
  number: number
  layout: EditedLayout
  canRemove: boolean
}

function BubbleCard({ bubble, number, layout, canRemove }: BubbleCardProps) {
  const { change } = useBubbleThemeEditor()
  const update = (next: (current: BubbleDefinition) => BubbleDefinition) =>
    change((theme) => changeBubble(theme, bubble.id, next))

  return (
    <details className="group/card mt-2 rounded-xl border border-ink/12 bg-white/70">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 select-none focus-visible:outline-2 focus-visible:outline-brand/50 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(31_28_51/0.12)]"
          style={{
            background: `linear-gradient(135deg, ${bubble.tones.light}, ${bubble.tones.color} 50%, ${bubble.tones.deep})`,
          }}
        />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
          {bubble.task.name || `Bolha ${number}`}
        </span>
        <span className="text-[12px] text-ink/55 group-open/card:hidden">Editar</span>
        <span className="hidden text-[12px] text-ink/55 group-open/card:inline">Fechar</span>
      </summary>

      <div className="border-t border-ink/10 px-3 pt-3 pb-3">
        <p className="text-[12px] font-semibold tracking-wide text-ink/55 uppercase">Tamanho</p>
        <SliderField
          label={`Tamanho da bolha ${layout === 'wide' ? '(desktop)' : '(celular)'}`}
          value={bubble[layout].r}
          range={PLACEMENT_RANGES.r}
          onChange={(r) => update((current) => ({ ...current, [layout]: { ...current[layout], r } }))}
        />
        <SliderField
          label="Tamanho dos passos soltos"
          hint="Os balõezinhos que saem desta bolha quando você puxa."
          value={bubble.stepSize}
          range={STEP_SIZE_RANGE}
          onChange={(stepSize) => update((current) => ({ ...current, stepSize }))}
        />

        <p className="mt-4 text-[12px] font-semibold tracking-wide text-ink/55 uppercase">Cores</p>
        <div className="mt-1.5 flex gap-2">
          {TONE_CONTROLS.map((tone) => (
            <ColorField
              key={tone.key}
              label={tone.label}
              value={bubble.tones[tone.key]}
              onChange={(value) =>
                update((current) => ({ ...current, tones: { ...current.tones, [tone.key]: value } }))
              }
            />
          ))}
        </div>

        <p className="mt-4 text-[12px] font-semibold tracking-wide text-ink/55 uppercase">Tarefa</p>
        <TextField
          label="Nome da tarefa"
          value={bubble.task.name}
          maxLength={TASK_NAME_MAX_LENGTH}
          onChange={(name) => update((current) => ({ ...current, task: { ...current.task, name } }))}
        />
        {bubble.task.steps.map((step, index) => (
          <TextField
            key={index}
            label={`Passo ${index + 1}`}
            value={step}
            maxLength={TASK_STEP_MAX_LENGTH}
            onChange={(text) =>
              update((current) => {
                const steps: [string, string, string] = [...current.task.steps]
                steps[index] = text
                return { ...current, task: { ...current.task, steps } }
              })
            }
          />
        ))}

        <p className="mt-4 text-[12px] font-semibold tracking-wide text-ink/55 uppercase">
          Lugar {layout === 'wide' ? 'no desktop' : 'no celular'}
        </p>
        {PLACEMENT_CONTROLS.map((control) => (
          <SliderField
            key={control.key}
            label={control.label}
            hint={control.hint}
            value={bubble[layout][control.key]}
            range={PLACEMENT_RANGES[control.key]}
            onChange={(value) =>
              update((current) => ({ ...current, [layout]: { ...current[layout], [control.key]: value } }))
            }
          />
        ))}

        <button
          type="button"
          disabled={!canRemove}
          onClick={() => change((theme) => removeBubble(theme, bubble.id))}
          className="mt-3 h-9 rounded-lg border border-red-600/30 px-3 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:ring-3 focus-visible:ring-red-600/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          Remover bolha
        </button>
      </div>
    </details>
  )
}

/** All controls of the bubble theme. Each change goes to the draft, and the preview shows it at once. */
export function BubbleThemePanel({ layout }: { layout: EditedLayout }) {
  const { draft, change } = useBubbleThemeEditor()
  const full = draft.bubbles.length >= MAX_BUBBLES

  const glassSliders = (controls: Control<keyof GlassLook>[]) =>
    controls.map((control) => (
      <SliderField
        key={control.key}
        label={control.label}
        hint={control.hint}
        value={draft.glass[control.key]}
        range={GLASS_RANGES[control.key]}
        onChange={(value) => change((theme) => ({ ...theme, glass: { ...theme.glass, [control.key]: value } }))}
      />
    ))

  return (
    <div>
      <Section title="Vidro" defaultOpen>
        {glassSliders(GLASS_CONTROLS)}
      </Section>

      <Section title="Reflexos" defaultOpen>
        {glassSliders(REFLECTION_CONTROLS)}
      </Section>

      <Section title="Bolhas" note={`${draft.bubbles.length} de ${MAX_BUBBLES}`} defaultOpen>
        <p className="text-[12px] leading-snug text-ink/55">
          Cada bolha é uma tarefa de exemplo com 3 passos. Os 3 tons se misturam dentro do vidro.
        </p>
        {draft.bubbles.map((bubble, index) => (
          <BubbleCard
            key={bubble.id}
            bubble={bubble}
            number={index + 1}
            layout={layout}
            canRemove={draft.bubbles.length > MIN_BUBBLES}
          />
        ))}
        <button
          type="button"
          disabled={full}
          onClick={() => change(addBubble)}
          className="mt-3 h-10 w-full rounded-xl border border-dashed border-ink/25 text-[14px] font-medium text-ink transition-colors hover:border-brand hover:bg-brand/5 focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          {full ? `Máximo de ${MAX_BUBBLES} bolhas` : 'Adicionar bolha'}
        </button>
      </Section>

      <Section title="Texto">
        <TextField
          label="Frase de destaque da página"
          value={draft.text.headline}
          maxLength={HEADLINE_MAX_LENGTH}
          onChange={(headline) => change((theme) => ({ ...theme, text: { ...theme.text, headline } }))}
        />
        <p className="text-[12px] leading-snug text-ink/55">
          Fica no canto de cima, só em tela larga. Vazio esconde a frase. O texto de cada bolha se edita na própria
          bolha, em "Bolhas".
        </p>
        <div className="mt-3 flex">
          <ColorField
            label="Cor do texto das bolhas"
            value={draft.text.color}
            onChange={(color) => change((theme) => ({ ...theme, text: { ...theme.text, color } }))}
          />
        </div>
        {TEXT_CONTROLS.map((control) => (
          <SliderField
            key={control.key}
            label={control.label}
            hint={control.hint}
            value={draft.text[control.key]}
            range={TEXT_RANGES[control.key]}
            onChange={(value) => change((theme) => ({ ...theme, text: { ...theme.text, [control.key]: value } }))}
          />
        ))}
      </Section>

      <Section title="Fundo e fios">
        <div className="flex">
          <ColorField
            label="Cor do facho de luz"
            value={draft.backdrop.beamColor}
            onChange={(beamColor) => change((theme) => ({ ...theme, backdrop: { ...theme.backdrop, beamColor } }))}
          />
        </div>
        {BACKDROP_CONTROLS.map((control) => (
          <SliderField
            key={control.key}
            label={control.label}
            hint={control.hint}
            value={draft.backdrop[control.key]}
            range={BACKDROP_RANGES[control.key]}
            onChange={(value) =>
              change((theme) => ({ ...theme, backdrop: { ...theme.backdrop, [control.key]: value } }))
            }
          />
        ))}
      </Section>

      <Section title="Bolhas ao fundo">
        <p className="text-[12px] leading-snug text-ink/55">As 3 bolhas desfocadas, que dão profundidade.</p>
        <SliderField
          label="Opacidade"
          value={draft.distant.opacity}
          range={DISTANT_OPACITY_RANGE}
          onChange={(opacity) => change((theme) => ({ ...theme, distant: { ...theme.distant, opacity } }))}
        />
        <div className="mt-1 flex gap-2">
          {draft.distant.colors.map((color, index) => (
            <ColorField
              key={index}
              label={DISTANT_LABELS[index]}
              value={color}
              onChange={(value) =>
                change((theme) => {
                  const colors: [string, string, string] = [...theme.distant.colors]
                  colors[index] = value
                  return { ...theme, distant: { ...theme.distant, colors } }
                })
              }
            />
          ))}
        </div>
        {draft.distant.sizes.map((size, index) => (
          <SliderField
            key={index}
            label={`Tamanho da bolha ${index + 1}`}
            value={size}
            range={DISTANT_SIZE_RANGE}
            onChange={(value) =>
              change((theme) => {
                const sizes: [number, number, number] = [...theme.distant.sizes]
                sizes[index] = value
                return { ...theme, distant: { ...theme.distant, sizes } }
              })
            }
          />
        ))}
      </Section>

      <Section title="Movimento">
        <p className="text-[12px] leading-snug text-ink/55">1 é o movimento padrão. 0 desliga.</p>
        {MOTION_CONTROLS.map((control) => (
          <SliderField
            key={control.key}
            label={control.label}
            value={draft.motion[control.key]}
            range={MOTION_RANGES[control.key]}
            onChange={(value) => change((theme) => ({ ...theme, motion: { ...theme.motion, [control.key]: value } }))}
          />
        ))}
      </Section>
    </div>
  )
}
