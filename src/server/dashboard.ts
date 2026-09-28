import { createServerFn } from '@tanstack/react-start'
import { query, queryOne } from '~/lib/db'
import { requireSession } from '~/lib/auth'
import { getScopeHotelId } from '~/lib/hotel-scope'
import { ensureSchema } from '~/lib/schema-adapter'

export type DashboardData =
  | {
      role: 'super_admin'
      kpis: {
        hotels: number
        rooms: number
        bookingsToday: number
        bookingsMonth: number
        revenue: number
        occupancy: number
      }
      recent: Array<Record<string, string | number | boolean | null>>
    }
  | {
      role: 'sub_admin'
      kpis: {
        pending: number
        arrivalsToday: number
        inHouse: number
        guests: number
      }
      recent: Array<Record<string, string | number | boolean | null>>
    }

export const dashboardFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardData> => {
    const session = await requireSession()
    await ensureSchema()
    const scope = getScopeHotelId(session)
    const hotelWhere = scope.mode === 'one' ? `WHERE b."hotelId" = $1` : ''
    const hotelParams = scope.mode === 'one' ? [scope.hotelId] : []
    const recent =
      scope.mode === 'none'
        ? []
        : await query(
            `SELECT b.id, b.status::text as status, b."checkIn" as check_in,
                    trim(both from concat(b."firstName", ' ', b."lastName")) as guest_name,
                    h.name as hotel_name
             FROM "BookingRequest" b
             JOIN "Hotel" h ON h.id = b."hotelId"
             ${hotelWhere}
             ORDER BY b."createdAt" DESC
             LIMIT 10`,
            hotelParams,
          )

    if (session.role === 'sub_admin') {
      if (scope.mode === 'none') {
        return {
          role: 'sub_admin',
          kpis: { pending: 0, arrivalsToday: 0, inHouse: 0, guests: 0 },
          recent: [],
        }
      }
      const hotelClause = `WHERE "hotelId" = $1`
      const pending = await queryOne<{ n: string }>(
        `SELECT count(*)::text as n FROM "BookingRequest" ${hotelClause} AND status::text = 'pending'`,
        hotelParams,
      )
      const arrivals = await queryOne<{ n: string }>(
        `SELECT count(*)::text as n FROM "BookingRequest"
         ${hotelClause} AND "checkIn"::date = CURRENT_DATE AND status::text IN ('confirmed','checked_in','pending')`,
        hotelParams,
      )
      const inHouse = await queryOne<{ n: string }>(
        `SELECT count(*)::text as n FROM "BookingRequest" ${hotelClause} AND status::text = 'checked_in'`,
        hotelParams,
      )
      const guests = await queryOne<{ n: string }>(
        `SELECT count(distinct email)::text as n FROM "BookingRequest" ${hotelClause}`,
        hotelParams,
      )
      return {
        role: 'sub_admin',
        kpis: {
          pending: Number(pending?.n ?? 0),
          arrivalsToday: Number(arrivals?.n ?? 0),
          inHouse: Number(inHouse?.n ?? 0),
          guests: Number(guests?.n ?? 0),
        },
        recent: recent as DashboardData['recent'],
      }
    }

    const hotels = await queryOne<{ n: string }>(`SELECT count(*)::text as n FROM "Hotel"`)
    const rooms = await queryOne<{ n: string }>(`SELECT count(*)::text as n FROM "RoomCategory"`)
    const bookingsToday = await queryOne<{ n: string }>(
      `SELECT count(*)::text as n FROM "BookingRequest" WHERE "createdAt"::date = CURRENT_DATE`,
    )
    const bookingsMonth = await queryOne<{ n: string }>(
      `SELECT count(*)::text as n FROM "BookingRequest"
       WHERE date_trunc('month', "createdAt") = date_trunc('month', CURRENT_DATE)`,
    )
    const revenue = await queryOne<{ n: string }>(
      `SELECT COALESCE(sum(GREATEST(1, ("checkOut"::date - "checkIn"::date)) * h."pricePerNight"),0)::text as n
       FROM "BookingRequest" b
       JOIN "Hotel" h ON h.id = b."hotelId"
       WHERE b.status::text IN ('confirmed','checked_in','completed')
         AND date_trunc('month', b."createdAt") = date_trunc('month', CURRENT_DATE)`,
    )
    const bookedNights = await queryOne<{ n: string }>(
      `SELECT COALESCE(sum(GREATEST(("checkOut"::date - "checkIn"::date), 1)),0)::text as n
       FROM "BookingRequest"
       WHERE status::text IN ('confirmed','checked_in','completed')
         AND "checkIn" < (date_trunc('month', CURRENT_DATE) + interval '1 month')
         AND "checkOut" >= date_trunc('month', CURRENT_DATE)`,
    )
    const roomCount = Number(rooms?.n ?? 0)
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate()
    const availableNights = roomCount * daysInMonth
    const occupancy =
      availableNights > 0
        ? Math.min(100, Math.round((Number(bookedNights?.n ?? 0) / availableNights) * 100))
        : 0

    return {
      role: 'super_admin',
      kpis: {
        hotels: Number(hotels?.n ?? 0),
        rooms: roomCount,
        bookingsToday: Number(bookingsToday?.n ?? 0),
        bookingsMonth: Number(bookingsMonth?.n ?? 0),
        revenue: Number(revenue?.n ?? 0),
        occupancy,
      },
      recent: recent as DashboardData['recent'],
    }
  },
)
