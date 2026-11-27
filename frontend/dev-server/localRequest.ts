import type { IncomingMessage, ServerResponse } from 'node:http'

// Shared by the development endpoints. The dev server can be open to the internet through a tunnel (ngrok):
// requests that come through it must not read or write files on this computer.

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

/** True only for a request that a page of this app, open on this computer, sent. */
export function isLocalRequest(request: IncomingMessage): boolean {
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

export function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

/** Reads the request body. Returns null when it is larger than `maxBytes`. */
export async function readBody(request: IncomingMessage, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer)
    size += buffer.length
    if (size > maxBytes) return null
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}
