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
    await query(`
      CREATE TABLE IF NOT EXISTS "HousekeepingTask" (
        id text PRIMARY KEY,
        "hotelId" text NOT NULL,
        "roomId" text,
        title text NOT NULL,
        "dueAt" timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'todo',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "HousekeepingTask_hotelId_idx" ON "HousekeepingTask" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "HousekeepingTask_hotel_status_idx" ON "HousekeepingTask" ("hotelId", status)
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "HousekeepingTask_dueAt_idx" ON "HousekeepingTask" ("dueAt")
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS "MessageThread" (
        id text PRIMARY KEY,
        "hotelId" text NOT NULL,
        "guestEmail" text NOT NULL,
        "guestName" text NOT NULL,
        subject text NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "MessageThread_hotelId_idx" ON "MessageThread" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "MessageThread_updatedAt_idx" ON "MessageThread" ("updatedAt" DESC)
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS "Message" (
        id text PRIMARY KEY,
        "threadId" text NOT NULL,
        author text NOT NULL,
        body text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Message_threadId_idx" ON "Message" ("threadId")
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS "InventoryItem" (
        id text PRIMARY KEY,
        "hotelId" text NOT NULL,
        name text NOT NULL,
        sku text NOT NULL DEFAULT '',
        quantity integer NOT NULL DEFAULT 0,
        location text NOT NULL DEFAULT '',
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "InventoryItem_hotelId_idx" ON "InventoryItem" ("hotelId")
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS "Expense" (
        id text PRIMARY KEY,
        "hotelId" text NOT NULL,
        title text NOT NULL,
        category text NOT NULL,
        quantity integer NOT NULL DEFAULT 1,
        amount numeric NOT NULL,
        "expenseDate" date NOT NULL,
        status text NOT NULL DEFAULT 'completed',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Expense_hotelId_idx" ON "Expense" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Expense_hotel_status_idx" ON "Expense" ("hotelId", status)
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "Expense_expenseDate_idx" ON "Expense" ("expenseDate")
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS "ConciergeRequest" (
        id text PRIMARY KEY,
        "hotelId" text NOT NULL,
        "guestName" text NOT NULL,
        "guestEmail" text NOT NULL,
        "requestType" text NOT NULL,
        notes text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'open',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "ConciergeRequest_hotelId_idx" ON "ConciergeRequest" ("hotelId")
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS "ConciergeRequest_hotel_status_idx" ON "ConciergeRequest" ("hotelId", status)
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
