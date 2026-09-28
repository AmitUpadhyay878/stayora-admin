import { createServerFn } from '@tanstack/react-start'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { idSchema, messageCreateSchema, messageListSchema, messageReplySchema } from '~/lib/validators'

export const listMessagesFn = createServerFn({ method: 'POST' })
  .inputValidator(messageListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('messages')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const scoped = hotelClause(scope)
    const where = [scoped.sql]
    const params = [...scoped.params]
    if (data.guest || data.search) {
      params.push(`%${data.guest || data.search}%`)
      where.push(`("guestName" ILIKE $${params.length} OR "guestEmail" ILIKE $${params.length} OR subject ILIKE $${params.length})`)
    }
    const clause = joinClauses(where)
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "MessageThread" ${clause}`,
      params,
    )
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `SELECT id, "hotelId" as hotel_id, "guestEmail" as guest_email, "guestName" as guest_name,
              subject, "updatedAt"::text as updated_at
       FROM "MessageThread" ${clause}
       ORDER BY "updatedAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total: Number(countRow?.count ?? 0), page: data.page, pageSize: data.pageSize }
  })

export const getMessageThreadFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('messages')
    await ensureSchema()
    const thread = await queryOne(
      `SELECT id, "hotelId" as hotel_id, "guestEmail" as guest_email, "guestName" as guest_name,
              subject, "updatedAt"::text as updated_at
       FROM "MessageThread" WHERE id = $1`,
      [data.id],
    )
    if (!thread) throw new NotFoundError('Thread not found')
    assertHotelAccess(session, String(thread.hotel_id))
    const messages = await query(
      `SELECT id, author, body, "createdAt"::text as created_at
       FROM "Message" WHERE "threadId" = $1 ORDER BY "createdAt" ASC`,
      [data.id],
    )
    return { thread, messages }
  })

export const createMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(messageCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('messages')
    await ensureSchema()
    const hotelId = forceHotelId(session, data.hotelId)
    const threadId = createId()
    const messageId = createId()
    await query(
      `INSERT INTO "MessageThread" (id, "hotelId", "guestEmail", "guestName", subject)
       VALUES ($1,$2,$3,$4,$5)`,
      [threadId, hotelId, data.guestEmail, data.guestName, data.subject],
    )
    await query(
      `INSERT INTO "Message" (id, "threadId", author, body) VALUES ($1,$2,'staff',$3)`,
      [messageId, threadId, data.body],
    )
    return { id: threadId }
  })

export const replyMessageFn = createServerFn({ method: 'POST' })
  .inputValidator(messageReplySchema)
  .handler(async ({ data }) => {
    const session = await requireModule('messages')
    await ensureSchema()
    const thread = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "MessageThread" WHERE id = $1`,
      [data.threadId],
    )
    if (!thread) throw new NotFoundError('Thread not found')
    assertHotelAccess(session, String(thread.hotel_id))
    await query(
      `INSERT INTO "Message" (id, "threadId", author, body) VALUES ($1,$2,'staff',$3)`,
      [createId(), data.threadId, data.body],
    )
    await query(`UPDATE "MessageThread" SET "updatedAt" = now() WHERE id = $1`, [data.threadId])
    return { ok: true }
  })
