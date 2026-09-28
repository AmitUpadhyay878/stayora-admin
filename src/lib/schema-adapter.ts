import { query, queryOne } from '~/lib/db'
import { DatabaseUnavailableError } from '~/lib/errors'

let ready = false

export async function ensureSchema() {
  if (ready) return
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS "AdminRole" (
        "userId" text PRIMARY KEY,
        role text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "hotelId" text
      )
    `)
    await query(`ALTER TABLE "AdminRole" ADD COLUMN IF NOT EXISTS "hotelId" text`)
    await query(
      `ALTER TABLE "RoomCategory" ADD COLUMN IF NOT EXISTS "adminStatus" text NOT NULL DEFAULT 'available'`,
    )
    await query(`
      CREATE INDEX IF NOT EXISTS "Hotel_cityId_idx" ON "Hotel" ("cityId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Hotel_createdAt_idx" ON "Hotel" ("createdAt" DESC)
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Hotel_name_idx" ON "Hotel" (lower(name))
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_hotelId_idx" ON "RoomCategory" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_hotel_sort_idx" ON "RoomCategory" ("hotelId", "sortOrder")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_bedType_idx" ON "RoomCategory" (lower("bedType"))
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_priceFrom_idx" ON "RoomCategory" ("priceFrom")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_sleeps_idx" ON "RoomCategory" (sleeps)
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "RoomCategory_adminStatus_idx" ON "RoomCategory" ("adminStatus")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "BookingRequest_hotelId_idx" ON "BookingRequest" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "BookingRequest_hotel_status_idx" ON "BookingRequest" ("hotelId", status)
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "BookingRequest_checkIn_idx" ON "BookingRequest" ("checkIn")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "BookingRequest_email_idx" ON "BookingRequest" (lower(email))
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Review_hotelId_idx" ON "Review" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "AdminRole_hotelId_idx" ON "AdminRole" ("hotelId")
    `)
    for (const value of ['confirmed', 'cancelled', 'checked_in', 'completed']) {
      await query(`ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS '${value}'`).catch(
        () => undefined,
      )
    }
    ready = true
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) throw error
    throw new DatabaseUnavailableError()
  }
}

export function resetAdapterCache() {
  ready = false
}

export async function pingDb() {
  try {
    await queryOne('SELECT 1 as ok')
    return true
  } catch {
    return false
  }
}
