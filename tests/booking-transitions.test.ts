import { describe, it, expect } from 'vitest'
import { assertTransition, canDeleteBooking, allowedTransitions } from '../src/lib/booking-status'
import { ForbiddenError } from '../src/lib/errors'

describe('booking transitions', () => {
  it('allows the sub-admin path', () => {
    expect(() => assertTransition('pending', 'confirmed', 'sub_admin')).not.toThrow()
    expect(() => assertTransition('pending', 'cancelled', 'sub_admin')).not.toThrow()
    expect(() => assertTransition('confirmed', 'checked_in', 'sub_admin')).not.toThrow()
    expect(() => assertTransition('confirmed', 'cancelled', 'sub_admin')).not.toThrow()
    expect(() => assertTransition('checked_in', 'completed', 'sub_admin')).not.toThrow()
  })

  it('rejects illegal pairs', () => {
    expect(() => assertTransition('pending', 'completed', 'super_admin')).toThrow(ForbiddenError)
    expect(() => assertTransition('completed', 'pending', 'super_admin')).toThrow(ForbiddenError)
    expect(() => assertTransition('cancelled', 'confirmed', 'sub_admin')).toThrow(ForbiddenError)
    expect(() => assertTransition('checked_in', 'cancelled', 'sub_admin')).toThrow(ForbiddenError)
  })

  it('only deletes pending or cancelled', () => {
    expect(canDeleteBooking('pending')).toBe(true)
    expect(canDeleteBooking('cancelled')).toBe(true)
    expect(canDeleteBooking('confirmed')).toBe(false)
  })

  it('has empty transitions for terminal statuses', () => {
    expect(allowedTransitions.completed).toEqual([])
    expect(allowedTransitions.cancelled).toEqual([])
  })
})
