import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { validateBubbleTheme } from '../src/models/bubbleTheme.ts'
import { isLocalRequest, readBody, sendJson as send } from './localRequest.ts'

// Development only. The admin page (/admin) sends the theme of the homepage bubbles to this endpoint,
// and the endpoint writes it to src/config/bubble-theme.json. The file becomes the default after a commit.
// The production build has no endpoint and no admin page.

const ENDPOINT = '/__admin/bubble-theme'
const THEME_FILE = 'src/config/bubble-theme.json'
const MAX_BODY_BYTES = 256 * 1024

export function bubbleThemeAdmin(): Plugin {
  return {
    name: 'tarefinhas:bubble-theme-admin',
    apply: 'serve',
    configureServer(server) {
      const themePath = path.resolve(server.config.root, THEME_FILE)

      server.middlewares.use(ENDPOINT, (request, response) => {
        void (async () => {
          if (request.method !== 'POST') return send(response, 405, { ok: false, error: 'method-not-allowed' })
          if (!isLocalRequest(request)) return send(response, 403, { ok: false, error: 'local-only' })
          if (!(request.headers['content-type'] ?? '').startsWith('application/json')) {
            return send(response, 415, { ok: false, error: 'json-only' })
          }

          const raw = await readBody(request, MAX_BODY_BYTES)
          if (raw === null) return send(response, 413, { ok: false, error: 'too-large' })

          let data: unknown
          try {
            data = JSON.parse(raw.toString('utf-8'))
          } catch {
            return send(response, 400, { ok: false, error: 'invalid-json' })
          }
          const theme = validateBubbleTheme(data)
          if (theme === null) return send(response, 400, { ok: false, error: 'invalid-theme' })

          await mkdir(path.dirname(themePath), { recursive: true })
          await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`, 'utf-8')
          send(response, 200, { ok: true, theme })
        })().catch((error: unknown) => {
          server.config.logger.error(`[bubble-theme-admin] ${String(error)}`)
          if (!response.writableEnded) send(response, 500, { ok: false, error: 'write-failed' })
        })
      })
    },
  }
}
