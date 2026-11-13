import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentRef,
  type Ref,
  type RefObject,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, PerformanceMonitor } from '@react-three/drei'
import {
  CanvasTexture,
  Color,
  CustomBlending,
  MathUtils,
  OneFactor,
  OneMinusSrcAlphaFactor,
  SRGBColorSpace,
  SrcAlphaFactor,
  SrcColorFactor,
  ZeroFactor,
  type Group,
  type PlaneGeometry,
  type Mesh,
  type ShaderMaterial,
  type MeshBasicMaterial,
  type Texture,
  Vector3,
} from 'three'
import type {
  BackdropLook,
  BubbleTask,
  BubbleTheme,
  BubbleTones,
  GlassLook,
  MotionSettings,
} from '@/models/bubbleTheme'

// Decorative 3D backdrop of the homepage: liquid glass bubbles that drift slowly, move away from the mouse
// and show the steps of a sample task in turn. Pulling a bubble separates the step on show.
// Out-of-focus bubbles far behind give depth.
// The look, the motion and the bubbles come from a theme (models/bubbleTheme.ts). The default theme is
// src/config/bubble-theme.json: change it on the admin page (/admin, development only).

/** One glass bubble of the current layout. */
interface BubbleSpec {
  id: string
  /** Horizontal center, as a fraction of the viewport width, from -0.5 (left) to 0.5 (right). */
  x: number
  /** Vertical center, as a fraction of the viewport height, from -0.5 (bottom) to 0.5 (top). */
  y: number
  /** Depth in world units. */
  z: number
  /** Radius, as a fraction of the layout unit (viewport height on wide screens, width on tall screens). */
  r: number
  tones: BubbleTones
  /** The sample task. The bubble shows its steps; pulling the bubble separates them. */
  task: BubbleTask
}

/**
 * The bubbles of the theme, placed for one layout.
 * Wide screens: bubbles on the center and right, the form stays clear on the left.
 * Tall or narrow screens (form stacked under the bubbles): bubbles in the upper part, above the form.
 */
function layoutFromTheme(theme: BubbleTheme, tall: boolean): BubbleSpec[] {
  return theme.bubbles.map((bubble) => ({
    id: bubble.id,
    ...(tall ? bubble.tall : bubble.wide),
    tones: bubble.tones,
    task: bubble.task,
  }))
}

/** An out-of-focus bubble far behind the glass ones. Cheap: a flat disc, no glass. */
interface DistantBubbleSpec {
  /** Center, as fractions of the visible area at the bubble's own depth. */
  x: number
  y: number
  /** Depth in world units. Farther is smaller, more blurred and moves less. */
  z: number
  /** Radius, as a fraction of the layout unit at the bubble's depth. */
  r: number
  /** Which of the 3 colors of the theme (`distant.colors`) the bubble has. */
  tone: 0 | 1 | 2
  /** 0 (slightly soft) to 2 (very blurred). */
  blur: 0 | 1 | 2
}

const WIDE_DISTANT: DistantBubbleSpec[] = [
  { x: 0.47, y: 0.42, z: -7, r: 0.13, tone: 0, blur: 2 },
  { x: 0.5, y: -0.44, z: -6, r: 0.12, tone: 1, blur: 2 },
  { x: 0.5, y: -0.04, z: -8, r: 0.09, tone: 2, blur: 2 },
]

const TALL_DISTANT: DistantBubbleSpec[] = [
  { x: 0.45, y: 0.46, z: -6, r: 0.2, tone: 0, blur: 2 },
  { x: -0.46, y: 0.3, z: -5, r: 0.14, tone: 2, blur: 2 },
  { x: 0.05, y: 0.47, z: -7, r: 0.12, tone: 1, blur: 2 },
]

// Standard motion. The theme multiplies these values (`motion`).
const DRIFT_SPEED = 0.12 // radians per second: one slow loop takes about 50 seconds
const BASE_DISTORT = 0.28
const HOVER_DISTORT = 0.55
const PUSH_REACH = 2.2 // the mouse pushes a bubble when it is closer than this many radii
const PUSH_STRENGTH = 0.45 // push distance at the bubble edge, in radii
const ENTRANCE_SECONDS = 1.4
const ENTRANCE_STAGGER = 0.12
const PHRASE_SECONDS = 4

// Splitting: pulling a bubble (or a tap/click on it) separates one step into a smaller linked bubble.
const SPLIT_RADIUS = 0.42 // split bubble radius, as a share of its source bubble
const SPLIT_MAX_RADIUS = 0.065 // ...but never larger than this share of the layout unit: steps stay small

/** Radius of a separated step, in world units. Small and alike, whatever the size of its source. */
function splitRadius(sourceRadius: number, unit: number) {
  return Math.min(sourceRadius * SPLIT_RADIUS, unit * SPLIT_MAX_RADIUS)
}
const MAX_SPLITS_PER_BUBBLE = 2 // the last step stays in the bubble
// Demonstration: while the person has not touched a bubble, a bubble separates a step by itself from time
// to time and takes it back. It shows what the bubbles do, with no text to explain it.
const DEMO_EVERY_MS = 9000
const DEMO_STAY_MS = 4500 // how long the demonstration step stays out
const STEP_RETURN_MS = 450 // how long a step takes to go back into its bubble
// Tall or narrow screens (form stacked under the bubbles) have no free room: there the bubbles are decoration only,
// with no splitting and no hint. Wide screens, touch or not, can split.
const REFUSED_WOBBLE_MS = 450 // a pull or tap that cannot separate a step makes the bubble wobble this long
const SPLIT_GAP = 0.1 // world units kept free around a separated step, so its text stays readable

/** A circle in the scene that a separated step keeps away from. */
interface Obstacle {
  id: string
  x: number
  y: number
  z: number
  r: number
}

const CAMERA_Z = 10

/** How much a point at depth z is scaled on screen. Gaps are measured on screen, where text is read. */
function perspective(z: number) {
  return CAMERA_Z / (CAMERA_Z - z)
}
const SPLIT_PULL = 1.35 // the split happens when the pointer is this many radii from the center
const DRAG_FOLLOW = 0.3 // share of the pull that the bubble follows while it is held
const TAP_TOLERANCE_PX = 6
const SPLIT_SEGMENTS = 40

// Performance: a smooth sphere needs few vertices. The distort effect runs per vertex, every frame.
const SPHERE_SEGMENTS = 64
const MAX_DPR = 1.5

// ---------- Viewer preferences and pointer ----------

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}

interface PointerState {
  /** Normalized position: -1 (left/bottom) to 1 (right/top). */
  x: number
  y: number
  /** Position in page pixels. */
  clientX: number
  clientY: number
  inside: boolean
  /** True over form controls, links and buttons: the bubbles ignore the pointer there. */
  overControl: boolean
}

const CONTROL_SELECTOR = 'a, button, input, textarea, select, label, form, [role="tab"]'

function isOverControl(target: EventTarget | null) {
  return target instanceof Element && target.closest(CONTROL_SELECTOR) !== null
}

/**
 * Pointer position over the whole window. The form sits above the canvas, so the
 * canvas does not get pointer events itself.
 */
function useWindowPointer() {
  const pointer = useRef<PointerState>({ x: 0, y: 0, clientX: 0, clientY: 0, inside: false, overControl: false })
  useEffect(() => {
    function handleMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1)
      pointer.current.clientX = event.clientX
      pointer.current.clientY = event.clientY
      pointer.current.inside = true
      pointer.current.overControl = isOverControl(event.target)
    }
    function handleLeave() {
      pointer.current.inside = false
    }
    window.addEventListener('pointermove', handleMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', handleLeave)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      document.documentElement.removeEventListener('pointerleave', handleLeave)
    }
  }, [])
  return pointer
}

const TALL_ASPECT = 0.85 // width / height below this uses the tall layout
// Below this width the page stacks the form under the bubbles (Tailwind `lg` in HomeView):
// the bubbles then use the tall layout too, so they stay above the form.
const STACKED_MAX_WIDTH = 1024
// Tall layout sizes come from the screen width, capped by its height: a wide but stacked window
// (e.g. 736 x 630) keeps the bubbles in the band above the form.
const TALL_UNIT_HEIGHT_CAP = 0.6

/** Size unit of the tall layout, in world units. */
function tallUnit(width: number, height: number) {
  return Math.min(width, height * TALL_UNIT_HEIGHT_CAP)
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function useTallScreen() {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < STACKED_MAX_WIDTH || window.innerWidth / window.innerHeight < TALL_ASPECT,
    () => false,
  )
}

// ---------- Scene ----------

function easeOutBack(t: number) {
  const c = 1.4
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}

/** A step of a task: its place in the task (0, 1 or 2) and its text. */
interface TaskStep {
  index: number
  text: string
}

/** Steps of a bubble's task that are still inside it, in order. */
function remainingSteps(task: BubbleTask, sourceIndex: number, splitSteps: SplitStep[]): TaskStep[] {
  return task.steps
    .map((text, index) => ({ index, text }))
    .filter((step) => !splitSteps.some((split) => split.sourceIndex === sourceIndex && split.stepIndex === step.index))
}

/** Which remaining step the bubble shows now. The steps take turns, PHRASE_SECONDS each. */
function shownStepIndex(
  bubbleIndex: number,
  bubbleCount: number,
  count: number,
  elapsedSeconds: number,
  reducedMotion: boolean,
) {
  if (count <= 1 || reducedMotion) return 0
  // The bubbles take turns: every PHRASE_SECONDS, only one of them moves to its next step.
  const turn = Math.floor((elapsedSeconds - ENTRANCE_SECONDS) / PHRASE_SECONDS)
  if (turn < bubbleIndex) return 0
  const changes = Math.floor((turn - bubbleIndex) / bubbleCount) + 1
  return changes % count
}

/** A step separated from a bubble: a smaller bubble of the same color, linked to its source. */
export interface SplitStep {
  id: string
  /** The layout and the list of bubbles the step belongs to. Steps of another layout or list are not shown. */
  sceneKey: string
  sourceIndex: number
  /** Which step of the source bubble's task: 0, 1 or 2. */
  stepIndex: number
  /** Position relative to the source bubble, in world units. */
  offsetX: number
  offsetY: number
  /** performance.now() when the step separated. */
  bornAt: number
  /** True for a step that the scene separated by itself, to show the gesture. It goes back after a moment. */
  demo?: boolean
  /** performance.now() when the step started to go back into its bubble. */
  leavingAt?: number
}

/** A bubble's circle on the page, in pixels. Used to find the bubble under the pointer. */
interface ScreenCircle {
  x: number
  y: number
  r: number
}

interface DragState {
  index: number
  startX: number
  startY: number
  moved: boolean
}

/**
 * Liquid glass bubble, after the homepage references: dense colored glass, like the wax of a lava lamp.
 * One shader gives 3 things, on the same rippling shape:
 * - Filter: the glass gives its color to what shows through it. Strong in the thick middle, clear at the thin rim.
 * - Body: the dense material that hides part of what is behind. 3 tones flow slowly inside. Light from the upper
 *   left crosses the glass and glows on the far side. A deep tone sits inside the rim.
 * - Reflections: a bright rim (as on real glass), a broad highlight, a small glint and a colored rim light.
 * The screen shows: (what is behind x filter x not hidden) + body + reflections. Blending cannot do that in
 * 1 draw, so each bubble draws 2 times with the same shader (`uPass`): first it multiplies, then it adds.
 * Only broad shapes in the reflections: small reflected shapes read as clutter.
 */
const GLASS_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uDistort;
uniform float uSeed;
varying vec3 vNormalView;
varying vec3 vViewPosition;
varying vec3 vLocal;
// Only slow, low-frequency waves: the bubble breathes and changes shape a little, always rounded.
vec3 ripple(vec3 point) {
  vec3 p = normalize(point);
  float wave = 0.6 * sin(p.x * 1.6 + uTime * 0.9 + uSeed) * cos(p.y * 1.3 - uTime * 0.7)
    + 0.4 * sin(p.z * 1.4 + p.y * 1.2 + uTime * 0.6 + uSeed * 1.7);
  return p * (1.0 + wave * uDistort * 0.35);
}

void main() {
  vec3 displaced = ripple(position);
  // Normal of the rippled surface, from 2 nearby points: keeps the rim smooth where the shape bulges.
  vec3 helper = abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(normal, helper));
  vec3 bitangent = normalize(cross(normal, tangent));
  float offset = 0.01;
  vec3 neighborA = ripple(position + tangent * offset);
  vec3 neighborB = ripple(position + bitangent * offset);
  vec3 rippledNormal = normalize(cross(neighborA - displaced, neighborB - displaced));
  if (dot(rippledNormal, normal) < 0.0) rippledNormal = -rippledNormal;

  vLocal = displaced;
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -viewPosition.xyz;
  vNormalView = normalize(normalMatrix * rippledNormal);
  gl_Position = projectionMatrix * viewPosition;
}
`

const GLASS_FRAGMENT = /* glsl */ `
uniform float uPass;
uniform float uFlowTime;
uniform float uSeed;
uniform float uDensity;
uniform float uOpacity;
uniform float uEdgeOpacity;
uniform float uInnerGlow;
uniform float uSaturation;
uniform float uRimShine;
uniform float uSoftHighlight;
uniform float uSharpness;
uniform float uGlint;
uniform float uRimLight;
uniform vec3 uColor;
uniform vec3 uLight;
uniform vec3 uDeep;
uniform vec3 uBeam;
uniform float uBeamAmount;
varying vec3 vNormalView;
varying vec3 vViewPosition;
varying vec3 vLocal;

vec3 saturated(vec3 color, float amount) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return clamp(mix(vec3(luma), color, amount), 0.0, 1.0);
}

// The colors here are linear. The screen blends display values, so each layer changes to display values first.
vec3 toScreen(vec3 color) {
  return linearToOutputTexel(vec4(clamp(color, 0.0, 1.0), 1.0)).rgb;
}

void main() {
  vec3 normal = normalize(vNormalView);
  vec3 view = normalize(vViewPosition);
  float facing = clamp(dot(normal, view), 0.0, 1.0);
  vec3 reflected = reflect(-view, normal);

  // 3 tones that flow slowly into each other, a little lighter toward the top.
  vec3 q = vLocal;
  float flowA = 0.5 + 0.5 * sin(q.x * 1.8 + q.y * 1.2 + uFlowTime * 0.35 + uSeed);
  float flowB = 0.5 + 0.5 * sin(q.y * 2.1 - q.z * 1.4 - uFlowTime * 0.28 + uSeed * 1.9);
  vec3 tint = mix(uColor, uLight, smoothstep(0.35, 0.95, flowA));
  tint = mix(tint, uDeep, smoothstep(0.45, 1.0, flowB) * 0.8);
  tint = mix(tint, uLight, smoothstep(0.3, 1.0, normal.y) * 0.25);
  tint = saturated(tint, uSaturation);

  // Filter: light absorbed along the glass. Strong color in the thick middle, almost clear at the thin rim.
  float thickness = 0.15 + pow(facing, 0.9);
  vec3 filterColor = mix(vec3(1.0), tint, 1.0 - exp(-uDensity * thickness));

  // Body. Light comes from the upper left, in front.
  vec3 keyLight = normalize(vec3(-0.45, 0.6, 0.65));
  float lit = dot(normal, keyLight);
  float wrap = lit * 0.5 + 0.5;
  // Denser glass has a deeper color. With no density the body is pale.
  float depth = 1.0 - exp(-uDensity * 0.7);
  vec3 body = mix(mix(tint, vec3(1.0), 0.45), tint, depth);
  // The light that crossed the glass glows on the far side, inside the rim.
  float glow = smoothstep(0.2, -0.55, lit) * smoothstep(0.02, 0.45, facing);
  glow = clamp(glow * uInnerGlow, 0.0, 1.0);
  // A deep tone inside the rim, where the glass turns away. Not where the glow is.
  vec3 deepTone = saturated(mix(tint, uDeep, 0.7), uSaturation) * 0.8;
  body = mix(body, deepTone, smoothstep(0.25, 0.9, 1.0 - facing) * 0.8 * depth * (1.0 - glow * 0.7));
  vec3 glowTone = saturated(mix(tint, uLight, 0.55), uSaturation) * 1.25 + 0.07;
  body = mix(body, glowTone, glow);
  // Soft shade: a little lighter toward the light.
  body *= 0.9 + 0.16 * wrap;
  float bodyAlpha = mix(uEdgeOpacity, uOpacity, smoothstep(0.0, 0.65, facing));

  // Reflections.
  float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 3.0);
  float toward = max(dot(reflected, keyLight), 0.0);
  float softbox = mix(pow(toward, 14.0), smoothstep(0.76, 0.9, toward), uSharpness);
  float glint = pow(max(dot(reflected, normalize(vec3(-0.3, 0.5, 0.8))), 0.0), 140.0);
  float rimLight = pow(max(dot(reflected, normalize(vec3(0.7, -0.25, 0.3))), 0.0), 5.0) * fresnel;
  vec3 shineColor = mix(vec3(1.0), uLight, clamp(rimLight * 1.6, 0.0, 0.75));
  float shine = fresnel * uRimShine + softbox * uSoftHighlight + glint * uGlint + rimLight * uRimLight;
  // The broad highlight reflects the beam of light of the wall, so it gets a part of the beam color.
  vec3 beamTint = mix(vec3(1.0), uBeam, clamp(uBeamAmount, 0.0, 1.0) * 0.55);
  shineColor = mix(shineColor, beamTint, clamp(softbox * uSoftHighlight / max(shine, 0.001), 0.0, 1.0));
  // Softer at the very silhouette, so the rim glows instead of drawing an outline.
  shine *= 1.0 - smoothstep(0.9, 1.0, 1.0 - facing) * 0.6;
  shine = clamp(shine, 0.0, 0.95);

  // Share of what is behind that still shows: not covered by a reflection, not hidden by the body.
  float through = (1.0 - shine) * (1.0 - bodyAlpha);
  if (uPass < 0.5) {
    gl_FragColor = vec4(toScreen(filterColor) * through, 1.0);
  } else {
    gl_FragColor = vec4(toScreen(shineColor) * shine + toScreen(body) * bodyAlpha * (1.0 - shine), 0.0);
  }
}
`

/**
 * Shader settings for the 2 draws of one bubble. They share all values but `uPass`,
 * so a change to one value changes the 2 draws.
 */
function glassShaders(tones: BubbleTones, glass: GlassLook, seed: number) {
  const shared = {
    uTime: { value: 0 },
    uFlowTime: { value: 0 },
    uDistort: { value: BASE_DISTORT },
    uSeed: { value: seed },
    uDensity: { value: glass.density },
    uOpacity: { value: glass.opacity },
    uEdgeOpacity: { value: glass.edgeOpacity },
    uInnerGlow: { value: glass.innerGlow },
    uSaturation: { value: glass.saturation },
    uRimShine: { value: glass.rimShine },
    uSoftHighlight: { value: glass.softHighlight },
    uSharpness: { value: glass.sharpness },
    uGlint: { value: glass.glint },
    uRimLight: { value: glass.rimLight },
    uColor: { value: new Color(tones.color) },
    uLight: { value: new Color(tones.light) },
    uDeep: { value: new Color(tones.deep) },
    uBeam: { value: new Color('#ffffff') },
    uBeamAmount: { value: 0 },
    // Not a shader value: the beam color that `uBeam` has now. `uBeam` changes only when the theme changes.
    beamHex: { value: '' },
  }
  return {
    filter: {
      uniforms: { ...shared, uPass: { value: 0 } },
      vertexShader: GLASS_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
    },
    body: {
      uniforms: { ...shared, uPass: { value: 1 } },
      vertexShader: GLASS_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
    },
  }
}

type GlassUniforms = ReturnType<typeof glassShaders>['filter']['uniforms']
type GlassMaterial = ShaderMaterial & { uniforms: GlassUniforms }

/** Writes the look of the theme to a bubble. Runs every frame, so a change on the admin page shows at once. */
function applyGlassLook(uniforms: GlassUniforms, glass: GlassLook, backdrop: BackdropLook) {
  if (uniforms.beamHex.value !== backdrop.beamColor) {
    uniforms.beamHex.value = backdrop.beamColor
    uniforms.uBeam.value.set(backdrop.beamColor)
  }
  uniforms.uBeamAmount.value = backdrop.beamStrength
  uniforms.uDensity.value = glass.density
  uniforms.uOpacity.value = glass.opacity
  uniforms.uEdgeOpacity.value = glass.edgeOpacity
  uniforms.uInnerGlow.value = glass.innerGlow
  uniforms.uSaturation.value = glass.saturation
  uniforms.uRimShine.value = glass.rimShine
  uniforms.uSoftHighlight.value = glass.softHighlight
  uniforms.uSharpness.value = glass.sharpness
  uniforms.uGlint.value = glass.glint
  uniforms.uRimLight.value = glass.rimLight
}

function applyGlassTones(uniforms: GlassUniforms, tones: BubbleTones) {
  uniforms.uColor.value.set(tones.color)
  uniforms.uLight.value.set(tones.light)
  uniforms.uDeep.value.set(tones.deep)
}

/** Draw order of transparent layers: back to front, and the 2 draws of each bubble one after the other. */
function glassRenderOrder(z: number) {
  return 1000 + Math.round((z + 5) * 100) * 2
}

interface GlassShapeProps {
  shaders: ReturnType<typeof glassShaders>
  z: number
  segments: number
  materialRef: RefObject<GlassMaterial | null>
}

/** The 2 draws of a glass bubble, on a unit sphere. The parent group scales and turns it. */
function GlassShape({ shaders, z, segments, materialRef }: GlassShapeProps) {
  const order = glassRenderOrder(z)
  return (
    <>
      <mesh renderOrder={order}>
        <sphereGeometry args={[1, segments, segments]} />
        {/* Multiplies what is behind: the filter, and the part that the body hides. */}
        <shaderMaterial
          ref={materialRef}
          args={[shaders.filter]}
          transparent
          depthWrite={false}
          blending={CustomBlending}
          blendSrc={ZeroFactor}
          blendDst={SrcColorFactor}
        />
      </mesh>
      <mesh renderOrder={order + 1}>
        <sphereGeometry args={[1, segments, segments]} />
        {/* Adds the body and the reflections. */}
        <shaderMaterial
          args={[shaders.body]}
          transparent
          depthWrite={false}
          blending={CustomBlending}
          blendSrc={OneFactor}
          blendDst={OneFactor}
        />
      </mesh>
    </>
  )
}

/** Moves a phrase element over a 3D point. Only style writes: no React render. */
function placePhrase(
  element: HTMLElement,
  worldPoint: Vector3,
  camera: Parameters<Vector3['project']>[0],
  width: number,
  height: number,
) {
  worldPoint.project(camera)
  const left = ((worldPoint.x + 1) / 2) * width
  const top = ((1 - worldPoint.y) / 2) * height
  element.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) translate(-50%, -50%)`
  return { left, top }
}

let cachedGlowTexture: Texture | null = null

/** Soft round spot, white. The material color tints it. Made 1 time, used by all bubbles. */
function glowTexture() {
  if (cachedGlowTexture) return cachedGlowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const spot = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    spot.addColorStop(0, 'rgba(255,255,255,1)')
    spot.addColorStop(0.45, 'rgba(255,255,255,0.55)')
    spot.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = spot
    context.fillRect(0, 0, size, size)
  }
  cachedGlowTexture = new CanvasTexture(canvas)
  cachedGlowTexture.colorSpace = SRGBColorSpace
  return cachedGlowTexture
}

/**
 * The wall behind all bubbles: a matte surface with a soft gradient and 1 diagonal beam of light that moves
 * very slowly. `uMetallic` changes the surface toward brushed metal. The side of the form stays calm.
 * It covers the full screen, whatever the camera.
 */
const WALL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`

const WALL_FRAGMENT = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uBeam;
uniform float uBeamStrength;
uniform float uMetallic;
uniform float uTime;
uniform float uAspect;
uniform float uTall;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float low = mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x);
  float high = mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x);
  return mix(low, high, f.y);
}

void main() {
  // The form is on the left (wide screens) or at the bottom (tall screens): no light effects there.
  float calm = mix(smoothstep(0.3, 0.62, vUv.x), smoothstep(0.5, 0.85, vUv.y), uTall);

  // Soft gradient: a little cooler and darker at the lower left, lighter at the upper right.
  float across = (vUv.x + vUv.y) * 0.5;
  vec3 color = uBase * mix(vec3(0.95, 0.955, 0.975), vec3(1.03), smoothstep(0.0, 1.0, across));

  // Diagonal beam: a broad band and a thin one beside it. They move very slowly.
  float diagonal = vUv.x * min(uAspect, 1.8) * 0.5 + vUv.y;
  float center = 1.22 + 0.07 * sin(uTime * 0.11);
  float broad = exp(-pow((diagonal - center) / 0.2, 2.0));
  float thin = exp(-pow((diagonal - center + 0.42 + 0.03 * sin(uTime * 0.07)) / 0.06, 2.0));
  float beam = (broad + thin * 0.55) * calm * uBeamStrength;
  color = mix(color, mix(vec3(1.0), uBeam, 0.6), clamp(beam * 0.5, 0.0, 0.85));
  // A faint shade beside the beam gives the light a direction.
  float shade = exp(-pow((diagonal - center - 0.36) / 0.22, 2.0)) * calm * uBeamStrength;
  color *= 1.0 - shade * 0.05;

  // Metal: a cooler, darker surface with fine brushed lines, and more contrast in the light.
  float brushed = noise(vec2(vUv.x * 4.0, vUv.y * 420.0)) * 0.6 + noise(vec2(vUv.x * 9.0, vUv.y * 900.0)) * 0.4;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 metal = mix(vec3(luma), color, 0.55) * (0.8 + 0.22 * broad + 0.12 * thin);
  metal *= 0.94 + 0.12 * brushed;
  metal += mix(vec3(1.0), uBeam, 0.5) * pow(broad, 3.0) * 0.16 * uBeamStrength;
  color = mix(color, metal, uMetallic * calm);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  #include <colorspace_fragment>
}
`

interface WallProps {
  base: string
  backdrop: BackdropLook
  tall: boolean
  reducedMotion: boolean
}

function Wall({ base, backdrop, tall, reducedMotion }: WallProps) {
  const material = useRef<ShaderMaterial>(null)
  const [shader] = useState(() => ({
    uniforms: {
      uBase: { value: new Color(base) },
      uBeam: { value: new Color(backdrop.beamColor) },
      uBeamStrength: { value: backdrop.beamStrength },
      uMetallic: { value: backdrop.metallic },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uTall: { value: 0 },
    },
    vertexShader: WALL_VERTEX,
    fragmentShader: WALL_FRAGMENT,
  }))
  const beamColor = backdrop.beamColor
  useEffect(() => {
    material.current?.uniforms.uBeam.value.set(beamColor)
  }, [beamColor])

  useFrame((state, delta) => {
    if (!material.current) return
    const uniforms = material.current.uniforms
    uniforms.uBeamStrength.value = backdrop.beamStrength
    uniforms.uMetallic.value = backdrop.metallic
    uniforms.uAspect.value = state.size.width / state.size.height
    uniforms.uTall.value = tall ? 1 : 0
    if (!reducedMotion) uniforms.uTime.value += delta
  })

  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} args={[shader]} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

// Dark thread on the light wall. The opacity of the theme keeps it faint.
const LINK_COLOR = '#2f2a6b'

interface BubbleLinksProps {
  count: number
  opacity: number
  body: (index: number) => Group | null
}

/** Thin threads from each large bubble to the next one, edge to edge. The glass covers them. */
function BubbleLinks({ count, opacity, body }: BubbleLinksProps) {
  const lines = useRef<(ComponentRef<typeof Line> | null)[]>([])
  useFrame(() => {
    for (let index = 0; index < count - 1; index++) {
      const line = lines.current[index]
      const from = body(index)
      const to = body(index + 1)
      if (!line || !from || !to) continue
      const dx = to.position.x - from.position.x
      const dy = to.position.y - from.position.y
      const length = Math.max(Math.hypot(dx, dy), 0.0001)
      const fromRadius = Math.min((from.children[1]?.userData.shownRadius as number | undefined) ?? 0, length / 2)
      const toRadius = Math.min((to.children[1]?.userData.shownRadius as number | undefined) ?? 0, length / 2)
      line.geometry.setPositions([
        from.position.x + (dx / length) * fromRadius,
        from.position.y + (dy / length) * fromRadius,
        from.position.z,
        to.position.x - (dx / length) * toRadius,
        to.position.y - (dy / length) * toRadius,
        to.position.z,
      ])
    }
  })
  if (opacity <= 0) return null
  return (
    <>
      {Array.from({ length: Math.max(count - 1, 0) }, (_, index) => (
        <Line
          key={index}
          ref={(line) => {
            lines.current[index] = line
          }}
          points={[
            [0, 0, 0],
            [0, 0, 0],
          ]}
          color={LINK_COLOR}
          lineWidth={1.25}
          transparent
          opacity={opacity}
          renderOrder={10}
          frustumCulled={false}
          depthWrite={false}
        />
      ))}
    </>
  )
}

interface BubbleProps {
  spec: BubbleSpec
  index: number
  unit: number
  glass: GlassLook
  backdrop: BackdropLook
  motion: MotionSettings
  pointer: RefObject<PointerState>
  reducedMotion: boolean
  /** Page element that holds this bubble's phrases. The scene moves it over the bubble every frame. */
  phraseElement: () => HTMLDivElement | null
  /** Reports, every frame, the bubble's 3D group and its circle on the page. */
  report: (body: Group, circle: ScreenCircle) => void
  isHovered: () => boolean
  /** True for a moment after a pull or tap that could not separate a step: the bubble wobbles. */
  isRefused: () => boolean
  getDrag: () => DragState | null
}

function Bubble({
  spec,
  index,
  unit,
  glass,
  backdrop,
  motion,
  pointer,
  reducedMotion,
  phraseElement,
  report,
  isHovered,
  isRefused,
  getDrag,
}: BubbleProps) {
  const body = useRef<Group>(null)
  const shape = useRef<Group>(null)
  const material = useRef<GlassMaterial>(null)
  const glow = useRef<Mesh<PlaneGeometry, MeshBasicMaterial>>(null)
  const driftTime = useRef(0)
  const viewport = useThree((state) => state.viewport)
  const canvasHeight = useThree((state) => state.size.height)
  const phase = index * 1.7

  const radius = spec.r * unit
  const baseX = spec.x * viewport.width
  const baseY = spec.y * viewport.height
  const radiusPx = (radius / viewport.height) * canvasHeight
  const screenPosition = useMemo(() => new Vector3(), [])
  const [shaders] = useState(() => glassShaders(spec.tones, glass, index * 3.1))
  const { color, light, deep } = spec.tones
  useEffect(() => {
    if (material.current) applyGlassTones(material.current.uniforms, { color, light, deep })
  }, [color, light, deep])

  useFrame((state, delta) => {
    if (!body.current) return
    const time = state.clock.elapsedTime

    let targetX = baseX
    let targetY = baseY
    const held = getDrag()?.index === index
    const hovered = held || isHovered()
    const { x, y, inside, overControl } = pointer.current
    const pointerX = (x * viewport.width) / 2
    const pointerY = (y * viewport.height) / 2

    if (held) {
      // Held: the bubble stretches toward the pointer, like dough being pulled.
      targetX += (pointerX - targetX) * DRAG_FOLLOW
      targetY += (pointerY - targetY) * DRAG_FOLLOW
    } else if (!reducedMotion) {
      // Slow drift on a loose ellipse, different for each bubble.
      driftTime.current += delta * DRIFT_SPEED * motion.drift
      const amplitude = Math.min(radius * 0.18, 0.35)
      targetX += Math.sin(driftTime.current + phase) * amplitude
      targetY += Math.cos(driftTime.current * 0.85 + phase * 1.3) * amplitude * 0.8

      // The mouse pushes the bubble away, softly. Not over the form, and not while the bubble is hovered.
      if (inside && !overControl && !hovered) {
        const dx = targetX - pointerX
        const dy = targetY - pointerY
        const distance = Math.max(Math.hypot(dx, dy), 0.0001)
        const reach = radius * PUSH_REACH
        if (distance < reach) {
          const strength = Math.pow(1 - distance / reach, 2) * radius * PUSH_STRENGTH * motion.mouse
          targetX += (dx / distance) * strength
          targetY += (dy / distance) * strength
        }
      }
    }

    body.current.position.x = MathUtils.damp(body.current.position.x, targetX, 2.5, delta)
    body.current.position.y = MathUtils.damp(body.current.position.y, targetY, 2.5, delta)

    if (shape.current) {
      // Entrance: each bubble grows in, one after another. Then a small swell on hover.
      const entrance = reducedMotion
        ? 1
        : easeOutBack(MathUtils.clamp((time - index * ENTRANCE_STAGGER) / ENTRANCE_SECONDS, 0, 1))
      const currentHover = shape.current.userData.hoverScale ?? 1
      const nextHover = MathUtils.damp(currentHover, held ? 1.1 : hovered ? 1.06 : 1, 4, delta)
      shape.current.userData.hoverScale = nextHover
      shape.current.scale.setScalar(Math.max(radius * entrance * nextHover, 0.0001))
      shape.current.userData.shownRadius = radius * entrance * nextHover
      if (glow.current) {
        // Colored light on the wall behind the bubble, a little away from the key light.
        glow.current.scale.setScalar(Math.max(radius * entrance * 2.3, 0.0001))
        glow.current.position.set(radius * 0.22, -radius * 0.28, -0.6)
        glow.current.material.opacity = Math.min(backdrop.bubbleGlow * 0.42, 1) * MathUtils.clamp(entrance, 0, 1)
      }
      if (!reducedMotion) shape.current.rotation.y += delta * 0.06
    }

    if (material.current) {
      const uniforms = material.current.uniforms
      applyGlassLook(uniforms, glass, backdrop)
      if (!reducedMotion) {
        uniforms.uTime.value += delta * 0.9
        uniforms.uFlowTime.value += delta * 0.9 * motion.colorFlow
      }
      uniforms.uDistort.value = MathUtils.damp(
        uniforms.uDistort.value,
        (held || isRefused() ? HOVER_DISTORT * 1.4 : hovered ? HOVER_DISTORT : BASE_DISTORT) * motion.ripple,
        3,
        delta,
      )
    }

    // Circle on the page, for the pointer hit test.
    body.current.getWorldPosition(screenPosition).project(state.camera)
    const shownRadiusPx =
      (((shape.current?.userData.shownRadius as number | undefined) ?? 0) / viewport.height) * canvasHeight
    report(body.current, {
      x: ((screenPosition.x + 1) / 2) * state.size.width,
      y: ((1 - screenPosition.y) / 2) * state.size.height,
      r: shownRadiusPx,
    })

    // Place the phrase over the bubble center, in page pixels.
    const element = phraseElement()
    if (element) {
      placePhrase(
        element,
        body.current.getWorldPosition(screenPosition),
        state.camera,
        state.size.width,
        state.size.height,
      )
      if (element.dataset.radius !== radiusPx.toFixed(0)) {
        element.dataset.radius = radiusPx.toFixed(0)
        element.style.width = `${radiusPx * 1.6}px`
        // Same text size as before the bubbles shrank by 20%.
        element.style.fontSize = `${MathUtils.clamp(radiusPx * 0.25, 15, 32)}px`
      }
      element.style.opacity = time > index * ENTRANCE_STAGGER + ENTRANCE_SECONDS * 0.5 || reducedMotion ? '1' : '0'
    }
  })

  return (
    <group ref={body} position={[baseX, baseY, spec.z]}>
      {/* Not transparent on purpose, as the distant bubbles: drawn before all glass. */}
      <mesh ref={glow} renderOrder={-20} scale={0.0001}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={glowTexture()}
          color={spec.tones.color}
          transparent={false}
          blending={CustomBlending}
          blendSrc={SrcAlphaFactor}
          blendDst={OneMinusSrcAlphaFactor}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          opacity={0}
        />
      </mesh>
      <group ref={shape} scale={reducedMotion ? radius : 0.0001}>
        <GlassShape shaders={shaders} z={spec.z} segments={SPHERE_SEGMENTS} materialRef={material} />
      </group>
    </group>
  )
}

interface SplitStepBubbleProps {
  step: SplitStep
  order: number
  tones: BubbleTones
  glass: GlassLook
  backdrop: BackdropLook
  motion: MotionSettings
  sourceRadius: number
  /** This step's radius, in world units. */
  radius: number
  sourceZ: number
  sourceBody: () => Group | null
  reducedMotion: boolean
  phraseElement: () => HTMLDivElement | null
  /** The other bubbles and steps, where they are now. The step keeps a gap from all of them. */
  obstacles: () => Obstacle[]
  /** Reports where this step is now, so the others keep away from it. */
  report: (circle: Obstacle) => void
}

/** The smaller bubble that separates from a source bubble, linked to it by a line. */
function SplitStepBubble({
  step,
  order,
  tones,
  glass,
  backdrop,
  motion,
  sourceRadius,
  radius,
  sourceZ,
  sourceBody,
  reducedMotion,
  phraseElement,
  obstacles,
  report,
}: SplitStepBubbleProps) {
  const body = useRef<Group>(null)
  const shape = useRef<Group>(null)
  const line = useRef<ComponentRef<typeof Line>>(null)
  const material = useRef<GlassMaterial>(null)
  const driftTime = useRef(0)
  const started = useRef(false)
  const viewport = useThree((state) => state.viewport)
  const canvasHeight = useThree((state) => state.size.height)
  const radiusPx = (radius / viewport.height) * canvasHeight
  const z = sourceZ + 0.3
  const phase = order * 2.1
  const point = useMemo(() => new Vector3(), [])
  const [shaders] = useState(() => glassShaders(tones, glass, order * 2.3 + 7))
  const { color, light, deep } = tones
  useEffect(() => {
    if (material.current) applyGlassTones(material.current.uniforms, { color, light, deep })
  }, [color, light, deep])

  useFrame((state, delta) => {
    const source = sourceBody()
    if (!body.current || !shape.current || !source) return

    // Start inside the source bubble, then slide out to the place where it was pulled.
    if (!started.current) {
      body.current.position.set(source.position.x, source.position.y, z)
      started.current = true
    }
    driftTime.current += delta * DRIFT_SPEED * motion.drift
    const sway = reducedMotion ? 0 : radius * 0.15
    let targetX = source.position.x + step.offsetX + Math.sin(driftTime.current * 1.4 + phase) * sway
    let targetY = source.position.y + step.offsetY + Math.cos(driftTime.current * 1.2 + phase) * sway
    // The bubbles keep drifting after the split: step out of the way of any bubble that comes too close.
    // Compared on the screen plane: bubbles at other depths look closer or farther than they are in 3D.
    const own = perspective(z)
    for (const other of obstacles()) {
      if (other.id === step.id) continue
      const scale = perspective(other.z)
      const dx = targetX * own - other.x * scale
      const dy = targetY * own - other.y * scale
      const distance = Math.max(Math.hypot(dx, dy), 0.0001)
      const minimum = other.r * scale + radius * own + SPLIT_GAP
      if (distance < minimum) {
        targetX = (other.x * scale + (dx / distance) * minimum) / own
        targetY = (other.y * scale + (dy / distance) * minimum) / own
      }
    }
    // Never pushed out of the screen: the visible area at this depth, minus the radius.
    const halfWidth = viewport.width / 2 / own - radius * 1.1
    const halfHeight = viewport.height / 2 / own - radius * 1.1
    targetX = MathUtils.clamp(targetX, -halfWidth, halfWidth)
    targetY = MathUtils.clamp(targetY, -halfHeight, halfHeight)
    // Going back: the step slides into its bubble and shrinks.
    const leaving =
      step.leavingAt === undefined ? 0 : MathUtils.clamp((performance.now() - step.leavingAt) / STEP_RETURN_MS, 0, 1)
    if (leaving > 0) {
      targetX = source.position.x
      targetY = source.position.y
    }
    const speed = reducedMotion ? 20 : 3.5
    body.current.position.x = MathUtils.damp(body.current.position.x, targetX, speed, delta)
    body.current.position.y = MathUtils.damp(body.current.position.y, targetY, speed, delta)
    report({ id: step.id, x: body.current.position.x, y: body.current.position.y, z, r: radius })

    const age = (performance.now() - step.bornAt) / 1000
    const grow = (reducedMotion ? 1 : easeOutBack(MathUtils.clamp(age / 0.6, 0, 1))) * (1 - leaving)
    shape.current.scale.setScalar(Math.max(radius * grow, 0.0001))
    if (!reducedMotion) shape.current.rotation.y += delta * 0.08
    if (material.current) {
      const uniforms = material.current.uniforms
      applyGlassLook(uniforms, glass, backdrop)
      uniforms.uDistort.value = BASE_DISTORT * motion.ripple
      if (!reducedMotion) {
        uniforms.uTime.value += delta * 1.1
        uniforms.uFlowTime.value += delta * 1.1 * motion.colorFlow
      }
    }

    // Line from edge to edge, in the color of the task.
    if (line.current) {
      const dx = body.current.position.x - source.position.x
      const dy = body.current.position.y - source.position.y
      const length = Math.max(Math.hypot(dx, dy), 0.0001)
      const ux = dx / length
      const uy = dy / length
      const sourceShown = (source.children[1]?.userData.shownRadius as number | undefined) ?? sourceRadius
      const startGap = Math.min(sourceShown * 0.98, length)
      const endGap = Math.min(radius * grow * 0.98, length - startGap)
      line.current.geometry.setPositions([
        source.position.x + ux * startGap,
        source.position.y + uy * startGap,
        source.position.z,
        body.current.position.x - ux * endGap,
        body.current.position.y - uy * endGap,
        z,
      ])
    }

    const element = phraseElement()
    if (element) {
      placePhrase(element, body.current.getWorldPosition(point), state.camera, state.size.width, state.size.height)
      if (element.dataset.radius !== radiusPx.toFixed(0)) {
        element.dataset.radius = radiusPx.toFixed(0)
        element.style.width = `${radiusPx * 1.8}px`
        element.style.fontSize = `${MathUtils.clamp(radiusPx * 0.325, 13, 21)}px`
      }
      // A step that goes back hides its text at once: the text must not cover the text of its bubble.
      element.style.transitionDuration = leaving > 0 ? '120ms' : ''
      element.style.opacity = grow > 0.7 && leaving === 0 ? '1' : '0'
    }
  })

  return (
    <>
      <Line
        ref={line}
        points={[
          [0, 0, 0],
          [0, 0, 0],
        ]}
        color={color}
        lineWidth={2.5}
        frustumCulled={false}
        // Writes no depth: the bubbles, drawn after it, always cover the line where they meet.
        depthWrite={false}
      />
      <group ref={body} position={[0, 0, z]}>
        <group ref={shape} scale={0.0001}>
          <GlassShape shaders={shaders} z={z} segments={SPLIT_SEGMENTS} materialRef={material} />
        </group>
      </group>
    </>
  )
}

interface BubblesProps {
  layout: BubbleSpec[]
  glass: GlassLook
  backdrop: BackdropLook
  motion: MotionSettings
  tall: boolean
  reducedMotion: boolean
  phraseElements: RefObject<(HTMLDivElement | null)[]>
  splitSteps: SplitStep[]
  splitElements: RefObject<Map<string, HTMLDivElement>>
  /** Separates the next step of a bubble. `offsetX`/`offsetY`: where the new bubble goes, from the source. */
  onSplit: (sourceIndex: number, offsetX: number, offsetY: number, demo: boolean) => void
  /** Page element with the one-time "pull" hint. The scene places and shows it. */
  hintElement: () => HTMLDivElement | null
}

const COARSE_POINTER_QUERY = '(pointer: coarse)'
const HINT_HOVER_SECONDS = 3.5 // on a mouse: the hint follows the cursor over bubbles for this long, once
const HINT_TOUCH_WINDOW = [2.5, 8] as const // on a touch screen: shown under the biggest bubble, once

function Bubbles({
  layout,
  glass,
  backdrop,
  motion,
  tall,
  reducedMotion,
  phraseElements,
  splitSteps,
  splitElements,
  onSplit,
  hintElement,
}: BubblesProps) {
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const canvas = useThree((state) => state.gl.domElement)
  const canvasHeight = size.height
  const group = useRef<Group>(null)
  const pointer = useWindowPointer()
  const unit = tall ? tallUnit(viewport.width, viewport.height) : viewport.height
  const bodies = useRef<(Group | null)[]>([])
  const screens = useRef<(ScreenCircle | null)[]>([])
  const splitBodies = useRef(new Map<string, Obstacle>())
  // Canvas position on the page (not the window), so a scrolled page still maps the pointer right.
  const canvasPageOffset = useRef({ left: 0, top: 0 })
  const hoverIndex = useRef(-1)
  const drag = useRef<DragState | null>(null)
  const hint = useRef({ done: false, shownFor: 0 })
  const refusedAt = useRef<number[]>([])
  const personActed = useRef(false) // true after the first press on a bubble: no more demonstration

  // Latest values for the window listeners, which are added once.
  const latest = useRef({
    layout,
    unit,
    worldPerPx: viewport.height / canvasHeight,
    onSplit,
    size,
    splitSteps,
    tall,
    reducedMotion,
  })
  useEffect(() => {
    latest.current = {
      layout,
      unit,
      worldPerPx: viewport.height / canvasHeight,
      onSplit,
      size,
      splitSteps,
      tall,
      reducedMotion,
    }
  })

  useEffect(() => {
    function measure() {
      const rect = canvas.getBoundingClientRect()
      canvasPageOffset.current = { left: rect.left + window.scrollX, top: rect.top + window.scrollY }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [canvas])

  useEffect(() => {
    /** Window point to canvas point. */
    function toCanvas(clientX: number, clientY: number) {
      return {
        x: clientX + window.scrollX - canvasPageOffset.current.left,
        y: clientY + window.scrollY - canvasPageOffset.current.top,
      }
    }

    /** The bubble under a canvas point. The nearest to the camera wins. */
    function bubbleAt(x: number, y: number) {
      let found = -1
      latest.current.layout.forEach((spec, index) => {
        const circle = screens.current[index]
        if (!circle || Math.hypot(x - circle.x, y - circle.y) > circle.r) return
        if (found === -1 || spec.z > latest.current.layout[found].z) found = index
      })
      return found
    }

    /** Page areas a new step must not cover (form, title, hint), in canvas pixels. */
    function areasToAvoid() {
      const canvasRect = canvas.getBoundingClientRect()
      return [...document.querySelectorAll('[data-bubble-avoid]')].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          left: rect.left - canvasRect.left,
          right: rect.right - canvasRect.left,
          top: rect.top - canvasRect.top,
          bottom: rect.bottom - canvasRect.top,
        }
      })
    }

    /**
     * Separates the next step of a bubble. Tries directions around `preferredAngle` and picks the place
     * that stays on screen and clear of the form, the title and the other bubbles.
     */
    function split(index: number, preferredAngle: number, preferredDistancePx?: number, demo = false) {
      const circle = screens.current[index]
      if (!circle) return
      const refuse = () => {
        if (!demo) refusedAt.current[index] = performance.now()
      }
      const done = latest.current.splitSteps.filter((step) => step.sourceIndex === index).length
      if (done >= MAX_SPLITS_PER_BUBBLE) return refuse()
      const { layout: currentLayout, unit: currentUnit, worldPerPx, size: canvasSize } = latest.current
      const sourceRadius = currentLayout[index].r * currentUnit
      const stepRadius = splitRadius(sourceRadius, currentUnit)
      const stepRadiusPx = stepRadius / worldPerPx
      const minimumPx = (sourceRadius * 1.1 + stepRadius + 0.15) / worldPerPx
      const maximumPx = (sourceRadius * 3) / worldPerPx
      const basePx = MathUtils.clamp(preferredDistancePx ?? minimumPx * 1.15, minimumPx, maximumPx)
      const avoid = areasToAvoid()
      // Steps already separated count where they will rest, not where they are while sliding out.
      const restingSteps = latest.current.splitSteps.flatMap((step) => {
        const source = screens.current[step.sourceIndex]
        if (!source) return []
        return [
          {
            x: source.x + step.offsetX / worldPerPx,
            y: source.y - step.offsetY / worldPerPx,
            r: splitRadius(currentLayout[step.sourceIndex].r * currentUnit, currentUnit) / worldPerPx,
          },
        ]
      })
      const others = [
        ...screens.current.filter((other, otherIndex): other is ScreenCircle => other !== null && otherIndex !== index),
        ...restingSteps,
      ]

      // Only a fully free place counts: on screen, clear of the form and title, touching no other bubble.
      // Among those, the one closest to the wanted direction wins. No free place: the step stays in.
      let best: { turn: number; angle: number; distance: number } | null = null
      for (let attempt = 0; attempt < 24; attempt++) {
        const turn = Math.ceil(attempt / 2) * (attempt % 2 === 0 ? 1 : -1)
        if (best && Math.abs(turn) > Math.abs(best.turn)) break
        const angle = preferredAngle + turn * (Math.PI / 12)
        for (const distance of [basePx, Math.min(basePx * 1.3, maximumPx), Math.min(basePx * 1.65, maximumPx)]) {
          const x = circle.x + Math.cos(angle) * distance
          const y = circle.y + Math.sin(angle) * distance
          const margin = stepRadiusPx + 6
          const onScreen =
            x - margin >= 0 && x + margin <= canvasSize.width && y - margin >= 0 && y + margin <= canvasSize.height
          const clearOfAreas = avoid.every((area) => {
            const gapX = Math.max(area.left - x, 0, x - area.right)
            const gapY = Math.max(area.top - y, 0, y - area.bottom)
            return Math.hypot(gapX, gapY) >= stepRadiusPx + 16
          })
          const clearOfBubbles = others.every(
            (other) => Math.hypot(x - other.x, y - other.y) >= other.r + stepRadiusPx + 18,
          )
          if (onScreen && clearOfAreas && clearOfBubbles) {
            best = { turn, angle, distance }
            break
          }
        }
      }
      if (!best) return refuse()

      const distanceWorld = best.distance * worldPerPx
      // Canvas y grows downward; world y grows upward.
      latest.current.onSplit(index, Math.cos(best.angle) * distanceWorld, -Math.sin(best.angle) * distanceWorld, demo)
      if (!demo) hint.current.done = true // the person found the gesture: no more hint
    }

    function handleDown(event: PointerEvent) {
      if (latest.current.tall || event.button !== 0 || isOverControl(event.target)) return
      const point = toCanvas(event.clientX, event.clientY)
      const index = bubbleAt(point.x, point.y)
      if (index === -1) return
      personActed.current = true
      event.preventDefault() // no text selection while pulling
      drag.current = { index, startX: event.clientX, startY: event.clientY, moved: false }
    }

    function handleMove(event: PointerEvent) {
      const current = drag.current
      if (!current) return
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > TAP_TOLERANCE_PX) {
        current.moved = true
      }
      const circle = screens.current[current.index]
      if (!circle) return
      const point = toCanvas(event.clientX, event.clientY)
      const dx = point.x - circle.x
      const dy = point.y - circle.y
      const distance = Math.hypot(dx, dy)
      if (distance > circle.r * SPLIT_PULL) {
        // Pulled far enough: the step separates toward the pointer, and the source springs back.
        drag.current = null
        split(current.index, Math.atan2(dy, dx), distance)
      }
    }

    function handleUp() {
      const current = drag.current
      drag.current = null
      if (!current || current.moved) return
      // Tap or click: the step separates outward, away from the center of the canvas.
      const circle = screens.current[current.index]
      if (!circle) return
      const { size: canvasSize } = latest.current
      split(current.index, Math.atan2(circle.y - canvasSize.height / 2, circle.x - canvasSize.width / 2))
    }

    function handleCancel() {
      drag.current = null
    }

    // Demonstration: each bubble in turn separates a step, outward. Only when no step is out.
    let demoTurn = 0
    const demoTimer = window.setInterval(() => {
      const { layout: bubbles, splitSteps: stepsOut, size: canvasSize } = latest.current
      if (personActed.current || latest.current.tall || latest.current.reducedMotion) return
      if (document.hidden || drag.current || stepsOut.length > 0 || bubbles.length === 0) return
      const index = demoTurn++ % bubbles.length
      const circle = screens.current[index]
      if (!circle) return
      split(index, Math.atan2(circle.y - canvasSize.height / 2, circle.x - canvasSize.width / 2), undefined, true)
    }, DEMO_EVERY_MS)

    window.addEventListener('pointerdown', handleDown)
    window.addEventListener('pointermove', handleMove, { passive: true })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    return () => {
      window.clearInterval(demoTimer)
      window.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      delete document.documentElement.dataset.bubblePointer
    }
  }, [canvas])

  useFrame((state, delta) => {
    // Bubble under the pointer, and the matching cursor (grab, or grabbing while held).
    const { x, y, inside, overControl, clientX, clientY } = pointer.current
    const pointerX = clientX + window.scrollX - canvasPageOffset.current.left
    const pointerY = clientY + window.scrollY - canvasPageOffset.current.top
    let found = -1
    if (inside && !overControl && !tall) {
      layout.forEach((spec, index) => {
        const circle = screens.current[index]
        if (!circle || Math.hypot(pointerX - circle.x, pointerY - circle.y) > circle.r) return
        if (found === -1 || spec.z > layout[found].z) found = index
      })
    }
    hoverIndex.current = found

    // One-time hint: next to the cursor on the first hover, or under the biggest bubble on touch screens.
    const hintBox = hintElement()
    if (hintBox) {
      let visible = false
      let left = 0
      let top = 0
      if (!hint.current.done && !tall) {
        if (window.matchMedia(COARSE_POINTER_QUERY).matches) {
          const time = state.clock.elapsedTime
          const biggest = screens.current[0]
          if (biggest && time > HINT_TOUCH_WINDOW[0] && time < HINT_TOUCH_WINDOW[1]) {
            visible = true
            left = state.size.width / 2 // centered on the screen, so the text never runs off the edge
            top = biggest.y + biggest.r + 12
          } else if (time >= HINT_TOUCH_WINDOW[1]) {
            hint.current.done = true
          }
        } else if (found !== -1) {
          visible = true
          left = pointerX + 18
          top = pointerY + 20
          hint.current.shownFor += delta
          if (hint.current.shownFor > HINT_HOVER_SECONDS) hint.current.done = true
        }
      }
      if (visible) hintBox.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`
      hintBox.dataset.visible = String(visible)
    }

    const cursor = drag.current ? 'drag' : found !== -1 ? 'hover' : ''
    const root = document.documentElement
    if ((root.dataset.bubblePointer ?? '') !== cursor) {
      if (cursor) root.dataset.bubblePointer = cursor
      else delete root.dataset.bubblePointer
    }

    // Light parallax: the whole group leans a little against the mouse.
    if (!group.current || reducedMotion) return
    const targetX = inside ? -x * 0.12 * motion.mouse : 0
    const targetY = inside ? -y * 0.08 * motion.mouse : 0
    group.current.position.x = MathUtils.damp(group.current.position.x, targetX, 1.5, delta)
    group.current.position.y = MathUtils.damp(group.current.position.y, targetY, 1.5, delta)
  })

  return (
    <group ref={group}>
      <BubbleLinks count={layout.length} opacity={backdrop.links} body={(index) => bodies.current[index] ?? null} />
      {layout.map((spec, index) => (
        <Bubble
          key={`${tall ? 'tall' : 'wide'}-${index}`}
          spec={spec}
          index={index}
          unit={unit}
          glass={glass}
          backdrop={backdrop}
          motion={motion}
          pointer={pointer}
          reducedMotion={reducedMotion}
          phraseElement={() => phraseElements.current[index] ?? null}
          report={(reportedBody, circle) => {
            bodies.current[index] = reportedBody
            screens.current[index] = circle
          }}
          isHovered={() => hoverIndex.current === index}
          isRefused={() => performance.now() - (refusedAt.current[index] ?? -Infinity) < REFUSED_WOBBLE_MS}
          getDrag={() => drag.current}
        />
      ))}
      {splitSteps.map((step, order) => {
        const source = layout[step.sourceIndex]
        if (!source) return null
        return (
          <SplitStepBubble
            key={step.id}
            step={step}
            order={order}
            tones={source.tones}
            glass={glass}
            backdrop={backdrop}
            motion={motion}
            sourceRadius={source.r * unit}
            radius={splitRadius(source.r * unit, unit)}
            sourceZ={source.z}
            sourceBody={() => bodies.current[step.sourceIndex] ?? null}
            reducedMotion={reducedMotion}
            phraseElement={() => splitElements.current.get(step.id) ?? null}
            obstacles={() => [
              ...layout.flatMap((spec, index) => {
                const other = bodies.current[index]
                if (!other) return []
                // Counted a little larger: the bubble swells on hover and its surface ripples.
                return [
                  {
                    id: `bubble-${index}`,
                    x: other.position.x,
                    y: other.position.y,
                    z: spec.z,
                    r: spec.r * unit * 1.12,
                  },
                ]
              }),
              ...splitBodies.current.values(),
            ]}
            report={(circle) => splitBodies.current.set(step.id, circle)}
          />
        )
      })}
    </group>
  )
}

/**
 * Out-of-focus bubble image: a bright spot at the top left, a deeper body and a soft edge.
 * White and gray, so the material color tints it. `softness` is the blurred share of the radius.
 */
function createDistantBubbleTexture(softness: number) {
  const size = 256
  const half = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const body = context.createRadialGradient(size * 0.38, size * 0.34, 0, half, half, half)
    body.addColorStop(0, 'rgb(255,255,255)')
    body.addColorStop(0.35, 'rgb(225,225,225)')
    body.addColorStop(1, 'rgb(150,150,150)')
    context.fillStyle = body
    context.fillRect(0, 0, size, size)

    const edge = context.createRadialGradient(half, half, 0, half, half, half)
    edge.addColorStop(0, 'rgba(0,0,0,1)')
    edge.addColorStop(Math.max(0, 1 - softness), 'rgba(0,0,0,0.92)')
    edge.addColorStop(1, 'rgba(0,0,0,0)')
    context.globalCompositeOperation = 'destination-in'
    context.fillStyle = edge
    context.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const BLUR_SOFTNESS = [0.35, 0.6, 0.9] as const

function createDistantBubbleTextures() {
  return BLUR_SOFTNESS.map(createDistantBubbleTexture)
}

interface DistantBubbleProps {
  spec: DistantBubbleSpec
  index: number
  tall: boolean
  color: string
  /** The distant bubbles stay faint: they add depth, they do not compete with the glass ones. */
  opacity: number
  texture: Texture
  reducedMotion: boolean
}

function DistantBubble({ spec, index, tall, color, opacity, texture, reducedMotion }: DistantBubbleProps) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const getViewport = useThree((state) => state.viewport.getCurrentViewport)
  // Visible area at this bubble's depth: farther bubbles spread over a larger area.
  const area = getViewport(camera, [0, 0, spec.z], size)
  const unit = tall ? tallUnit(area.width, area.height) : area.height
  const radius = spec.r * unit
  const baseX = spec.x * area.width
  const baseY = spec.y * area.height
  const phase = index * 2.3

  useFrame((state, delta) => {
    if (!mesh.current) return
    const time = state.clock.elapsedTime
    if (material.current) {
      material.current.opacity =
        opacity * (reducedMotion ? 1 : MathUtils.clamp((time - 0.3 - index * 0.08) / 1.6, 0, 1))
    }
    if (reducedMotion) return
    const amplitude = radius * 0.25
    const targetX = baseX + Math.sin(time * DRIFT_SPEED * 0.7 + phase) * amplitude
    const targetY = baseY + Math.cos(time * DRIFT_SPEED * 0.6 + phase) * amplitude
    mesh.current.position.x = MathUtils.damp(mesh.current.position.x, targetX, 1.5, delta)
    mesh.current.position.y = MathUtils.damp(mesh.current.position.y, targetY, 1.5, delta)
  })

  return (
    // Not transparent on purpose: the glass only sees through opaque objects. Custom blending keeps the soft edge.
    <mesh ref={mesh} position={[baseX, baseY, spec.z]} renderOrder={Math.round(spec.z)}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        color={color}
        transparent={false}
        blending={CustomBlending}
        blendSrc={SrcAlphaFactor}
        blendDst={OneMinusSrcAlphaFactor}
        depthWrite={false}
        toneMapped={false}
        opacity={reducedMotion ? opacity : 0}
      />
    </mesh>
  )
}

interface DistantBubblesProps {
  tall: boolean
  colors: readonly [string, string, string]
  opacity: number
  /** How much the group leans against the mouse: the theme's `motion.mouse`. */
  lean: number
  reducedMotion: boolean
}

function DistantBubbles({ tall, colors, opacity, lean, reducedMotion }: DistantBubblesProps) {
  const group = useRef<Group>(null)
  const pointer = useWindowPointer()
  const [textures] = useState(createDistantBubbleTextures)
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures])

  const layout = tall ? TALL_DISTANT : WIDE_DISTANT

  // Far bubbles lean less than the glass ones: the difference reads as depth.
  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return
    const { x, y, inside } = pointer.current
    group.current.position.x = MathUtils.damp(group.current.position.x, inside ? -x * 0.04 * lean : 0, 1.5, delta)
    group.current.position.y = MathUtils.damp(group.current.position.y, inside ? -y * 0.03 * lean : 0, 1.5, delta)
  })

  return (
    <group ref={group}>
      {layout.map((spec, index) => (
        <DistantBubble
          key={`${tall ? 'tall' : 'wide'}-${index}`}
          spec={spec}
          index={index}
          tall={tall}
          color={colors[spec.tone]}
          opacity={opacity}
          texture={textures[spec.blur]}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  )
}

interface BubbleTextLayerProps {
  layout: BubbleSpec[]
  layoutKey: 'wide' | 'tall'
  splitSteps: SplitStep[]
  startedAt: RefObject<number>
  reducedMotion: boolean
  phraseElements: RefObject<(HTMLDivElement | null)[]>
  splitElements: RefObject<Map<string, HTMLDivElement>>
  hintElement: RefObject<HTMLDivElement | null>
}

function subscribeCoarsePointer(onChange: () => void) {
  const query = window.matchMedia(COARSE_POINTER_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Text of the bubbles, as plain page elements over the canvas. The scene moves each one with its bubble.
 * A bubble shows its remaining steps in turn; when all are out, it shows the task name.
 */
function BubbleTextLayer({
  layout,
  layoutKey,
  splitSteps,
  startedAt,
  reducedMotion,
  phraseElements,
  splitElements,
  hintElement,
}: BubbleTextLayerProps) {
  const touchScreen = useSyncExternalStore(
    subscribeCoarsePointer,
    () => window.matchMedia(COARSE_POINTER_QUERY).matches,
    () => false,
  )
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => setElapsedSeconds((performance.now() - startedAt.current) / 1000), 250)
    return () => window.clearInterval(timer)
  }, [reducedMotion, startedAt])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {layout.map((spec, index) => {
        const remaining = remainingSteps(spec.task, index, splitSteps)
        const shown = shownStepIndex(index, layout.length, remaining.length, elapsedSeconds, reducedMotion)
        return (
          <div
            key={`${layoutKey}-${index}`}
            ref={(element) => {
              phraseElements.current[index] = element
            }}
            className="absolute top-0 left-0 opacity-0 transition-opacity duration-700 will-change-transform"
          >
            <div className="bubble-phrases">
              {remaining.length === 0 ? (
                <span className="bubble-task-name">{spec.task.name}</span>
              ) : (
                remaining.map((step, position) => (
                  <span key={step.index} className="bubble-phrase" data-visible={position === shown}>
                    {step.text}
                  </span>
                ))
              )}
            </div>
          </div>
        )
      })}
      {splitSteps.map((step) => (
        <div
          key={step.id}
          ref={(element) => {
            if (element) splitElements.current.set(step.id, element)
            else splitElements.current.delete(step.id)
          }}
          className="absolute top-0 left-0 opacity-0 transition-opacity duration-500 will-change-transform"
        >
          <div className="bubble-phrases">
            <span className="bubble-phrase-static">{layout[step.sourceIndex]?.task.steps[step.stepIndex]}</span>
          </div>
        </div>
      ))}
      <div ref={hintElement} className="bubble-hint" data-visible="false">
        {touchScreen ? 'Toque numa bolha para separar um passo' : 'Puxe para separar um passo'}
      </div>
    </div>
  )
}

function readCanvasColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim()
  return value || '#f5f4fa'
}

/** What the page can tell the scene to do. */
export interface HomeBackdropHandle {
  /** Sends all separated steps back into their bubbles. */
  returnSteps(): void
}

interface HomeBackdropProps {
  theme: BubbleTheme
  ref?: Ref<HomeBackdropHandle>
  /** Called with the number of steps that the person separated and that are out now. */
  onStepsOutChange?: (count: number) => void
}

export function HomeBackdrop({ theme, ref, onStepsOutChange }: HomeBackdropProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [background] = useState(readCanvasColor)
  const [maxDpr, setMaxDpr] = useState(MAX_DPR)
  const tall = useTallScreen()
  const layout = useMemo(() => layoutFromTheme(theme, tall), [theme, tall])
  const phraseElements = useRef<(HTMLDivElement | null)[]>([])
  const splitElements = useRef(new Map<string, HTMLDivElement>())
  const hintElement = useRef<HTMLDivElement>(null)
  const layoutKey = tall ? 'tall' : 'wide'
  // The list of bubbles changes only on the admin page. The scene then starts again, with no separated steps.
  const listKey = theme.bubbles.map((bubble) => bubble.id).join(',')
  const sceneKey = `${layoutKey}:${listKey}`
  const [splitSteps, setSplitSteps] = useState<SplitStep[]>([])
  const visibleSplitSteps = splitSteps.filter((step) => step.sceneKey === sceneKey)
  // One clock for the text layer and the split: the step on show is the step that separates.
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = performance.now()
  }, [])

  // Timers that take steps back.
  const returnTimers = useRef<number[]>([])
  useEffect(() => {
    const timers = returnTimers.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const stepsOut = visibleSplitSteps.filter((step) => !step.demo && step.leavingAt === undefined).length
  useEffect(() => {
    onStepsOutChange?.(stepsOut)
  }, [stepsOut, onStepsOutChange])

  useImperativeHandle(
    ref,
    () => ({
      returnSteps() {
        const leavingAt = performance.now()
        setSplitSteps((current) =>
          current.map((step) => (step.leavingAt === undefined ? { ...step, leavingAt } : step)),
        )
        returnTimers.current.push(
          window.setTimeout(
            () => setSplitSteps((current) => current.filter((step) => step.leavingAt === undefined)),
            STEP_RETURN_MS + 150,
          ),
        )
      },
    }),
    [],
  )

  function handleSplit(sourceIndex: number, offsetX: number, offsetY: number, demo: boolean) {
    const task = layout[sourceIndex]?.task
    if (!task) return
    const id = crypto.randomUUID()
    if (demo) {
      returnTimers.current.push(
        window.setTimeout(() => {
          const leavingAt = performance.now()
          setSplitSteps((current) => current.map((step) => (step.id === id ? { ...step, leavingAt } : step)))
        }, DEMO_STAY_MS),
        window.setTimeout(
          () => setSplitSteps((current) => current.filter((step) => step.id !== id)),
          DEMO_STAY_MS + STEP_RETURN_MS + 150,
        ),
      )
    }
    const elapsedSeconds = (performance.now() - startedAt.current) / 1000
    setSplitSteps((current) => {
      const sameScene = current.filter((step) => step.sceneKey === sceneKey)
      const remaining = remainingSteps(task, sourceIndex, sameScene)
      // 2 steps out already: pulling only stretches the bubble.
      if (task.steps.length - remaining.length >= MAX_SPLITS_PER_BUBBLE) return current
      const step: SplitStep = {
        id,
        demo,
        sceneKey,
        sourceIndex,
        stepIndex:
          remaining[shownStepIndex(sourceIndex, layout.length, remaining.length, elapsedSeconds, reducedMotion)].index,
        offsetX,
        offsetY,
        bornAt: performance.now(),
      }
      return [...current, step]
    })
  }

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: 35 }}
        dpr={[1, maxDpr]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        fallback={null}
      >
        {/* Lowers the resolution on slow devices, raises it again when frames are fast. */}
        <PerformanceMonitor
          onDecline={() => setMaxDpr(1)}
          onIncline={() => setMaxDpr(MAX_DPR)}
          flipflops={3}
          onFallback={() => setMaxDpr(1)}
        />
        <color attach="background" args={[background]} />
        <Wall base={background} backdrop={theme.backdrop} tall={tall} reducedMotion={reducedMotion} />
        <DistantBubbles
          tall={tall}
          colors={theme.distant.colors}
          opacity={theme.distant.opacity}
          lean={theme.motion.mouse}
          reducedMotion={reducedMotion}
        />
        <Bubbles
          key={listKey}
          layout={layout}
          glass={theme.glass}
          backdrop={theme.backdrop}
          motion={theme.motion}
          tall={tall}
          reducedMotion={reducedMotion}
          phraseElements={phraseElements}
          splitSteps={visibleSplitSteps}
          splitElements={splitElements}
          onSplit={handleSplit}
          hintElement={() => hintElement.current}
        />
      </Canvas>
      <BubbleTextLayer
        layout={layout}
        layoutKey={layoutKey}
        splitSteps={visibleSplitSteps}
        startedAt={startedAt}
        reducedMotion={reducedMotion}
        phraseElements={phraseElements}
        splitElements={splitElements}
        hintElement={hintElement}
      />
    </>
  )
}
