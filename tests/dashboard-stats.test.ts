import { describe, it, expect } from 'vitest'
import {
  availabilityCounts,
  bookedVsCancelled,
  monthRevenue,
  occupiedCount,
} from '../src/lib/dashboard-stats'

describe('dashboard stats', () => {
  it('counts occupied from checked_in rows', () => {
    expect(
      occupiedCount([
        { status: 'checked_in' },
        { status: 'confirmed' },
        { status: 'checked_in' },
        { status: 'cancelled' },
      ]),
    ).toBe(2)
  })

  it('sums non-cancelled revenue for the given month', () => {
    const month = new Date('2026-04-01T00:00:00Z')
    expect(
      monthRevenue(
        [
          { status: 'confirmed', total: 100, checkIn: '2026-04-10' },
          { status: 'checked_in', total: 50, checkIn: '2026-04-02' },
          { status: 'cancelled', total: 80, checkIn: '2026-04-03' },
          { status: 'completed', total: 20, checkIn: '2026-03-30' },
        ],
        month,
      ),
    ).toBe(150)
  })

  it('totals booked vs cancelled series', () => {
    expect(
      bookedVsCancelled([
        { booked: 4, cancelled: 1 },
        { booked: 2, cancelled: 3 },
      ]),
    ).toEqual({ booked: 6, cancelled: 4 })
  })

  it('derives availability from room status and in-house count', () => {
    expect(
      availabilityCounts(
        [
          { status: 'available' },
          { status: 'available' },
          { status: 'available' },
          { status: 'unavailable' },
        ],
        1,
      ),
    ).toEqual({ available: 2, occupied: 1, booked: 0, notReady: 1 })
  })
})
