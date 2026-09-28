import { createServerFn } from '@tanstack/react-start'
import { query } from '~/lib/db'
import { requireModule } from '~/lib/auth'
import { getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'
import { calendarQuerySchema } from '~/lib/validators'

export const listCalendarFn = createServerFn({ method: 'POST' })
  .inputValidator(calendarQuerySchema)
  .handler(async ({ data }) => {
    const session = await requireModule('calendar')
    await ensureSchema()
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') return { items: [] }
    const start = `${data.year}-${String(data.month).padStart(2, '0')}-01`
    const scoped = hotelClause(scope, 'b')
    const params = [...scoped.params, start]
    const startIdx = params.length
    const items = await query(
      `SELECT b.id, b.status::text as status, b."checkIn"::text as check_in, b."checkOut"::text as check_out,
              trim(both from concat(b."firstName", ' ', b."lastName")) as guest_name
       FROM "BookingRequest" b
       ${joinClauses([
         scoped.sql,
         `b."checkIn" < ($${startIdx}::date + interval '1 month')`,
         `b."checkOut" > $${startIdx}::date`,
       ])}
       ORDER BY b."checkIn"`,
      params,
    )
    return { items }
  })
