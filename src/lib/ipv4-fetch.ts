import https from 'node:https'
import { Buffer } from 'node:buffer'

function headerRecord(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  if (!headers) return out
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key] = value
    return out
  }
  return { ...headers }
}

function bodyToBuffer(body: BodyInit | null | undefined): Buffer | undefined {
  if (body == null) return undefined
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof Uint8Array) return Buffer.from(body)
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  return Buffer.from(String(body))
}

export function ipv4Fetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const url =
    typeof input === 'string'
      ? new URL(input)
      : input instanceof URL
        ? input
        : new URL(input.url)
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = headerRecord(init.headers)
  const body = bodyToBuffer(init.body as BodyInit | null | undefined)
  if (body && !headers['content-length'] && !headers['Content-Length']) {
    headers['content-length'] = String(body.length)
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        family: 4,
        servername: url.hostname,
        timeout: 20000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          const responseHeaders = new Headers()
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') responseHeaders.set(key, value)
            else if (Array.isArray(value)) responseHeaders.set(key, value.join(','))
          }
          resolve(
            new Response(buf, {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage ?? '',
              headers: responseHeaders,
            }),
          )
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('Neon request timed out'))
    })
    if (body) req.write(body)
    req.end()
  })
}
