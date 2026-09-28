import { describe, expect, it } from 'vitest'
import { buildRoomWhere, roomListInputSchema } from '../src/lib/room-filters'

describe('room list filters', () => {
  it('accepts empty and null numeric fields after GET serialization', () => {
    const parsed = roomListInputSchema.parse({
      page: '1',
      pageSize: '20',
      search: '',
      hotelId: '',
      roomType: '',
      capacity: null,
      minPrice: '',
      maxPrice: undefined,
      status: 'all',
    })
    expect(parsed.page).toBe(1)
    expect(parsed.capacity).toBeUndefined()
    expect(parsed.minPrice).toBeUndefined()
    expect(parsed.hotelId).toBe('')
  })

  it('coerces typed filter values', () => {
    const parsed = roomListInputSchema.parse({
      page: 1,
      pageSize: 20,
      search: 'Deluxe',
      hotelId: 'hotel-1',
      roomType: 'King',
      capacity: '2',
      minPrice: '1000',
      maxPrice: '5000',
      status: 'available',
    })
    expect(parsed.capacity).toBe(2)
    expect(parsed.minPrice).toBe(1000)
    expect(parsed.maxPrice).toBe(5000)
    expect(parsed.hotelId).toBe('hotel-1')
  })

  it('builds SQL for hotel, room, type, capacity, price, status', () => {
    const parsed = roomListInputSchema.parse({
      page: 1,
      pageSize: 20,
      search: 'Suite',
      hotelId: 'h1',
      roomType: 'King',
      capacity: 2,
      minPrice: 1000,
      maxPrice: 4000,
      status: 'unavailable',
    })
    const { clauses, params } = buildRoomWhere(parsed)
    expect(clauses).toEqual([
      'r."hotelId" = $1',
      'r.name ILIKE $2',
      'r."bedType" ILIKE $3',
      'r.sleeps = $4',
      'r."priceFrom" >= $5',
      'r."priceFrom" <= $6',
      `r."adminStatus" = 'unavailable'`,
    ])
    expect(params).toEqual(['h1', '%Suite%', '%King%', 2, 1000, 4000])
  })
})
