import { describe, it, expect } from 'vitest'
import { hotelClause, joinClauses } from '../src/lib/ops-scope'

describe('hotelClause', () => {
  it('returns empty SQL for super-admin all hotels', () => {
    expect(hotelClause({ mode: 'all' })).toEqual({ sql: '', params: [] })
  })

  it('returns false SQL for unassigned sub-admin', () => {
    expect(hotelClause({ mode: 'none' })).toEqual({ sql: '1 = 0', params: [] })
  })

  it('binds hotel id for scoped sub-admin', () => {
    expect(hotelClause({ mode: 'one', hotelId: 'hotel-1' })).toEqual({
      sql: `"hotelId" = $1`,
      params: ['hotel-1'],
    })
  })

  it('prefixes alias when provided', () => {
    expect(hotelClause({ mode: 'one', hotelId: 'hotel-1' }, 't')).toEqual({
      sql: `t."hotelId" = $1`,
      params: ['hotel-1'],
    })
  })
})

describe('joinClauses', () => {
  it('omits WHERE when empty', () => {
    expect(joinClauses(['', ''])).toBe('')
  })

  it('joins remaining clauses', () => {
    expect(joinClauses(['"hotelId" = $1', `status = 'todo'`])).toBe(
      `WHERE "hotelId" = $1 AND status = 'todo'`,
    )
  })
})
