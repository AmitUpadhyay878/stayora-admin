import { z } from 'zod'

const emptyToUndef = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined
  return value
}

const toOptionalNumber = (value: unknown) => {
  const next = emptyToUndef(value)
  if (next === undefined) return undefined
  const n = Number(next)
  return Number.isFinite(n) ? n : undefined
}

const optionalNumber = z.preprocess(toOptionalNumber, z.number().finite().optional())
const optionalInt = z.preprocess(toOptionalNumber, z.number().int().optional())

export const roomListInputSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(emptyToUndef, z.string().optional().default('')),
  hotelId: z.preprocess(emptyToUndef, z.string().optional().default('')),
  roomType: z.preprocess(emptyToUndef, z.string().optional().default('')),
  capacity: optionalInt,
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  status: z.enum(['available', 'unavailable', 'all']).default('all'),
})

export type RoomListInput = z.infer<typeof roomListInputSchema>

export type RoomWhere = {
  clauses: string[]
  params: unknown[]
}

export function buildRoomWhere(
  data: RoomListInput,
  scopedHotelId?: string | null,
): RoomWhere {
  const clauses: string[] = []
  const params: unknown[] = []
  const hotelId = scopedHotelId || data.hotelId
  if (hotelId) {
    params.push(hotelId)
    clauses.push(`r."hotelId" = $${params.length}`)
  }
  if (data.search) {
    params.push(`%${data.search}%`)
    clauses.push(`r.name ILIKE $${params.length}`)
  }
  if (data.roomType) {
    params.push(`%${data.roomType}%`)
    clauses.push(`r."bedType" ILIKE $${params.length}`)
  }
  if (data.capacity != null && data.capacity >= 1) {
    params.push(data.capacity)
    clauses.push(`r.sleeps = $${params.length}`)
  }
  if (data.minPrice != null) {
    params.push(Math.round(data.minPrice))
    clauses.push(`r."priceFrom" >= $${params.length}`)
  }
  if (data.maxPrice != null) {
    params.push(Math.round(data.maxPrice))
    clauses.push(`r."priceFrom" <= $${params.length}`)
  }
  if (data.status === 'available') {
    clauses.push(`COALESCE(r."adminStatus", 'available') <> 'unavailable'`)
  }
  if (data.status === 'unavailable') {
    clauses.push(`r."adminStatus" = 'unavailable'`)
  }
  return { clauses, params }
}
