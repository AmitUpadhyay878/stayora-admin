import { createServerFn } from '@tanstack/react-start'
import { query, queryOne, type JsonRow } from '~/lib/db'
import { requireSession } from '~/lib/auth'
import { getScopeHotelId } from '~/lib/hotel-scope'
import { hotelClause, joinClauses } from '~/lib/ops-scope'
import { ensureSchema } from '~/lib/schema-adapter'

export type DashboardWidgets = {
  kpis: {
    occupied: number
    booked: number
    checkouts: number
    earnings: number
  }
  availability: { available: number; occupied: number; booked: number; notReady: number }
  revenueSeries: Array<{ label: string; value: number }>
  reservationSeries: Array<{ label: string; booked: number; cancelled: number }>
  rating: { average: number; count: number }
  tasks: Array<{
    id: string
    title: string
    dueAt: string
    status: string
  }>
  recentBookings: JsonRow[]
  activities: Array<{ id: string; title: string; at: string }>
}

function monthLabel(d: Date) {
  return d.toLocaleString('en-US', { month: 'short' })
}

function dayLabel(d: Date) {
  return String(d.getDate())
}

export const dashboardFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardWidgets> => {
    const session = await requireSession()
    await ensureSchema()
    const scope = getScopeHotelId(session)
    const bookingScope = hotelClause(scope, 'b')
    const roomScope = hotelClause(scope, 'r')
    const reviewScope = hotelClause(scope)
    const taskScope = hotelClause(scope)
    const empty: DashboardWidgets = {
      kpis: { occupied: 0, booked: 0, checkouts: 0, earnings: 0 },
      availability: { available: 0, occupied: 0, booked: 0, notReady: 0 },
      revenueSeries: [],
      reservationSeries: [],
      rating: { average: 0, count: 0 },
      tasks: [],
      recentBookings: [],
      activities: [],
    }
    if (scope.mode === 'none') return empty

    const bookingWhere = joinClauses([bookingScope.sql])
    const roomWhere = joinClauses([roomScope.sql])
    const reviewWhere = joinClauses([reviewScope.sql])
    const taskWhere = joinClauses([
      taskScope.sql,
      `status <> 'done'`,
    ])

    const occupied = await queryOne<{ n: string }>(
      `SELECT count(*)::text as n FROM "BookingRequest" b ${joinClauses([
        bookingScope.sql,
        `b.status::text = 'checked_in'`,
      ])}`,
      bookingScope.params,
    )
    const booked = await queryOne<{ n: string }>(
      `SELECT count(*)::text as n FROM "BookingRequest" b ${joinClauses([
        bookingScope.sql,
        `b.status::text = 'confirmed'`,
        `b."checkIn"::date <= CURRENT_DATE`,
        `b."checkOut"::date > CURRENT_DATE`,
      ])}`,
      bookingScope.params,
    )
    const checkouts = await queryOne<{ n: string }>(
      `SELECT count(*)::text as n FROM "BookingRequest" b ${joinClauses([
        bookingScope.sql,
        `b."checkOut"::date = CURRENT_DATE`,
        `b.status::text IN ('confirmed','checked_in','completed')`,
      ])}`,
      bookingScope.params,
    )
    const earnings = await queryOne<{ n: string }>(
      `SELECT COALESCE(sum(GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight"),0)::text as n
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       ${joinClauses([
         bookingScope.sql,
         `b.status::text IN ('confirmed','checked_in','completed')`,
         `date_trunc('month', b."checkIn") = date_trunc('month', CURRENT_DATE)`,
       ])}`,
      bookingScope.params,
    )

    const rooms = await query<{ status: string }>(
      `SELECT COALESCE(r."adminStatus", 'available') as status FROM "RoomCategory" r ${roomWhere}`,
      roomScope.params,
    )
    const available = rooms.filter((row) => row.status === 'available').length
    const notReady = rooms.filter((row) => row.status === 'unavailable').length
    const occupiedN = Number(occupied?.n ?? 0)
    const bookedN = Number(booked?.n ?? 0)

    const revenueRows = await query<{ month: string; n: string }>(
      `SELECT to_char(date_trunc('month', b."checkIn"), 'YYYY-MM') as month,
              COALESCE(sum(GREATEST(1, (b."checkOut"::date - b."checkIn"::date)) * h."pricePerNight"),0)::text as n
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       ${joinClauses([
         bookingScope.sql,
         `b.status::text IN ('confirmed','checked_in','completed')`,
         `b."checkIn" >= (date_trunc('month', CURRENT_DATE) - interval '5 months')`,
       ])}
       GROUP BY 1
       ORDER BY 1`,
      bookingScope.params,
    )
    const revenueMap = new Map(revenueRows.map((row) => [row.month, Number(row.n)]))
    const revenueSeries = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { label: monthLabel(d), value: revenueMap.get(key) ?? 0 }
    })

    const reservationRows = await query<{ day: string; booked: string; cancelled: string }>(
      `SELECT to_char(b."createdAt"::date, 'YYYY-MM-DD') as day,
              count(*) FILTER (WHERE b.status::text <> 'cancelled')::text as booked,
              count(*) FILTER (WHERE b.status::text = 'cancelled')::text as cancelled
       FROM "BookingRequest" b
       ${joinClauses([
         bookingScope.sql,
         `b."createdAt"::date >= CURRENT_DATE - 6`,
       ])}
       GROUP BY 1
       ORDER BY 1`,
      bookingScope.params,
    )
    const reservationMap = new Map(
      reservationRows.map((row) => [
        row.day,
        { booked: Number(row.booked), cancelled: Number(row.cancelled) },
      ]),
    )
    const reservationSeries = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      const found = reservationMap.get(key) ?? { booked: 0, cancelled: 0 }
      return { label: dayLabel(d), ...found }
    })

    const rating = await queryOne<{ avg: string; n: string }>(
      `SELECT COALESCE(avg(rating),0)::text as avg, count(*)::text as n FROM "Review" ${reviewWhere}`,
      reviewScope.params,
    )

    const tasks = await query<{ id: string; title: string; dueAt: string; status: string }>(
      `SELECT id, title, "dueAt"::text as "dueAt", status
       FROM "HousekeepingTask"
       ${taskWhere}
       ORDER BY "dueAt" ASC
       LIMIT 5`,
      taskScope.params,
    )

    const recentBookings =
      (await query(
        `SELECT b.id, b.status::text as status, b."checkIn" as check_in, b."checkOut" as check_out,
                trim(both from concat(b."firstName", ' ', b."lastName")) as guest_name,
                COALESCE(b."roomPreference", '') as room_name,
                h.name as hotel_name
         FROM "BookingRequest" b
         JOIN "Hotel" h ON h.id = b."hotelId"
         ${bookingWhere}
         ORDER BY b."createdAt" DESC
         LIMIT 8`,
        bookingScope.params,
      )) ?? []

    const activities: DashboardWidgets['activities'] = [
      ...recentBookings.slice(0, 4).map((row) => ({
        id: `b-${String(row.id)}`,
        title: `${String(row.guest_name ?? 'Guest')} · ${String(row.status)}`,
        at: String(row.check_in ?? ''),
      })),
      ...tasks.slice(0, 3).map((task) => ({
        id: `t-${task.id}`,
        title: task.title,
        at: task.dueAt,
      })),
    ]

    return {
      kpis: {
        occupied: occupiedN,
        booked: bookedN,
        checkouts: Number(checkouts?.n ?? 0),
        earnings: Number(earnings?.n ?? 0),
      },
      availability: {
        available: Math.max(0, available - occupiedN),
        occupied: occupiedN,
        booked: bookedN,
        notReady,
      },
      revenueSeries,
      reservationSeries,
      rating: { average: Number(rating?.avg ?? 0), count: Number(rating?.n ?? 0) },
      tasks,
      recentBookings,
      activities,
    }
  },
)
