import { createServerFn } from '@tanstack/react-start'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { forceHotelId, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { expenseCreateSchema, expenseListSchema } from '~/lib/validators'

const SELECT = `
  SELECT id, "hotelId" as hotel_id, title, category, quantity, amount::text as amount,
         "expenseDate"::text as expense_date, status, "createdAt"::text as created_at
  FROM "Expense"
`

export const listExpensesFn = createServerFn({ method: 'POST' })
  .inputValidator(expenseListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('financials')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return {
        items: [],
        total: 0,
        page: data.page,
        pageSize: data.pageSize,
        totals: { expenses: 0, income: 0 },
        byCategory: [] as Array<{ category: string; amount: number }>,
        monthly: [] as Array<{ label: string; income: number; expense: number }>,
      }
    }
    const scoped = hotelClause(scope)
    const where = [scoped.sql]
    const params = [...scoped.params]
    if (data.category !== 'all') {
      params.push(data.category)
      where.push(`category = $${params.length}`)
    }
    if (data.status !== 'all') {
      params.push(data.status)
      where.push(`status = $${params.length}`)
    }
    if (data.from) {
      params.push(data.from)
      where.push(`"expenseDate" >= $${params.length}`)
    }
    if (data.to) {
      params.push(data.to)
      where.push(`"expenseDate" <= $${params.length}`)
    }
    const clause = joinClauses(where)
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM "Expense" ${clause}`,
      params,
    )
    const listParams = [...params, data.pageSize, (data.page - 1) * data.pageSize]
    const items = await query(
      `${SELECT} ${clause} ORDER BY "expenseDate" DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    )
    const expenseTotal = await queryOne<{ n: string }>(
      `SELECT COALESCE(sum(amount),0)::text as n FROM "Expense" ${joinClauses([scoped.sql])}`,
      scoped.params,
    )
    const income = await queryOne<{ n: string }>(
      `SELECT COALESCE(sum(GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight"),0)::text as n
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       ${joinClauses([
         hotelClause(scope, 'b').sql,
         `b.status::text IN ('confirmed','checked_in','completed')`,
       ])}`,
      hotelClause(scope, 'b').params,
    )
    const byCategory = await query<{ category: string; amount: string }>(
      `SELECT category, COALESCE(sum(amount),0)::text as amount
       FROM "Expense" ${joinClauses([scoped.sql])}
       GROUP BY category ORDER BY sum(amount) DESC`,
      scoped.params,
    )
    const monthlyExp = await query<{ month: string; n: string }>(
      `SELECT to_char(date_trunc('month', "expenseDate"), 'YYYY-MM') as month,
              COALESCE(sum(amount),0)::text as n
       FROM "Expense" ${joinClauses([
         scoped.sql,
         `"expenseDate" >= (date_trunc('month', CURRENT_DATE) - interval '11 months')`,
       ])}
       GROUP BY 1`,
      scoped.params,
    )
    const monthlyInc = await query<{ month: string; n: string }>(
      `SELECT to_char(date_trunc('month', b."checkIn"), 'YYYY-MM') as month,
              COALESCE(sum(GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight"),0)::text as n
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       ${joinClauses([
         hotelClause(scope, 'b').sql,
         `b.status::text IN ('confirmed','checked_in','completed')`,
         `b."checkIn" >= (date_trunc('month', CURRENT_DATE) - interval '11 months')`,
       ])}
       GROUP BY 1`,
      hotelClause(scope, 'b').params,
    )
    const expMap = new Map(monthlyExp.map((row) => [row.month, Number(row.n)]))
    const incMap = new Map(monthlyInc.map((row) => [row.month, Number(row.n)]))
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (11 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        label: d.toLocaleString('en-US', { month: 'short' }),
        income: incMap.get(key) ?? 0,
        expense: expMap.get(key) ?? 0,
      }
    })
    return {
      items,
      total: Number(countRow?.count ?? 0),
      page: data.page,
      pageSize: data.pageSize,
      totals: { expenses: Number(expenseTotal?.n ?? 0), income: Number(income?.n ?? 0) },
      byCategory: byCategory.map((row) => ({ category: row.category, amount: Number(row.amount) })),
      monthly,
    }
  })

export const createExpenseFn = createServerFn({ method: 'POST' })
  .inputValidator(expenseCreateSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('financials')
    await ensureSchema()
    const hotelId = forceHotelId(session, data.hotelId)
    const id = createId()
    await query(
      `INSERT INTO "Expense" (id, "hotelId", title, category, quantity, amount, "expenseDate", status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, hotelId, data.title, data.category, data.quantity, data.amount, data.expenseDate, data.status],
    )
    return queryOne(`${SELECT} WHERE id = $1`, [id])
  })
