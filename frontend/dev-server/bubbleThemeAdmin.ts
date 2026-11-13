import { mkdir, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'
import { validateBubbleTheme } from '../src/models/bubbleTheme.ts'

// Development only. The admin page (/admin) sends the theme of the homepage bubbles to this endpoint,
// and the endpoint writes it to src/config/bubble-theme.json. The file becomes the default after a commit.
// The production build has no endpoint and no admin page.

const ENDPOINT = '/__admin/bubble-theme'
const THEME_FILE = 'src/config/bubble-theme.json'
const MAX_BODY_BYTES = 256 * 1024

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
// A tunnel or a proxy (for example ngrok) adds these headers. A request from this computer has none of them.
const PROXY_HEADERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip']

function hostnameOf(value: string): string | null {
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname
  } catch {
    return null
  }
}

/**
 * True only for a request that the admin page on this computer sent.
 * The dev server can be open to the internet through a tunnel: such requests must not write files.
 */
function isLocalRequest(request: IncomingMessage): boolean {
  if (PROXY_HEADERS.some((name) => request.headers[name] !== undefined)) return false
  if (!LOCAL_ADDRESSES.has(request.socket.remoteAddress ?? '')) return false
  const host = hostnameOf(request.headers.host ?? '')
  if (host === null || !LOCAL_HOSTNAMES.has(host)) return false
  const origin = request.headers.origin
  if (origin !== undefined) {
    const originHost = hostnameOf(origin)
    if (originHost === null || !LOCAL_HOSTNAMES.has(originHost)) return false
  }
  const site = request.headers['sec-fetch-site']
  return site === undefined || site === 'same-origin'
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

/** Reads the request body as text. Returns null when the body is larger than the limit. */
async function readBody(request: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer)
    size += buffer.length
    if (size > MAX_BODY_BYTES) return null
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

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

          const body = await readBody(request)
          if (body === null) return send(response, 413, { ok: false, error: 'too-large' })

          let data: unknown
          try {
            data = JSON.parse(body)
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
