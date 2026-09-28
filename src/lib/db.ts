import dns from 'node:dns'
import { neon, neonConfig } from '@neondatabase/serverless'
import { DatabaseUnavailableError } from '~/lib/errors'
import { getDatabaseUrl } from '~/lib/env'
import { ipv4Fetch } from '~/lib/ipv4-fetch'

dns.setDefaultResultOrder('ipv4first')

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type JsonRow = { [key: string]: JsonValue }

neonConfig.fetchFunction = ipv4Fetch as typeof fetch

let neonSql: ReturnType<typeof neon> | null = null

function sqlClient() {
  const url = getDatabaseUrl()
  if (!url) throw new DatabaseUnavailableError('DATABASE_URL is not set')
  if (!neonSql) {
    neonSql = neon(url, { fetchOptions: { cache: 'no-store' } })
  }
  return neonSql
}

export async function query<T extends JsonRow = JsonRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const rows = await sqlClient().query(text, params as unknown[])
    return rows as T[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/fetch failed|ETIMEDOUT|ENETUNREACH|ECONN|network|connecting to database/i.test(message)) {
      throw new DatabaseUnavailableError()
    }
    throw error
  }
}

export async function queryOne<T extends JsonRow = JsonRow>(
  text: string,
  params: unknown[] = [],
) {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export function getBackend() {
  return 'neon' as const
}

export function createId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
