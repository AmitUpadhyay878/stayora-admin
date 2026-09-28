import { ForbiddenError } from '~/lib/errors'
import type { AuthUser } from '~/lib/session'

export type HotelScope =
  | { mode: 'all' }
  | { mode: 'one'; hotelId: string }
  | { mode: 'none' }

export function getScopeHotelId(session: AuthUser): HotelScope {
  if (session.role !== 'sub_admin') return { mode: 'all' }
  if (!session.hotelId) return { mode: 'none' }
  return { mode: 'one', hotelId: session.hotelId }
}

export function assertHotelAccess(session: AuthUser, hotelId: string) {
  if (session.role !== 'sub_admin') return
  if (!session.hotelId || session.hotelId !== hotelId) {
    throw new ForbiddenError()
  }
}

export function forceHotelId(session: AuthUser, hotelId: string) {
  if (session.role !== 'sub_admin') return hotelId
  if (!session.hotelId) throw new ForbiddenError('No hotel assigned to this Sub-admin')
  if (hotelId && hotelId !== session.hotelId) throw new ForbiddenError()
  return session.hotelId
}
