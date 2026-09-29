import { ForbiddenError } from '~/lib/errors'
import type { AuthUser } from '~/lib/session'

export type HotelScope =
  | { mode: 'all' }
  | { mode: 'one'; hotelId: string }
  | { mode: 'none' }

export function assignedHotelId(
  value:
    | { hotelId?: unknown; hotelid?: unknown; hotel_id?: unknown }
    | string
    | null
    | undefined,
): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'string') return value
  const next = value.hotelId ?? value.hotelid ?? value.hotel_id
  if (next == null || next === '') return null
  return String(next)
}

export function getScopeHotelId(session: AuthUser): HotelScope {
  if (session.role !== 'sub_admin') return { mode: 'all' }
  const hotelId = assignedHotelId(session)
  if (!hotelId) return { mode: 'none' }
  return { mode: 'one', hotelId }
}

export function assertHotelAccess(session: AuthUser, hotelId: string) {
  if (session.role !== 'sub_admin') return
  const assigned = assignedHotelId(session)
  if (!assigned || assigned !== hotelId) {
    throw new ForbiddenError()
  }
}

export function forceHotelId(session: AuthUser, hotelId: string) {
  if (session.role !== 'sub_admin') return hotelId
  const assigned = assignedHotelId(session)
  if (!assigned) throw new ForbiddenError('No hotel assigned to this Sub-admin')
  if (hotelId && hotelId !== assigned) throw new ForbiddenError()
  return assigned
}
