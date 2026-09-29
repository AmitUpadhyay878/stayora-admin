import { describe, it, expect } from 'vitest'
import { ForbiddenError } from '../src/lib/errors'
import { assignedHotelId, assertHotelAccess, forceHotelId, getScopeHotelId } from '../src/lib/hotel-scope'
import type { AuthUser } from '../src/lib/session'

const superAdmin: AuthUser = {
  userId: '1',
  role: 'super_admin',
  email: 'a@b.c',
  name: 'A',
  hotelId: null,
  hotelName: null,
}

const subAdmin: AuthUser = {
  userId: '2',
  role: 'sub_admin',
  email: 's@b.c',
  name: 'S',
  hotelId: 'hotel-1',
  hotelName: 'Stayora Inn',
}

const unassigned: AuthUser = { ...subAdmin, hotelId: null }

describe('hotel scope', () => {
  it('gives super-admin all hotels', () => {
    expect(getScopeHotelId(superAdmin)).toEqual({ mode: 'all' })
    expect(forceHotelId(superAdmin, 'any')).toBe('any')
    expect(() => assertHotelAccess(superAdmin, 'any')).not.toThrow()
  })

  it('scopes sub-admin to assigned hotel', () => {
    expect(getScopeHotelId(subAdmin)).toEqual({ mode: 'one', hotelId: 'hotel-1' })
    expect(forceHotelId(subAdmin, 'hotel-1')).toBe('hotel-1')
    expect(forceHotelId(subAdmin, '')).toBe('hotel-1')
    expect(() => assertHotelAccess(subAdmin, 'hotel-1')).not.toThrow()
    expect(() => assertHotelAccess(subAdmin, 'other')).toThrow(ForbiddenError)
    expect(() => forceHotelId(subAdmin, 'other')).toThrow(ForbiddenError)
  })

  it('blocks unassigned sub-admin', () => {
    expect(getScopeHotelId(unassigned)).toEqual({ mode: 'none' })
    expect(() => forceHotelId(unassigned, 'hotel-1')).toThrow(ForbiddenError)
    expect(() => assertHotelAccess(unassigned, 'hotel-1')).toThrow(ForbiddenError)
  })

  it('reads hotelId from neon lowercase keys', () => {
    expect(assignedHotelId({ hotelid: 'hotel-1' })).toBe('hotel-1')
    expect(assignedHotelId({ hotelId: 'hotel-1' })).toBe('hotel-1')
    expect(assignedHotelId({ hotel_id: 'hotel-1' })).toBe('hotel-1')
    expect(assignedHotelId({ hotelId: null, hotelid: null })).toBe(null)
  })
})
