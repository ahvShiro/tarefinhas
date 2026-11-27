import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Plugin } from 'vite'
import { isLocalRequest, readBody, sendJson } from './localRequest.ts'

// Development only, for now: the backend has no photo routes yet. The photos that prove a step was done are kept
// on this computer, in `local-photos/<account id>/` (outside Git), with an `index.json` that links each photo to
// its miniTask. The account comes from the login cookie, checked with the API (`GET /users/me`), so each person
// sees only their own photos. The production build has none of this.

const ENDPOINT = '/__local/photos'
const STORAGE_DIR = 'local-photos'
const MAX_PHOTO_BYTES = 20 * 1024 * 1024
const TOKEN_COOKIE = 'tarefinhas_token'
const ACCOUNT_CACHE_MS = 60_000
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

/** One photo, as the app sees it. */
interface PhotoRecord {
  id: string
  miniTaskId: string
  contentType: string
  fileName: string
  createdAt: string
}

/** What the app gets: the record without the file name on disk. */
function publicPhoto(record: PhotoRecord) {
  return { id: record.id, miniTaskId: record.miniTaskId, contentType: record.contentType, createdAt: record.createdAt }
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/** The image type read from the first bytes, so a file that only claims to be an image is refused. */
function sniffImageType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (bytes.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif'
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp'
  }
  return null
}

function readCookie(request: IncomingMessage, name: string): string | null {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=') || null
  }
  return null
}

export function taskPhotos(): Plugin {
  return {
    name: 'tarefinhas:task-photos',
    apply: 'serve',
    configureServer(server) {
      const root = path.resolve(server.config.root, STORAGE_DIR)
      const apiUrl = (server.config.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
      const accounts = new Map<string, { id: string; until: number }>()
      // Writes to an account's index run one after the other.
      const queues = new Map<string, Promise<unknown>>()

      /** The id of the account that is signed in, or null. */
      async function accountOf(request: IncomingMessage): Promise<string | null> {
        const token = readCookie(request, TOKEN_COOKIE)
        if (token === null) return null
        const cached = accounts.get(token)
        if (cached && cached.until > Date.now()) return cached.id
        const answer = await fetch(`${apiUrl}/users/me`, { headers: { Cookie: `${TOKEN_COOKIE}=${token}` } })
        if (!answer.ok) return null
        const { id } = (await answer.json()) as { id?: unknown }
        if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null
        accounts.set(token, { id, until: Date.now() + ACCOUNT_CACHE_MS })
        return id
      }

      const folderOf = (accountId: string) => path.join(root, accountId)
      const indexOf = (accountId: string) => path.join(folderOf(accountId), 'index.json')

      async function readIndex(accountId: string): Promise<PhotoRecord[]> {
        try {
          const data: unknown = JSON.parse(await readFile(indexOf(accountId), 'utf-8'))
          return Array.isArray(data) ? (data as PhotoRecord[]) : []
        } catch {
          return []
        }
      }

      /** Changes the index of an account, one change at a time, and writes it through a temporary file. */
      function changeIndex<T>(accountId: string, change: (records: PhotoRecord[]) => Promise<[PhotoRecord[], T]>) {
        const run = (queues.get(accountId) ?? Promise.resolve()).then(async () => {
          const [next, result] = await change(await readIndex(accountId))
          await mkdir(folderOf(accountId), { recursive: true })
          const temporary = `${indexOf(accountId)}.tmp`
          await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
          await rename(temporary, indexOf(accountId))
          return result
        })
        queues.set(accountId, run.catch(() => {}))
        return run
      }

      async function handle(request: IncomingMessage, response: ServerResponse) {
        if (!isLocalRequest(request)) return sendJson(response, 403, { ok: false, error: 'local-only' })
        const accountId = await accountOf(request)
        if (accountId === null) return sendJson(response, 401, { ok: false, error: 'signed-out' })

        const url = new URL(request.url ?? '/', 'http://localhost')
        const parts = url.pathname.split('/').filter(Boolean)

        // GET / : the photos of this account.
        if (parts.length === 0 && request.method === 'GET') {
          const records = await readIndex(accountId)
          return sendJson(response, 200, { ok: true, photos: records.map(publicPhoto) })
        }

        // POST /?miniTaskId=… : the body is the image.
        if (parts.length === 0 && request.method === 'POST') {
          const miniTaskId = url.searchParams.get('miniTaskId') ?? ''
          if (!ID_PATTERN.test(miniTaskId)) return sendJson(response, 400, { ok: false, error: 'invalid-mini-task' })
          const bytes = await readBody(request, MAX_PHOTO_BYTES)
          if (bytes === null) return sendJson(response, 413, { ok: false, error: 'too-large' })
          const contentType = sniffImageType(bytes)
          if (contentType === null) return sendJson(response, 415, { ok: false, error: 'not-an-image' })

          const id = randomUUID()
          const record: PhotoRecord = {
            id,
            miniTaskId,
            contentType,
            fileName: `${id}.${EXTENSIONS[contentType]}`,
            createdAt: new Date().toISOString(),
          }
          await mkdir(folderOf(accountId), { recursive: true })
          await writeFile(path.join(folderOf(accountId), record.fileName), bytes)
          await changeIndex(accountId, async (records) => [[...records, record], undefined])
          return sendJson(response, 201, { ok: true, photo: publicPhoto(record) })
        }

        const id = parts[0]
        if (!ID_PATTERN.test(id)) return sendJson(response, 404, { ok: false, error: 'not-found' })

        // GET /<id>/file : the image itself.
        if (parts.length === 2 && parts[1] === 'file' && request.method === 'GET') {
          const record = (await readIndex(accountId)).find((candidate) => candidate.id === id)
          if (!record) return sendJson(response, 404, { ok: false, error: 'not-found' })
          const bytes = await readFile(path.join(folderOf(accountId), record.fileName))
          response.statusCode = 200
          response.setHeader('Content-Type', record.contentType)
          response.setHeader('X-Content-Type-Options', 'nosniff')
          response.setHeader('Cache-Control', 'private, max-age=31536000, immutable')
          return response.end(bytes)
        }

        // DELETE /<id>
        if (parts.length === 1 && request.method === 'DELETE') {
          const removed = await changeIndex(accountId, async (records) => {
            const record = records.find((candidate) => candidate.id === id)
            return [records.filter((candidate) => candidate.id !== id), record]
          })
          if (!removed) return sendJson(response, 404, { ok: false, error: 'not-found' })
          await rm(path.join(folderOf(accountId), removed.fileName), { force: true })
          return sendJson(response, 200, { ok: true })
        }

        return sendJson(response, 405, { ok: false, error: 'method-not-allowed' })
      }

      server.middlewares.use(ENDPOINT, (request, response) => {
        handle(request, response).catch((error: unknown) => {
          server.config.logger.error(`[task-photos] ${String(error)}`)
          if (!response.writableEnded) sendJson(response, 500, { ok: false, error: 'failed' })
        })
      })
    },
  }
}
