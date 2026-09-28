import { ForbiddenError } from '~/lib/errors'
import type { AdminRole } from '~/lib/auth-roles'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'

export const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
]

export const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['completed'],
  completed: [],
  cancelled: [],
}

export function canDeleteBooking(status: BookingStatus) {
  return status === 'cancelled' || status === 'pending'
}

export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
  _role: AdminRole,
) {
  const allowed = allowedTransitions[from] ?? []
  if (!allowed.includes(to)) {
    throw new ForbiddenError(`Cannot change booking from ${from} to ${to}`)
  }
}
