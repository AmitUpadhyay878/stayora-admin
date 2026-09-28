import { createServerFn } from '@tanstack/react-start'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import {
  housekeepingCreateSchema,
  housekeepingListSchema,
  housekeepingUpdateSchema,
} from '~/lib/validators'

const SELECT = `
  SELECT t.id, t."hotelId" as hotel_id, t."roomId" as room_id, t.title,
         t."dueAt"::text as due_at, t.status, t."createdAt"::text as created_at,
         COALESCE(r.name, '') as room_name
  FROM "HousekeepingTask" t
  LEFT JOIN "RoomCategory" r ON r.id = t."roomId"
`

export const listHousekeepingFn = createServerFn({ method: 'POST' })
  .inputValidator(housekeepingListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('housekeeping')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const scoped = hotelClause(scope, 't')
    const where = [scoped.sql]
    const params = [...scoped.params]
    if (data.roomId) {
      params.push(data.roomId)
      where.push(`t."roomId" = $${params.length}`)
    }
    if (data.status !== 'all') {
      params.push(data.status)
      where.push(`t.status = $${params.length}`)
    }
    const clause = joinClauses(where)
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "HousekeepingTask" t ${clause}`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${SELECT} ${clause} ORDER BY t."dueAt" ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const createHousekeepingFn = createServerFn({ method: 'POST' })
  .inputValidator(housekeepingCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('housekeeping')
    await ensureSchema()
    const hotelId = forceHotelId(session, data.hotelId)
    const id = createId()
    await query(
      `INSERT INTO "HousekeepingTask" (id, "hotelId", "roomId", title, "dueAt", status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, hotelId, data.roomId || null, data.title, data.dueAt, data.status],
    )
    return queryOne(`${SELECT} WHERE t.id = $1`, [id])
  })

export const updateHousekeepingFn = createServerFn({ method: 'POST' })
  .inputValidator(housekeepingUpdateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('housekeeping')
    await ensureSchema()
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "HousekeepingTask" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Task not found')
    assertHotelAccess(session, String(current.hotel_id))
    await query(`UPDATE "HousekeepingTask" SET status = $1 WHERE id = $2`, [data.status, data.id])
    return queryOne(`${SELECT} WHERE t.id = $1`, [data.id])
  })
