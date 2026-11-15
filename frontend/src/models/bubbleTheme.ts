// Theme of the homepage bubbles: the look of the glass, the motion and the bubbles.
// The admin page (/admin, development only) edits a theme and saves it as the project default
// in src/config/bubble-theme.json.
// This file uses no browser API and no Node API: the dev server validates a theme with it too.

export const BUBBLE_THEME_VERSION = 1

/** Limits of a number setting. The admin sliders and the validation use the same limits. */
export interface NumberRange {
  min: number
  max: number
  step: number
}

/** Look of the liquid glass. All bubbles have the same look. */
export interface GlassLook {
  /** How much color the glass gives to what shows through it, and how deep the color of the body is. 0 is clear. */
  density: number
  /** How much the glass body hides what is behind it, in the middle of the bubble. 0 is see-through, 1 hides all. */
  opacity: number
  /** The same as `opacity`, at the rim of the bubble. */
  edgeOpacity: number
  /** Light that crosses the glass and glows on the far side, as in a lava lamp. 0 is off. */
  innerGlow: number
  /** Color strength. 1 keeps the colors as picked. */
  saturation: number
  /** Bright line on the rim. */
  rimShine: number
  /** Broad highlight at the upper left. */
  softHighlight: number
  /** How defined the broad highlight is. 0 is soft (satin), 1 has a clear outline (wet). */
  sharpness: number
  /** Small bright point. */
  glint: number
  /** Colored light on the lower right rim. */
  rimLight: number
}

export const GLASS_RANGES: Record<keyof GlassLook, NumberRange> = {
  density: { min: 0, max: 4, step: 0.05 },
  opacity: { min: 0, max: 1, step: 0.01 },
  edgeOpacity: { min: 0, max: 1, step: 0.01 },
  innerGlow: { min: 0, max: 1.5, step: 0.01 },
  saturation: { min: 0.5, max: 2, step: 0.01 },
  rimShine: { min: 0, max: 1.5, step: 0.01 },
  softHighlight: { min: 0, max: 1.5, step: 0.01 },
  sharpness: { min: 0, max: 1, step: 0.01 },
  glint: { min: 0, max: 1.5, step: 0.01 },
  rimLight: { min: 0, max: 1.5, step: 0.01 },
}

/** Motion of the bubbles. Each value multiplies the standard motion: 1 is standard, 0 is off. */
export interface MotionSettings {
  /** Speed of the slow drift. */
  drift: number
  /** How much the surface ripples. */
  ripple: number
  /** Speed of the color tones that flow inside the glass. */
  colorFlow: number
  /** How much the bubbles move away from the mouse. */
  mouse: number
}

export const MOTION_RANGES: Record<keyof MotionSettings, NumberRange> = {
  drift: { min: 0, max: 3, step: 0.05 },
  ripple: { min: 0, max: 2.5, step: 0.05 },
  colorFlow: { min: 0, max: 4, step: 0.05 },
  mouse: { min: 0, max: 2.5, step: 0.05 },
}

/** The out-of-focus bubbles far behind the glass ones. Their places and sizes are in the scene code. */
export interface DistantBubbles {
  opacity: number
  colors: [string, string, string]
  /** Size of each one of the 3 bubbles. It multiplies the standard size. */
  sizes: [number, number, number]
}

export const DISTANT_OPACITY_RANGE: NumberRange = { min: 0, max: 1, step: 0.01 }

/** Size of each out-of-focus bubble. It multiplies the standard size: 1 is standard. */
export const DISTANT_SIZE_RANGE: NumberRange = { min: 0.4, max: 2.5, step: 0.05 }

/** Size of the steps that a bubble releases. It multiplies the standard size: 1 is standard. */
export const STEP_SIZE_RANGE: NumberRange = { min: 0.5, max: 2, step: 0.05 }

/** The text inside the bubbles, and the headline of the homepage. */
export interface TextSettings {
  /** Size of the text inside the bubbles. It multiplies the standard size: 1 is standard. */
  size: number
  /** Weight of the letters: 400 is regular, 600 is semibold, 800 is extra bold. */
  weight: number
  /** Strength of the soft shadow that keeps the text readable on light parts of the glass. 0 is off. */
  shadow: number
  /** How many seconds each step stays on show before the next one. */
  seconds: number
  /** Color of the text inside the bubbles. */
  color: string
  /** Headline in the upper right corner of wide screens. Empty hides it. */
  headline: string
}

export type TextNumbers = Pick<TextSettings, 'size' | 'weight' | 'shadow' | 'seconds'>

export const TEXT_RANGES: Record<keyof TextNumbers, NumberRange> = {
  size: { min: 0.7, max: 1.6, step: 0.05 },
  weight: { min: 400, max: 800, step: 50 },
  shadow: { min: 0, max: 1.5, step: 0.05 },
  seconds: { min: 2, max: 12, step: 0.5 },
}

export const HEADLINE_MAX_LENGTH = 60

/** The number settings of the background wall behind the bubbles, and of the threads between the bubbles. */
export interface BackdropNumbers {
  /** Strength of the diagonal beam of light on the wall. 0 is off. */
  beamStrength: number
  /** Surface of the wall. 0 is matte, 1 is brushed metal. */
  metallic: number
  /** Strength of the colored light that each bubble casts on the wall. 0 is off. */
  bubbleGlow: number
  /** Opacity of the thin threads between the large bubbles. 0 removes them. */
  links: number
}

export interface BackdropLook extends BackdropNumbers {
  /** Color of the beam of light. The broad highlight of the bubbles gets this color too. */
  beamColor: string
}

export const BACKDROP_RANGES: Record<keyof BackdropNumbers, NumberRange> = {
  beamStrength: { min: 0, max: 1.5, step: 0.01 },
  metallic: { min: 0, max: 1, step: 0.01 },
  bubbleGlow: { min: 0, max: 1.5, step: 0.01 },
  links: { min: 0, max: 1, step: 0.01 },
}

/** The 3 color tones that flow inside one bubble. Each one is a hex color: #rrggbb. */
export interface BubbleTones {
  /** Main color. */
  color: string
  /** Lighter neighbor tone. */
  light: string
  /** Deep tone. */
  deep: string
}

/** Place and size of a bubble in one layout. */
export interface BubblePlacement {
  /** Horizontal center, as a fraction of the screen width: -0.5 is the left edge, 0.5 is the right edge. */
  x: number
  /** Vertical center, as a fraction of the screen height: -0.5 is the bottom edge, 0.5 is the top edge. */
  y: number
  /** Depth. A higher value is nearer to the viewer and is drawn in front. */
  z: number
  /** Radius, as a fraction of the layout unit (screen height on wide screens, screen width on tall screens). */
  r: number
}

export const PLACEMENT_RANGES: Record<keyof BubblePlacement, NumberRange> = {
  x: { min: -0.5, max: 0.5, step: 0.01 },
  y: { min: -0.5, max: 0.5, step: 0.01 },
  z: { min: -2, max: 0.5, step: 0.05 },
  r: { min: 0.08, max: 0.4, step: 0.005 },
}

/** The sample task of a bubble: its name and 3 steps. The bubble shows the steps; pulling it separates them. */
export interface BubbleTask {
  name: string
  steps: [string, string, string]
}

export const TASK_NAME_MAX_LENGTH = 40
export const TASK_STEP_MAX_LENGTH = 36

export interface BubbleDefinition {
  id: string
  tones: BubbleTones
  task: BubbleTask
  /** Size of the steps that this bubble releases. It multiplies the standard size: 1 is standard. */
  stepSize: number
  /** Wide screens: the form is on the left, the bubbles are on the center and right. */
  wide: BubblePlacement
  /** Tall or narrow screens: the form is under the bubbles. */
  tall: BubblePlacement
}

export const MIN_BUBBLES = 1
export const MAX_BUBBLES = 8

export interface BubbleTheme {
  version: number
  glass: GlassLook
  motion: MotionSettings
  backdrop: BackdropLook
  text: TextSettings
  distant: DistantBubbles
  bubbles: BubbleDefinition[]
}

/** The theme used when the saved theme is missing or damaged. Values missing from a saved theme come from here. */
export const FALLBACK_BUBBLE_THEME: BubbleTheme = {
  version: BUBBLE_THEME_VERSION,
  glass: {
    density: 2.2,
    opacity: 0.88,
    edgeOpacity: 0.86,
    innerGlow: 0.55,
    saturation: 1.35,
    rimShine: 0.75,
    softHighlight: 0.6,
    sharpness: 0.55,
    glint: 0.9,
    rimLight: 0.45,
  },
  motion: { drift: 1, ripple: 1, colorFlow: 1, mouse: 1 },
  backdrop: { beamColor: '#ffb48a', beamStrength: 0.7, metallic: 0.15, bubbleGlow: 0.6, links: 0.3 },
  text: {
    size: 1,
    weight: 600,
    shadow: 1,
    seconds: 4,
    color: '#ffffff',
    headline: 'Tarefas grandes viram tarefinhas.',
  },
  distant: { opacity: 0.7, colors: ['#3b82f6', '#8b5cf6', '#ec4899'], sizes: [1, 1, 1] },
  bubbles: [
    {
      id: 'study',
      stepSize: 1,
      tones: { color: '#06b6d4', light: '#4ade80', deep: '#0284c7' },
      task: { name: 'Estudar para a prova', steps: ['ler o capítulo 3', 'fazer os exercícios', 'revisar o resumo'] },
      wide: { x: 0.3, y: -0.2, z: -0.6, r: 0.33 },
      tall: { x: 0.27, y: 0.3, z: -0.6, r: 0.28 },
    },
    {
      id: 'party',
      stepSize: 1,
      tones: { color: '#f97316', light: '#fbbf24', deep: '#f43f5e' },
      task: { name: 'Festa da Bia', steps: ['convidar a turma', 'encomendar o bolo', 'decorar a sala'] },
      wide: { x: 0.07, y: 0.27, z: -1, r: 0.17 },
      tall: { x: -0.27, y: 0.36, z: -1, r: 0.17 },
    },
    {
      id: 'paint',
      stepSize: 1,
      tones: { color: '#8b5cf6', light: '#e879f9', deep: '#4f46e5' },
      task: { name: 'Pintar o quarto', steps: ['comprar tinta', 'lixar a parede', 'passar a tinta'] },
      wide: { x: -0.02, y: -0.08, z: 0, r: 0.15 },
      tall: { x: -0.12, y: 0.2, z: 0, r: 0.14 },
    },
    {
      id: 'trip',
      stepSize: 1,
      tones: { color: '#ec4899', light: '#fb923c', deep: '#be185d' },
      task: { name: 'Organizar a viagem', steps: ['comprar passagens', 'reservar o hotel', 'fazer a mala'] },
      wide: { x: 0.06, y: -0.5, z: -1.4, r: 0.16 },
      tall: { x: -0.46, y: 0.17, z: -1.4, r: 0.12 },
    },
  ],
}

// ---------- Validation ----------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A number inside the range, with no more than 4 decimal places. An invalid value gives the fallback. */
function numberIn(value: unknown, range: NumberRange, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.round(Math.min(range.max, Math.max(range.min, value)) * 10000) / 10000
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function colorOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback
}

/** One line of text, no longer than `maxLength`. An empty text is valid: the admin can clear a field. */
function textOr(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') return fallback
  // Control characters (line breaks included) become spaces: the text is one line in a bubble.
  const oneLine = Array.from(value, (char) => {
    const code = char.charCodeAt(0)
    return code < 32 || code === 127 ? ' ' : char
  })
  return oneLine.join('').trim().slice(0, maxLength).trim()
}

function rangedRecord<Key extends string>(
  value: unknown,
  ranges: Record<Key, NumberRange>,
  fallback: Record<Key, number>,
): Record<Key, number> {
  const source = isRecord(value) ? value : {}
  const result = { ...fallback }
  for (const key of Object.keys(ranges) as Key[]) {
    result[key] = numberIn(source[key], ranges[key], fallback[key])
  }
  return result
}

const VALID_ID = /^[a-z0-9][a-z0-9-]{0,39}$/

/** The first id of the form `bubble-N` that is not in use. */
function freeBubbleId(usedIds: ReadonlySet<string>): string {
  let number = 1
  while (usedIds.has(`bubble-${number}`)) number += 1
  return `bubble-${number}`
}

/** Tones, task and places of a bubble that has no values of its own yet. */
const BLANK_BUBBLE: Omit<BubbleDefinition, 'id'> = {
  tones: { color: '#ec4899', light: '#fb923c', deep: '#be185d' },
  task: { name: 'Nova tarefa', steps: ['primeiro passo', 'segundo passo', 'terceiro passo'] },
  stepSize: 1,
  wide: { x: 0.1, y: -0.32, z: -0.3, r: 0.11 },
  tall: { x: 0, y: 0.4, z: -0.3, r: 0.11 },
}

function validTask(value: unknown, fallback: BubbleTask): BubbleTask {
  const source = isRecord(value) ? value : {}
  const steps = Array.isArray(source.steps) ? source.steps : []
  return {
    name: textOr(source.name, TASK_NAME_MAX_LENGTH, fallback.name),
    steps: [
      textOr(steps[0], TASK_STEP_MAX_LENGTH, fallback.steps[0]),
      textOr(steps[1], TASK_STEP_MAX_LENGTH, fallback.steps[1]),
      textOr(steps[2], TASK_STEP_MAX_LENGTH, fallback.steps[2]),
    ],
  }
}

function validTones(value: unknown, fallback: BubbleTones): BubbleTones {
  const source = isRecord(value) ? value : {}
  return {
    color: colorOr(source.color, fallback.color),
    light: colorOr(source.light, fallback.light),
    deep: colorOr(source.deep, fallback.deep),
  }
}

/**
 * Makes a valid theme from unknown data (a saved file, a request, a message).
 * Numbers go into their ranges, and missing values come from the fallback theme.
 * Returns null when the data is not a theme: no object, or no list with 1 bubble or more.
 */
export function validateBubbleTheme(input: unknown): BubbleTheme | null {
  if (!isRecord(input) || !Array.isArray(input.bubbles)) return null

  const bubbles: BubbleDefinition[] = []
  const usedIds = new Set<string>()
  for (const entry of input.bubbles.slice(0, MAX_BUBBLES)) {
    if (!isRecord(entry)) return null
    const id =
      typeof entry.id === 'string' && VALID_ID.test(entry.id) && !usedIds.has(entry.id)
        ? entry.id
        : freeBubbleId(usedIds)
    usedIds.add(id)
    bubbles.push({
      id,
      tones: validTones(entry.tones, BLANK_BUBBLE.tones),
      task: validTask(entry.task, BLANK_BUBBLE.task),
      stepSize: numberIn(entry.stepSize, STEP_SIZE_RANGE, BLANK_BUBBLE.stepSize),
      wide: rangedRecord(entry.wide, PLACEMENT_RANGES, BLANK_BUBBLE.wide),
      tall: rangedRecord(entry.tall, PLACEMENT_RANGES, BLANK_BUBBLE.tall),
    })
  }
  if (bubbles.length < MIN_BUBBLES) return null

  const fallback = FALLBACK_BUBBLE_THEME
  const distant = isRecord(input.distant) ? input.distant : {}
  const distantColors = Array.isArray(distant.colors) ? distant.colors : []
  const distantSizes = Array.isArray(distant.sizes) ? distant.sizes : []
  const text = isRecord(input.text) ? input.text : {}
  return {
    version: BUBBLE_THEME_VERSION,
    glass: rangedRecord(input.glass, GLASS_RANGES, fallback.glass),
    motion: rangedRecord(input.motion, MOTION_RANGES, fallback.motion),
    backdrop: {
      ...rangedRecord<keyof BackdropNumbers>(input.backdrop, BACKDROP_RANGES, fallback.backdrop),
      beamColor: colorOr(isRecord(input.backdrop) ? input.backdrop.beamColor : undefined, fallback.backdrop.beamColor),
    },
    distant: {
      opacity: numberIn(distant.opacity, DISTANT_OPACITY_RANGE, fallback.distant.opacity),
      colors: [
        colorOr(distantColors[0], fallback.distant.colors[0]),
        colorOr(distantColors[1], fallback.distant.colors[1]),
        colorOr(distantColors[2], fallback.distant.colors[2]),
      ],
      sizes: [
        numberIn(distantSizes[0], DISTANT_SIZE_RANGE, fallback.distant.sizes[0]),
        numberIn(distantSizes[1], DISTANT_SIZE_RANGE, fallback.distant.sizes[1]),
        numberIn(distantSizes[2], DISTANT_SIZE_RANGE, fallback.distant.sizes[2]),
      ],
    },
    text: {
      ...rangedRecord<keyof TextNumbers>(text, TEXT_RANGES, fallback.text),
      color: colorOr(text.color, fallback.text.color),
      headline: textOr(text.headline, HEADLINE_MAX_LENGTH, fallback.text.headline),
    },
    bubbles,
  }
}

// ---------- Changes (the admin page uses these) ----------

/** Tones for a new bubble. The first set whose main color no bubble uses yet is taken. */
const NEW_BUBBLE_TONES: readonly BubbleTones[] = [
  { color: '#ec4899', light: '#fb923c', deep: '#be185d' },
  { color: '#3b82f6', light: '#22d3ee', deep: '#4338ca' },
  { color: '#22c55e', light: '#a3e635', deep: '#0d9488' },
  { color: '#eab308', light: '#fde047', deep: '#f97316' },
  { color: '#ef4444', light: '#fb923c', deep: '#be185d' },
  { color: '#06b6d4', light: '#4ade80', deep: '#0284c7' },
  { color: '#f97316', light: '#fbbf24', deep: '#f43f5e' },
  { color: '#8b5cf6', light: '#e879f9', deep: '#4f46e5' },
]

type Point = Pick<BubblePlacement, 'x' | 'y'>

/** Possible centers for a new bubble. The one farthest from the bubbles already there is taken. */
const WIDE_SLOTS: readonly Point[] = [
  { x: 0.1, y: -0.32 },
  { x: 0.4, y: 0.22 },
  { x: -0.02, y: 0.34 },
  { x: 0.38, y: -0.38 },
  { x: 0.2, y: 0.02 },
  { x: 0.45, y: -0.08 },
]

const TALL_SLOTS: readonly Point[] = [
  { x: 0, y: 0.4 },
  { x: 0.3, y: 0.12 },
  { x: -0.3, y: 0.14 },
  { x: 0.38, y: 0.42 },
  { x: -0.4, y: 0.42 },
  { x: 0.08, y: 0.22 },
]

function freestSlot(slots: readonly Point[], taken: readonly Point[]): Point {
  let best = slots[0]
  let bestDistance = -1
  for (const slot of slots) {
    const nearest = Math.min(...taken.map((point) => Math.hypot(point.x - slot.x, point.y - slot.y)), Infinity)
    if (nearest > bestDistance) {
      best = slot
      bestDistance = nearest
    }
  }
  return best
}

/** Adds a bubble with new tones, in a free place. Returns the same theme when it has the maximum already. */
export function addBubble(theme: BubbleTheme): BubbleTheme {
  if (theme.bubbles.length >= MAX_BUBBLES) return theme
  const usedColors = new Set(theme.bubbles.map((bubble) => bubble.tones.color))
  const tones = NEW_BUBBLE_TONES.find((set) => !usedColors.has(set.color)) ?? NEW_BUBBLE_TONES[0]
  const bubble: BubbleDefinition = {
    id: freeBubbleId(new Set(theme.bubbles.map((existing) => existing.id))),
    tones: { ...tones },
    task: { name: BLANK_BUBBLE.task.name, steps: [...BLANK_BUBBLE.task.steps] },
    stepSize: BLANK_BUBBLE.stepSize,
    wide: {
      ...BLANK_BUBBLE.wide,
      ...freestSlot(
        WIDE_SLOTS,
        theme.bubbles.map((existing) => existing.wide),
      ),
    },
    tall: {
      ...BLANK_BUBBLE.tall,
      ...freestSlot(
        TALL_SLOTS,
        theme.bubbles.map((existing) => existing.tall),
      ),
    },
  }
  return { ...theme, bubbles: [...theme.bubbles, bubble] }
}

/** Removes a bubble. Returns the same theme when it has the minimum already. */
export function removeBubble(theme: BubbleTheme, id: string): BubbleTheme {
  if (theme.bubbles.length <= MIN_BUBBLES) return theme
  return { ...theme, bubbles: theme.bubbles.filter((bubble) => bubble.id !== id) }
}

/** Changes one bubble. `change` gets the bubble and returns the new one. */
export function changeBubble(
  theme: BubbleTheme,
  id: string,
  change: (bubble: BubbleDefinition) => BubbleDefinition,
): BubbleTheme {
  return { ...theme, bubbles: theme.bubbles.map((bubble) => (bubble.id === id ? change(bubble) : bubble)) }
}
