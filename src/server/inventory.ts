import { createServerFn } from '@tanstack/react-start'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { NotFoundError } from '~/lib/errors'
import { assertHotelAccess, forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { idSchema, inventoryCreateSchema, inventoryListSchema, inventoryUpdateSchema } from '~/lib/validators'

const SELECT = `
  SELECT id, "hotelId" as hotel_id, name, sku, quantity, location, "updatedAt"::text as updated_at
  FROM "InventoryItem"
`

export const listInventoryFn = createServerFn({ method: 'POST' })
  .inputValidator(inventoryListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('inventory')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    const scoped = hotelClause(scope)
    const where = [scoped.sql]
    const params = [...scoped.params]
    if (data.name || data.search) {
      params.push(`%${data.name || data.search}%`)
      where.push(`name ILIKE $${params.length}`)
    }
    if (data.location) {
      params.push(`%${data.location}%`)
      where.push(`location ILIKE $${params.length}`)
    }
    const clause = joinClauses(where)
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "InventoryItem" ${clause}`,
      params,
    )
    params.push(data.pageSize, (data.page - 1) * data.pageSize)
    const items = await query(
      `${SELECT} ${clause} ORDER BY name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total: Number(countRow?.count ?? 0), page: data.page, pageSize: data.pageSize }
  })

export const createInventoryFn = createServerFn({ method: 'POST' })
  .inputValidator(inventoryCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('inventory')
    await ensureSchema()
    const hotelId = forceHotelId(session, data.hotelId)
    const id = createId()
    await query(
      `INSERT INTO "InventoryItem" (id, "hotelId", name, sku, quantity, location)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, hotelId, data.name, data.sku || '', data.quantity, data.location || ''],
    )
    return queryOne(`${SELECT} WHERE id = $1`, [id])
  })

export const updateInventoryFn = createServerFn({ method: 'POST' })
  .inputValidator(inventoryUpdateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('inventory')
    await ensureSchema()
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "InventoryItem" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Item not found')
    assertHotelAccess(session, String(current.hotel_id))
    await query(
      `UPDATE "InventoryItem"
       SET name = $1, sku = $2, quantity = $3, location = $4, "updatedAt" = now()
       WHERE id = $5`,
      [data.name, data.sku || '', data.quantity, data.location || '', data.id],
    )
    return queryOne(`${SELECT} WHERE id = $1`, [data.id])
  })

export const deleteInventoryFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('inventory')
    await ensureSchema()
    const current = await queryOne<{ hotel_id: string }>(
      `SELECT "hotelId" as hotel_id FROM "InventoryItem" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Item not found')
    assertHotelAccess(session, String(current.hotel_id))
    await query(`DELETE FROM "InventoryItem" WHERE id = $1`, [data.id])
    return { ok: true }
  })
