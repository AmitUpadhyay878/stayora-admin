import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, getScopeHotelId } from '~/lib/hotel-scope'
import { idSchema, reviewListSchema } from '~/lib/validators'

export const listReviewsFn = createServerFn({ method: 'POST' })
  .inputValidator(reviewListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('reviews')
    const where: string[] = []
    const params: unknown[] = []
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const hotelId = scope.mode === 'one' ? scope.hotelId : data.hotelId
    if (hotelId) {
      params.push(hotelId)
      where.push(`r."hotelId" = $${params.length}`)
    }
    const guest = data.guest || data.search
    if (guest) {
      params.push(`%${guest}%`)
      where.push(`r.author ILIKE $${params.length}`)
    }
    if (data.comment) {
      params.push(`%${data.comment}%`)
      where.push(`r.body ILIKE $${params.length}`)
    }
    if (data.rating && data.rating !== 'all') {
      params.push(Number(data.rating))
      where.push(`r.rating = $${params.length}`)
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "Review" r ${clause}`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `SELECT r.id, r."hotelId" as hotel_id, r.author as guest_name, r.rating,
              r.body as comment, r."createdAt" as created_at, r.avatar,
              h.name as hotel_name, 'visible' as visibility
       FROM "Review" r
       JOIN "Hotel" h ON h.id = r."hotelId"
       ${clause}
       ORDER BY r."createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const setReviewVisibilityFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string(), visibility: z.enum(['visible', 'hidden']) }))
  .handler(async ({ data }) => {
    const session = await requireModule('reviews')
    const row = await queryOne<{ id: string; hotel_id: string }>(
      `SELECT id, "hotelId" as hotel_id FROM "Review" WHERE id = $1`,
      [data.id],
    )
    if (!row) throw new NotFoundError('Review not found')
    assertHotelAccess(session, String(row.hotel_id))
    return { ...row, visibility: data.visibility }
  })

export const deleteReviewFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('reviews')
    const row = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "Review" WHERE id = $1`,
      [data.id],
    )
    if (!row) throw new NotFoundError('Review not found')
    assertHotelAccess(session, String(row.hotel_id))
    await query(`DELETE FROM "Review" WHERE id = $1`, [data.id])
    return { ok: true }
  })
