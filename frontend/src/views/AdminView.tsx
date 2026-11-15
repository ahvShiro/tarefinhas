import { useEffect, useRef, useState } from 'react'
import { BubbleThemePanel, type EditedLayout } from '@/components/BubbleThemePanel'
import { BubbleThemeEditorProvider } from '@/controllers/BubbleThemeEditorProvider'
import { listenForPreviewReady, sendThemeToPreview } from '@/controllers/bubbleThemePreview'
import { useBubbleThemeEditor } from '@/controllers/useBubbleThemeEditor'
import { ROUTES } from './routes'

// Admin page of the homepage bubbles. Development only (/admin on the dev server).
// Left: the real homepage in a frame of a fixed screen size, so the layout is the same as on that screen.
// Right: the controls. "Salvar como padrão" writes src/config/bubble-theme.json in the project.

const SCREENS: Record<EditedLayout, { label: string; width: number; height: number }> = {
  wide: { label: 'Desktop', width: 1440, height: 900 },
  tall: { label: 'Celular', width: 390, height: 844 },
}

interface PreviewProps {
  layout: EditedLayout
}

/** The homepage in a frame, scaled to fit. It gets the draft theme on each change. */
function Preview({ layout }: PreviewProps) {
  const { draft } = useBubbleThemeEditor()
  const stage = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const latestDraft = useRef(draft)
  const [scale, setScale] = useState(0)
  const [reloads, setReloads] = useState(0)
  const screen = SCREENS[layout]

  useEffect(() => {
    latestDraft.current = draft
    sendThemeToPreview(frame.current, draft)
  }, [draft])

  // The homepage asks for the theme when it starts (first load, reload, or after it changes page).
  useEffect(
    () =>
      listenForPreviewReady(
        () => frame.current,
        () => sendThemeToPreview(frame.current, latestDraft.current),
      ),
    [],
  )

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setScale(Math.min(width / screen.width, height / screen.height, 1))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [screen.width, screen.height])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={stage} className="relative min-h-0 flex-1">
        <div
          className="absolute top-1/2 left-1/2 overflow-hidden rounded-[14px] bg-canvas shadow-[0_1px_2px_rgb(31_28_51/0.1),0_24px_60px_-12px_rgb(31_28_51/0.28)] ring-1 ring-ink/10"
          style={{
            width: screen.width * scale,
            height: screen.height * scale,
            translate: '-50% -50%',
            visibility: scale > 0 ? 'visible' : 'hidden',
          }}
        >
          <iframe
            key={`${layout}-${reloads}`}
            ref={frame}
            src={ROUTES.home}
            title={`Prévia da página inicial, ${screen.label}`}
            className="origin-top-left border-0"
            style={{ width: screen.width, height: screen.height, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 text-[12px] text-ink/60">
        <p className="tabular-nums">
          {screen.label} · {screen.width} × {screen.height} · {Math.round(scale * 100)}%
        </p>
        <button
          type="button"
          onClick={() => setReloads((count) => count + 1)}
          className="rounded-md px-2 py-1 font-medium text-ink/75 underline-offset-2 hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none"
        >
          Recarregar prévia
        </button>
      </div>
    </div>
  )
}

function SaveBar() {
  const { dirty, saveStatus, save, discard } = useBubbleThemeEditor()
  const saving = saveStatus.state === 'saving'

  let status = dirty ? 'Alterações não salvas' : 'Igual ao padrão salvo'
  if (saving) status = 'Salvando…'
  else if (saveStatus.state === 'saved' && !dirty) status = 'Salvo como padrão'

  return (
    <div className="border-b border-ink/10 px-5 py-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={`size-2 rounded-full ${dirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <p aria-live="polite" className="text-[13px] font-medium text-ink">
          {status}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="h-10 flex-1 rounded-full bg-brand px-4 text-[14px] font-medium text-white transition-colors hover:bg-brand/90 focus-visible:ring-3 focus-visible:ring-brand/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          Salvar como padrão
        </button>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={discard}
          className="h-10 rounded-full border border-ink/20 px-4 text-[14px] font-medium text-ink transition-colors hover:bg-ink/5 focus-visible:ring-3 focus-visible:ring-brand/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        >
          Descartar
        </button>
      </div>
      <p aria-live="polite" className="mt-2 text-[12px] leading-snug text-ink/60">
        {saveStatus.state === 'error' ? (
          <span className="text-red-700">Não salvou. {saveStatus.message}</span>
        ) : saveStatus.state === 'saved' && !dirty ? (
          <>
            Gravado em <code className="font-mono text-[11px]">src/config/bubble-theme.json</code>. Para valer no site
            publicado, faça o commit desse arquivo.
          </>
        ) : (
          'As mudanças aparecem na prévia na hora. Só viram o padrão do site quando você salvar.'
        )}
      </p>
    </div>
  )
}

function AdminScreen() {
  const [layout, setLayout] = useState<EditedLayout>('wide')

  useEffect(() => {
    const previous = document.title
    document.title = 'Admin das bolhas · Tarefinhas'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-[#e9e7f2] text-ink lg:flex-row">
      <main className="flex h-[46dvh] min-h-0 shrink-0 flex-col p-4 sm:p-6 lg:h-auto lg:flex-1 lg:shrink">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <p translate="no" className="font-display text-[20px] leading-none font-semibold tracking-[-0.02em]">
              tarefinhas
            </p>
            <h1 className="mt-1 text-[13px] text-ink/60">Admin das bolhas da página inicial</h1>
          </div>
          <div role="group" aria-label="Tela da prévia" className="flex gap-1 rounded-full bg-ink/[0.08] p-1">
            {(Object.keys(SCREENS) as EditedLayout[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={layout === key}
                onClick={() => setLayout(key)}
                className="h-8 rounded-full px-4 text-[13px] font-medium text-ink/65 transition-colors hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgb(31_28_51/0.1)]"
              >
                {SCREENS[key].label}
              </button>
            ))}
          </div>
        </header>
        <Preview layout={layout} />
      </main>

      <aside
        aria-label="Controles das bolhas"
        className="flex min-h-0 flex-1 flex-col border-t border-ink/10 bg-canvas lg:w-[380px] lg:flex-none lg:border-t-0 lg:border-l"
      >
        <SaveBar />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <BubbleThemePanel layout={layout} />
        </div>
      </aside>
    </div>
  )
}

export function AdminView() {
  return (
    <BubbleThemeEditorProvider>
      <AdminScreen />
    </BubbleThemeEditorProvider>
  )
}
