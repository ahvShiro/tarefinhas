import { Undo2 } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import type { HomeBackdropHandle } from '@/components/HomeBackdrop'
import { SignInForm } from '@/components/SignInForm'
import { SignUpForm } from '@/components/SignUpForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/controllers/useAuth'
import type { SignInInput, SignUpInput } from '@/models/auth'
import type { BubbleTheme } from '@/models/bubbleTheme'
import { DEFAULT_BUBBLE_THEME } from '@/models/defaultBubbleTheme'

// The 3D backdrop loads after the form, in its own file, so the form shows at once.
const HomeBackdrop = lazy(() =>
  import('@/components/HomeBackdrop').then((module) => ({ default: module.HomeBackdrop })),
)

type Mode = 'sign-in' | 'sign-up'

const MODE_PARAM = 'mode'

// The active tab lives in the URL (?mode=sign-up), so a link can open the sign-up form directly.
function readModeFromUrl(): Mode {
  return new URLSearchParams(window.location.search).get(MODE_PARAM) === 'sign-up' ? 'sign-up' : 'sign-in'
}

function writeModeToUrl(mode: Mode) {
  const url = new URL(window.location.href)
  if (mode === 'sign-up') url.searchParams.set(MODE_PARAM, mode)
  else url.searchParams.delete(MODE_PARAM)
  window.history.replaceState(null, '', url)
}

const TAB_TRIGGER_CLASS =
  'flex-1 rounded-full px-4 text-sm font-medium text-ink/65 transition-colors hover:text-ink data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_rgb(31_28_51/0.08),0_4px_12px_rgb(31_28_51/0.06)] focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none'

const HEADING_CLASS = 'font-display text-[40px] leading-[1.05] font-medium tracking-[-0.03em] text-balance'
const INTRO_CLASS = 'mt-3 mb-8 text-[15px] leading-relaxed text-pretty text-ink/65'

interface HomeViewProps {
  /** Theme of the bubbles. The admin page sends its draft here; without it, the project default applies. */
  bubbleTheme?: BubbleTheme
}

export function HomeView({ bubbleTheme = DEFAULT_BUBBLE_THEME }: HomeViewProps) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>(readModeFromUrl)
  const backdrop = useRef<HomeBackdropHandle>(null)
  // Steps that the person pulled out of the bubbles and that are out now.
  const [stepsOut, setStepsOut] = useState(0)

  function changeMode(value: string) {
    const next: Mode = value === 'sign-up' ? 'sign-up' : 'sign-in'
    setMode(next)
    writeModeToUrl(next)
  }

  // After entering the app, the homepage tab no longer applies: remove it from the URL.
  async function handleSignIn(input: SignInInput) {
    const result = await signIn(input)
    if (result.ok) writeModeToUrl('sign-in')
    return result
  }

  async function handleSignUp(input: SignUpInput) {
    const result = await signUp(input)
    if (result.ok) writeModeToUrl('sign-in')
    return result
  }

  return (
    <div className="relative min-h-dvh touch-manipulation overflow-x-hidden bg-canvas text-ink">
      <div className="absolute inset-x-0 top-0 h-dvh" aria-hidden="true">
        <Suspense fallback={null}>
          <HomeBackdrop ref={backdrop} theme={bubbleTheme} onStepsOutChange={setStepsOut} />
        </Suspense>
        {/* Soft light and fine grain over the scene, so the background is not a flat color. */}
        <div className="home-texture pointer-events-none absolute inset-0" />
      </div>

      <div className="relative z-10 flex min-h-dvh flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-16 lg:pt-10">
        <header className="flex items-start justify-between gap-8">
          <p
            data-bubble-avoid
            translate="no"
            className="w-fit font-display text-[26px] leading-none font-semibold tracking-[-0.02em]"
          >
            tarefinhas
          </p>
          {/* Wide screens only: on a phone the bubbles and the form use all the room. The text is in the theme. */}
          {bubbleTheme.text.headline && (
            <p
              data-bubble-avoid
              className="hidden max-w-[340px] text-right font-display text-[42px] leading-[1.04] font-normal tracking-[-0.03em] text-balance text-ink/85 lg:block"
            >
              {bubbleTheme.text.headline}
            </p>
          )}
        </header>

        <main className="flex flex-1 items-end pt-[34dvh] lg:items-center lg:pt-0">
          <Tabs
            data-bubble-avoid
            value={mode}
            onValueChange={changeMode}
            className="w-full max-w-[380px] py-8 lg:py-10"
          >
            <TabsList
              aria-label="Escolha entre entrar ou criar conta"
              className="mb-9 flex w-full gap-1 rounded-full bg-ink/[0.06] p-1 backdrop-blur-md group-data-horizontal/tabs:h-11"
            >
              <TabsTrigger value="sign-in" className={TAB_TRIGGER_CLASS}>
                Entrar
              </TabsTrigger>
              <TabsTrigger value="sign-up" className={TAB_TRIGGER_CLASS}>
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sign-in" className="outline-none">
              <h1 className={HEADING_CLASS}>Que bom te ver de novo</h1>
              <p className={INTRO_CLASS}>Entre para ver seu banco de tarefas e o que está em foco hoje.</p>
              <SignInForm onSubmit={handleSignIn} />
            </TabsContent>

            <TabsContent value="sign-up" className="outline-none">
              <h1 className={HEADING_CLASS}>Crie sua conta</h1>
              <p className={INTRO_CLASS}>Só precisamos do seu nome, e-mail e uma senha.</p>
              <SignUpForm onSubmit={handleSignUp} />
            </TabsContent>
          </Tabs>
        </main>

        {stepsOut > 0 && (
          <button
            type="button"
            onClick={() => backdrop.current?.returnSteps()}
            aria-label="Recolher os balõezinhos"
            title="Recolher os balõezinhos"
            className="fixed right-6 bottom-6 grid size-11 place-items-center rounded-xl bg-white/85 text-ink shadow-[0_1px_2px_rgb(31_28_51/0.08),0_8px_24px_rgb(31_28_51/0.12)] backdrop-blur-md transition-colors hover:bg-white focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
          >
            <Undo2 aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>
    </div>
  )
}
