import { createServerFn } from '@tanstack/react-start'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { conciergeCreateSchema, conciergeListSchema, conciergeUpdateSchema } from '~/lib/validators'

const SELECT = `
  SELECT id, "hotelId" as hotel_id, "guestName" as guest_name, "guestEmail" as guest_email,
         "requestType" as request_type, notes, status, "createdAt"::text as created_at
  FROM "ConciergeRequest"
`

export const listConciergeFn = createServerFn({ method: 'POST' })
  .inputValidator(conciergeListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('concierge')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const scoped = hotelClause(scope)
    const where = [scoped.sql]
    const params = [...scoped.params]
    if (data.status !== 'all') {
      params.push(data.status)
      where.push(`status = $${params.length}`)
    }
    if (data.guest) {
      params.push(`%${data.guest}%`)
      where.push(`("guestName" ILIKE $${params.length} OR "guestEmail" ILIKE $${params.length})`)
    }
    const clause = joinClauses(where)
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "ConciergeRequest" ${clause}`,
      params,
    )
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${SELECT} ${clause} ORDER BY "createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total: Number(countRow?.count ?? 0), page: data.page, pageSize: data.pageSize }
  })

export const createConciergeFn = createServerFn({ method: 'POST' })
  .inputValidator(conciergeCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('concierge')
    await ensureSchema()
    const hotelId = forceHotelId(session, data.hotelId)
    const id = createId()
    await query(
      `INSERT INTO "ConciergeRequest" (id, "hotelId", "guestName", "guestEmail", "requestType", notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, hotelId, data.guestName, data.guestEmail, data.requestType, data.notes || '', data.status],
    )
    return queryOne(`${SELECT} WHERE id = $1`, [id])
  })

export const updateConciergeFn = createServerFn({ method: 'POST' })
  .inputValidator(conciergeUpdateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('concierge')
    await ensureSchema()
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "ConciergeRequest" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Request not found')
    assertHotelAccess(session, String(current.hotel_id))
    await query(`UPDATE "ConciergeRequest" SET status = $1 WHERE id = $2`, [data.status, data.id])
    return queryOne(`${SELECT} WHERE id = $1`, [data.id])
  })
