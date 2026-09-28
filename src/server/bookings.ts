import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule, requireSession } from '~/lib/auth'
import { ConflictError, ForbiddenError, NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import {
  bookingCreateSchema,
  bookingListSchema,
  bookingStatusSchema,
  bookingUpdateSchema,
  idSchema,
} from '~/lib/validators'
import {
  assertTransition,
  canDeleteBooking,
  type BookingStatus,
} from '~/lib/booking-status'
import { ensureSchema } from '~/lib/schema-adapter'



const BOOKING_SELECT = `
  SELECT b.id, b."hotelId" as hotel_id,
         b."firstName" as first_name, b."lastName" as last_name,
         trim(both from concat(b."firstName", ' ', b."lastName")) as guest_name,
         b.email as guest_email, b."checkIn" as check_in, b."checkOut" as check_out,
         b.guests as guests_count, b.status::text as status, b.message as notes,
         COALESCE(b."roomPreference", '') as room_name,
         b.adults, b.children, b.rooms, b."userId" as user_id,
         b."createdAt" as created_at,
         h.name as hotel_name, h."pricePerNight" as price_per_night,
         GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight" as total_amount,
         'INR' as currency
  FROM "BookingRequest" b
  JOIN "Hotel" h ON h.id = b."hotelId"
`

export const listBookingsFn = createServerFn({ method: 'POST' })
  .inputValidator(bookingListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('bookings')
    await ensureSchema()
    const where: string[] = []
    const params: unknown[] = []
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    if (scope.mode === 'one') {
      params.push(scope.hotelId)
      where.push(`b."hotelId" = $${params.length}`)
    } else if (data.hotelId) {
      params.push(data.hotelId)
      where.push(`b."hotelId" = $${params.length}`)
    }
    const guest = data.guest || data.search
    if (guest) {
      params.push(`%${guest}%`)
      where.push(
        `(b."firstName" ILIKE $${params.length} OR b."lastName" ILIKE $${params.length} OR b.email ILIKE $${params.length} OR b.id ILIKE $${params.length})`,
      )
    }
    if (data.room) {
      params.push(`%${data.room}%`)
      where.push(`COALESCE(b."roomPreference", '') ILIKE $${params.length}`)
    }
    if (data.status && data.status !== 'all') {
      params.push(data.status)
      where.push(`b.status::text = $${params.length}`)
    }
    if (data.from) {
      params.push(data.from)
      where.push(`b."checkIn"::date >= $${params.length}::date`)
    }
    if (data.to) {
      params.push(data.to)
      where.push(`b."checkIn"::date <= $${params.length}::date`)
    }
    if (data.minTotal != null) {
      params.push(Math.round(data.minTotal))
      where.push(
        `GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight" >= $${params.length}`,
      )
    }
    if (data.maxTotal != null) {
      params.push(Math.round(data.maxTotal))
      where.push(
        `GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight" <= $${params.length}`,
      )
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       ${clause}`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${BOOKING_SELECT} ${clause} ORDER BY b."checkIn" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const getBookingFn = createServerFn({ method: 'GET' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('bookings')
    const booking = await queryOne(`${BOOKING_SELECT} WHERE b.id = $1`, [data.id])
    if (!booking) throw new NotFoundError('Booking not found')
    assertHotelAccess(session, String(booking.hotel_id))
    return { booking, payments: [] as Array<Record<string, never>> }
  })

export const createBookingFn = createServerFn({ method: 'POST' })
  .inputValidator(bookingCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    await requireModule('bookings')
    const hotelId = forceHotelId(session, data.hotelId)
    await ensureSchema()
    const room = data.roomId
      ? await queryOne<{ name: string }>(
          `SELECT name FROM "RoomCategory" WHERE id = $1 AND "hotelId" = $2`,
          [data.roomId, hotelId],
        )
      : null
    const id = createId()
    await query(
      `INSERT INTO "BookingRequest" (
         id, "hotelId", "firstName", "lastName", email, "checkIn", "checkOut",
         guests, message, status, "createdAt", "userId", adults, children, rooms, "roomPreference", extras
       ) VALUES (
         $1,$2,$3,$4,$5,$6::timestamp,$7::timestamp,$8,$9,'pending', now(), $10, $8, 0, 1, $11, ARRAY[]::text[]
       )`,
      [
        id,
        hotelId,
        data.firstName,
        data.lastName,
        data.email,
        data.checkIn,
        data.checkOut,
        data.guestsCount,
        data.notes || null,
        session.userId,
        room?.name ?? null,
      ],
    )
    return queryOne(`${BOOKING_SELECT} WHERE b.id = $1`, [id])
  })

export const updateBookingFn = createServerFn({ method: 'POST' })
  .inputValidator(bookingUpdateSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    await requireModule('bookings')
    const hotelId = forceHotelId(session, data.hotelId)
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "BookingRequest" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Booking not found')
    assertHotelAccess(session, String(current.hotel_id))
    const room = data.roomId
      ? await queryOne<{ name: string }>(
          `SELECT name FROM "RoomCategory" WHERE id = $1 AND "hotelId" = $2`,
          [data.roomId, hotelId],
        )
      : null
    const row = await queryOne(
      `UPDATE "BookingRequest" SET
         "hotelId"=$1, "firstName"=$2, "lastName"=$3, email=$4,
         "checkIn"=$5::timestamp, "checkOut"=$6::timestamp, guests=$7,
         message=$8, adults=$7, "roomPreference"=COALESCE($9, "roomPreference")
       WHERE id=$10 RETURNING id`,
      [
        hotelId,
        data.firstName,
        data.lastName,
        data.email,
        data.checkIn,
        data.checkOut,
        data.guestsCount,
        data.notes || null,
        room?.name ?? null,
        data.id,
      ],
    )
    if (!row) throw new NotFoundError('Booking not found')
    return queryOne(`${BOOKING_SELECT} WHERE b.id = $1`, [data.id])
  })

export const updateBookingStatusFn = createServerFn({ method: 'POST' })
  .inputValidator(bookingStatusSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    await requireModule('bookings')
    await ensureSchema()
    const current = await queryOne<{ status: string; id: string; hotel_id: string }>(
      `SELECT id, status::text as status, "hotelId" as hotel_id FROM "BookingRequest" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Booking not found')
    assertHotelAccess(session, String(current.hotel_id))
    assertTransition(current.status as BookingStatus, data.status as BookingStatus, session.role)
    await query(
      `UPDATE "BookingRequest" SET status = $1::"BookingStatus" WHERE id = $2`,
      [data.status, data.id],
    )
    return queryOne(`${BOOKING_SELECT} WHERE b.id = $1`, [data.id])
  })

export const deleteBookingFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    await requireModule('bookings')
    if (session.role !== 'super_admin') throw new ForbiddenError()
    const current = await queryOne<{ status: string; hotel_id: string }>(
      `SELECT status::text as status, "hotelId" as hotel_id FROM "BookingRequest" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Booking not found')
    assertHotelAccess(session, String(current.hotel_id))
    if (!canDeleteBooking(current.status as BookingStatus)) {
      throw new ConflictError('Only pending or cancelled bookings can be deleted')
    }
    await query(`DELETE FROM "BookingRequest" WHERE id = $1`, [data.id])
    return { ok: true }
  })
