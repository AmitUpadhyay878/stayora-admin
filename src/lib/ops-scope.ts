import type { HotelScope } from '~/lib/hotel-scope'

export function hotelClause(
  scope: HotelScope,
  alias = '',
): { sql: string; params: unknown[] } {
  const col = alias ? `${alias}."hotelId"` : `"hotelId"`
  if (scope.mode === 'all') return { sql: '', params: [] }
  if (scope.mode === 'none') return { sql: '1 = 0', params: [] }
  return { sql: `${col} = $1`, params: [scope.hotelId] }
}

export function joinClauses(parts: string[]) {
  const clauses = parts.filter(Boolean)
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
}
