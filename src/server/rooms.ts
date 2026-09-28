import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { buildRoomWhere, roomListInputSchema } from '~/lib/room-filters'
import { idSchema, roomSchema } from '~/lib/validators'
import { slugify } from '~/lib/utils'

const ROOM_SELECT = `
  SELECT r.id, r."hotelId" as hotel_id, r.name, r.slug, r.summary as description,
         r."bedType" as room_type, r.sleeps as capacity, r."priceFrom" as price_per_night,
         r.view, r.image, r."sortOrder" as sort_order, r."sizeSqFt" as size_sq_ft,
         h.name as hotel_name, 'INR' as currency,
         COALESCE(r."adminStatus", 'available') as status
  FROM "RoomCategory" r
  JOIN "Hotel" h ON h.id = r."hotelId"
`

export const listRoomsFn = createServerFn({ method: 'POST' })
  .inputValidator(roomListInputSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('rooms')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const { clauses, params } = buildRoomWhere(
      data,
      scope.mode === 'one' ? scope.hotelId : undefined,
    )
    const clause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count
       FROM "RoomCategory" r
       JOIN "Hotel" h ON h.id = r."hotelId"
       ${clause}`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${ROOM_SELECT} ${clause} ORDER BY h.name, r."sortOrder"
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const getRoomFn = createServerFn({ method: 'GET' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('rooms')
    await ensureSchema()
    const room = await queryOne(`${ROOM_SELECT} WHERE r.id = $1`, [data.id])
    if (!room) throw new NotFoundError('Room not found')
    assertHotelAccess(session, String(room.hotel_id))
    return room
  })

export const createRoomFn = createServerFn({ method: 'POST' })
  .inputValidator(roomSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('rooms')
    const hotelId = forceHotelId(session, data.hotelId)
    await ensureSchema()
    const id = createId()
    const slug = slugify(data.name) || id
    await query(
      `INSERT INTO "RoomCategory" (
         id, "hotelId", name, slug, summary, "sizeSqFt", sleeps, "bedType",
         image, "sortOrder", view, "priceFrom", extras, "adminStatus"
       ) VALUES ($1,$2,$3,$4,$5,300,$6,$7,'',0,'',$8,ARRAY[]::text[],$9)`,
      [
        id,
        hotelId,
        data.name,
        slug,
        data.description || data.name,
        data.capacity,
        data.roomType,
        Math.round(data.pricePerNight),
        data.status,
      ],
    )
    return queryOne(`${ROOM_SELECT} WHERE r.id = $1`, [id])
  })

export const updateRoomFn = createServerFn({ method: 'POST' })
  .inputValidator(roomSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await requireModule('rooms')
    const hotelId = forceHotelId(session, data.hotelId)
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "RoomCategory" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Room not found')
    assertHotelAccess(session, String(current.hotel_id))
    await ensureSchema()
    const row = await queryOne(
      `UPDATE "RoomCategory" SET
         "hotelId"=$1, name=$2, slug=$3, summary=$4, sleeps=$5, "bedType"=$6, "priceFrom"=$7, "adminStatus"=$8
       WHERE id=$9 RETURNING id`,
      [
        hotelId,
        data.name,
        slugify(data.name),
        data.description || data.name,
        data.capacity,
        data.roomType,
        Math.round(data.pricePerNight),
        data.status,
        data.id,
      ],
    )
    if (!row) throw new NotFoundError('Room not found')
    return queryOne(`${ROOM_SELECT} WHERE r.id = $1`, [data.id])
  })

export const deleteRoomFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('rooms')
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "RoomCategory" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Room not found')
    assertHotelAccess(session, String(current.hotel_id))
    await query(`DELETE FROM "RoomCategory" WHERE id = $1`, [data.id])
    return { ok: true }
  })

export const roomOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireModule('rooms')
  await ensureSchema()
  const scope = getScopeHotelId(session)
  if (scope.mode === 'none') return []
  if (scope.mode === 'one') {
    return query(`SELECT id, name FROM "RoomCategory" WHERE "hotelId" = $1 ORDER BY name`, [
      scope.hotelId,
    ])
  }
  return query(`SELECT id, name FROM "RoomCategory" ORDER BY name`)
})
