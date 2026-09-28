import { createServerFn } from '@tanstack/react-start'
import { query, queryOne } from '~/lib/db'
import { requireModule, requireSession } from '~/lib/auth'
import { ConflictError, ForbiddenError, NotFoundError } from '~/lib/errors'
import { getScopeHotelId } from '~/lib/hotel-scope'
import { guestListSchema, guestUpdateSchema, idSchema } from '~/lib/validators'

const GUEST_SELECT = `
  SELECT email,
         min(trim(both from concat("firstName", ' ', "lastName"))) as name,
         min(id) as id,
         '' as phone,
         count(*)::int as booking_count,
         max("createdAt") as created_at
  FROM "BookingRequest"
`

export const listGuestsFn = createServerFn({ method: 'POST' })
  .inputValidator(guestListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('guests')
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const params: unknown[] = []
    const where: string[] = []
    if (scope.mode === 'one') {
      params.push(scope.hotelId)
      where.push(`"hotelId" = $${params.length}`)
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const having: string[] = []
    const name = data.name || data.search
    if (name) {
      params.push(`%${name}%`)
      having.push(`min(trim(both from concat("firstName", ' ', "lastName"))) ILIKE $${params.length}`)
    }
    if (data.email) {
      params.push(`%${data.email}%`)
      having.push(`email ILIKE $${params.length}`)
    }
    if (data.phone) {
      params.push(`%${data.phone}%`)
      having.push(`min(trim(both from concat("firstName", ' ', "lastName"))) ILIKE $${params.length}`)
    }
    const havingClause = having.length ? `HAVING ${having.join(' AND ')}` : ''
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM (
         SELECT email FROM "BookingRequest" ${clause} GROUP BY email ${havingClause}
       ) g`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${GUEST_SELECT}
       ${clause}
       GROUP BY email
       ${havingClause}
       ORDER BY max("createdAt") DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const getGuestFn = createServerFn({ method: 'GET' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('guests')
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') throw new NotFoundError('Guest not found')
    const hotelFilter = scope.mode === 'one' ? ` AND "hotelId" = $2` : ''
    const lookupParams = scope.mode === 'one' ? [data.id, scope.hotelId] : [data.id]
    const row = await queryOne<{ email: string }>(
      `SELECT email FROM "BookingRequest" WHERE (id = $1 OR email = $1)${hotelFilter} LIMIT 1`,
      lookupParams,
    )
    if (!row) throw new NotFoundError('Guest not found')
    const guestParams = scope.mode === 'one' ? [row.email, scope.hotelId] : [row.email]
    const guestHotel = scope.mode === 'one' ? ` AND "hotelId" = $2` : ''
    const guest = await queryOne(
      `SELECT email,
              min(trim(both from concat("firstName", ' ', "lastName"))) as name,
              min(id) as id
       FROM "BookingRequest"
       WHERE email = $1${guestHotel}
       GROUP BY email`,
      guestParams,
    )
    if (!guest) throw new NotFoundError('Guest not found')
    const bookings = await query(
      `SELECT b.id, b.status::text as status, b."checkIn" as check_in, b."checkOut" as check_out,
              h.name as hotel_name, COALESCE(b."roomPreference", '') as room_name
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       WHERE b.email = $1${scope.mode === 'one' ? ' AND b."hotelId" = $2' : ''}
       ORDER BY b."checkIn" DESC`,
      guestParams,
    )
    return {
      guest: {
        id: String(guest?.id ?? data.id),
        name: String(guest?.name ?? ''),
        email: String(guest?.email ?? row.email),
        phone: '',
      },
      bookings,
    }
  })

export const updateGuestFn = createServerFn({ method: 'POST' })
  .inputValidator(guestUpdateSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    await requireModule('guests')
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') throw new NotFoundError('Guest not found')
    const hotelFilter = scope.mode === 'one' ? ` AND "hotelId" = $2` : ''
    const lookupParams = scope.mode === 'one' ? [data.id, scope.hotelId] : [data.id]
    const current = await queryOne<{ email: string; firstName: string; lastName: string }>(
      `SELECT email, "firstName" as "firstName", "lastName" as "lastName"
       FROM "BookingRequest" WHERE (id = $1 OR email = $1)${hotelFilter} LIMIT 1`,
      lookupParams,
    )
    if (!current) throw new NotFoundError('Guest not found')
    const email = data.email ?? current.email
    let firstName = current.firstName
    let lastName = current.lastName
    if (session.role === 'super_admin' && data.name) {
      const parts = data.name.trim().split(/\s+/)
      firstName = parts[0] ?? firstName
      lastName = parts.slice(1).join(' ') || lastName
    } else if (session.role !== 'super_admin' && session.role !== 'sub_admin') {
      throw new ForbiddenError()
    }
    const updateHotel = scope.mode === 'one' ? ` AND "hotelId" = $5` : ''
    const updateParams =
      scope.mode === 'one'
        ? [email, firstName, lastName, current.email, scope.hotelId]
        : [email, firstName, lastName, current.email]
    await query(
      `UPDATE "BookingRequest"
       SET email = $1, "firstName" = $2, "lastName" = $3
       WHERE email = $4${updateHotel}`,
      updateParams,
    )
    return {
      id: data.id,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone: data.phone ?? '',
    }
  })

export const deleteGuestFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    await requireModule('guests')
    const session = await requireSession()
    if (session.role !== 'super_admin') throw new ForbiddenError()
    const current = await queryOne<{ email: string }>(
      `SELECT email FROM "BookingRequest" WHERE id = $1 OR email = $1 LIMIT 1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Guest not found')
    const active = await queryOne(
      `SELECT id FROM "BookingRequest"
       WHERE email = $1 AND status::text IN ('pending','confirmed','checked_in')
       LIMIT 1`,
      [current.email],
    )
    if (active) {
      throw new ConflictError('Cannot delete a guest with active bookings')
    }
    await query(`DELETE FROM "BookingRequest" WHERE email = $1`, [current.email])
    return { ok: true }
  })

export const guestOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireModule('bookings')
  const scope = getScopeHotelId(session)
  if (scope.mode === 'none') return []
  if (scope.mode === 'one') {
    return query(
      `SELECT min(id) as id,
              min(trim(both from concat("firstName", ' ', "lastName"))) as name,
              email
       FROM "BookingRequest"
       WHERE "hotelId" = $1
       GROUP BY email
       ORDER BY 2`,
      [scope.hotelId],
    )
  }
  return query(
    `SELECT min(id) as id,
            min(trim(both from concat("firstName", ' ', "lastName"))) as name,
            email
     FROM "BookingRequest"
     GROUP BY email
     ORDER BY 2`,
  )
})
