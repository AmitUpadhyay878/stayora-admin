import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createId, query, queryOne } from '~/lib/db'
import { requireModule, requireRole, requireSession } from '~/lib/auth'
import { ensureSchema } from '~/lib/schema-adapter'
import { ConflictError, NotFoundError } from '~/lib/errors'
import { assertHotelAccess, getScopeHotelId } from '~/lib/hotel-scope'
import { hotelListSchema, hotelSchema, idSchema } from '~/lib/validators'
import { slugify } from '~/lib/utils'

const HOTEL_SELECT = `
  SELECT h.id, h.name, h.slug, h.address, h.description,
         h."pricePerNight" as price_per_night, h.guests, h.rating, h."reviewCount" as review_count,
         h.featured, h.email, h.phone, h."cityId" as city_id, h."brandId" as brand_id,
         h."createdAt" as created_at, h."contactBlurb" as contact_blurb,
         h."diningName" as dining_name, h."diningBlurb" as dining_blurb,
         c.name as city, c.country, b.name as brand_name,
         COALESCE(h.images[1], '') as thumbnail_url,
         CASE WHEN h.featured THEN 'active' ELSE 'inactive' END as status,
         ROUND(h.rating)::int as star_rating
  FROM "Hotel" h
  JOIN "City" c ON c.id = h."cityId"
  JOIN "Brand" b ON b.id = h."brandId"
`

export const listHotelsFn = createServerFn({ method: 'POST' })
  .inputValidator(hotelListSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('hotels')
    await ensureSchema()
    const where: string[] = []
    const params: unknown[] = []
    const scope = getScopeHotelId(session)
    if (scope.mode === 'none') {
      return { items: [], total: 0, page: data.page, pageSize: data.pageSize }
    }
    if (scope.mode === 'one') {
      params.push(scope.hotelId)
      where.push(`h.id = $${params.length}`)
    }
    const name = data.name || data.search
    if (name) {
      params.push(`%${name}%`)
      where.push(`h.name ILIKE $${params.length}`)
    }
    if (data.city) {
      params.push(`%${data.city}%`)
      where.push(`(c.name ILIKE $${params.length} OR c.country ILIKE $${params.length})`)
    }
    if (data.starRating != null && data.starRating >= 1) {
      params.push(data.starRating)
      where.push(`ROUND(h.rating)::int = $${params.length}`)
    }
    if (data.status === 'active') where.push(`h.featured = true`)
    if (data.status === 'inactive') where.push(`h.featured = false`)
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const countRow = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count
       FROM "Hotel" h
       JOIN "City" c ON c.id = h."cityId"
       ${clause}`,
      params,
    )
    const total = Number(countRow?.count ?? 0)
    const offset = (data.page - 1) * data.pageSize
    params.push(data.pageSize, offset)
    const items = await query(
      `${HOTEL_SELECT} ${clause} ORDER BY h."createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )
    return { items, total, page: data.page, pageSize: data.pageSize }
  })

export const getHotelFn = createServerFn({ method: 'GET' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const session = await requireModule('hotels')
    assertHotelAccess(session, data.id)
    const hotel = await queryOne(`${HOTEL_SELECT} WHERE h.id = $1`, [data.id])
    if (!hotel) throw new NotFoundError('Hotel not found')
    const rooms = await query(
      `SELECT id, name, "bedType" as room_type, sleeps as capacity,
              "priceFrom" as price_per_night, summary as description,
              'available' as status
       FROM "RoomCategory" WHERE "hotelId" = $1 ORDER BY "sortOrder", name`,
      [data.id],
    )
    return { hotel, rooms }
  })

async function resolveCity(name: string, country: string, heroImage: string) {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM "City" WHERE lower(name) = lower($1) LIMIT 1`,
    [name],
  )
  if (existing) return String(existing.id)
  const id = createId()
  await query(
    `INSERT INTO "City" (id, name, slug, country, tagline, "heroImage", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6, now())`,
    [
      id,
      name,
      slugify(name) || id,
      country || 'India',
      name,
      heroImage ||
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
    ],
  )
  return id
}

async function resolveBrand(brandId?: string) {
  if (brandId) {
    const found = await queryOne(`SELECT id FROM "Brand" WHERE id = $1`, [brandId])
    if (found) return brandId
  }
  const first = await queryOne<{ id: string }>(`SELECT id FROM "Brand" ORDER BY name LIMIT 1`)
  if (!first) throw new ConflictError('No brands exist. Add a brand in the public catalog first.')
  return String(first.id)
}

export const createHotelFn = createServerFn({ method: 'POST' })
  .inputValidator(hotelSchema)
  .handler(async ({ data }) => {
    await requireRole('super_admin')
    await requireModule('hotels')
    const cityId = await resolveCity(data.city, data.country, data.thumbnailUrl)
    const brandId = await resolveBrand(data.brandId)
    const id = createId()
    const slugBase = slugify(data.name) || id
    const clash = await queryOne(`SELECT id FROM "Hotel" WHERE slug = $1`, [slugBase])
    const slug = clash ? `${slugBase}-${id.slice(0, 6)}` : slugBase
    const email = data.email || 'reservations@stayora.in'
    await query(
      `INSERT INTO "Hotel" (
         id, name, slug, "cityId", description, address, "pricePerNight", guests,
         rating, "reviewCount", amenities, images, featured, "createdAt", "brandId",
         "contactBlurb", "diningBlurb", "diningName", email, phone
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,0,ARRAY[]::text[],
        CASE WHEN $10 = '' THEN ARRAY[]::text[] ELSE ARRAY[$10]::text[] END,
        $11,now(),$12,$13,$14,$15,$16,$17
       )`,
      [
        id,
        data.name,
        slug,
        cityId,
        data.description || data.name,
        data.address || '',
        Math.round(data.pricePerNight || 0),
        2,
        data.starRating,
        data.thumbnailUrl,
        data.status === 'active',
        brandId,
        data.description || data.name,
        '',
        'Dining',
        email,
        data.phone || '',
      ],
    )
    return queryOne(`${HOTEL_SELECT} WHERE h.id = $1`, [id])
  })

export const updateHotelFn = createServerFn({ method: 'POST' })
  .inputValidator(hotelSchema.extend({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await requireModule('hotels')
    assertHotelAccess(session, data.id)
    const current = await queryOne(
      `SELECT images FROM "Hotel" WHERE id = $1`,
      [data.id],
    )
    if (!current) throw new NotFoundError('Hotel not found')
    const cityId = await resolveCity(data.city, data.country, data.thumbnailUrl)
    const slug = slugify(data.name)
    const email = data.email || 'reservations@stayora.in'
    await query(
      `UPDATE "Hotel" SET
         name=$1, slug=$2, "cityId"=$3, description=$4, address=$5,
         "pricePerNight"=$6, rating=$7, featured=$8, email=$9, phone=$10,
         images = CASE WHEN $11 = '' THEN images ELSE ARRAY[$11]::text[] || images END
       WHERE id=$12`,
      [
        data.name,
        slug,
        cityId,
        data.description || data.name,
        data.address || '',
        Math.round(data.pricePerNight || 0),
        data.starRating,
        data.status === 'active',
        email,
        data.phone || '',
        data.thumbnailUrl,
        data.id,
      ],
    )
    return queryOne(`${HOTEL_SELECT} WHERE h.id = $1`, [data.id])
  })

export const deleteHotelFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    await requireRole('super_admin')
    await requireModule('hotels')
    const blocked = await queryOne(
      `SELECT id FROM "BookingRequest"
       WHERE "hotelId" = $1
         AND status::text IN ('pending', 'confirmed', 'checked_in')
         AND "checkIn" >= CURRENT_DATE
       LIMIT 1`,
      [data.id],
    )
    if (blocked) {
      throw new ConflictError(
        'Cannot delete this hotel while it has upcoming confirmed or in-house bookings',
      )
    }
    await query(`DELETE FROM "NearbyAttraction" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "GalleryImage" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "WishlistItem" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "Review" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "RoomCategory" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "BookingRequest" WHERE "hotelId" = $1`, [data.id])
    await query(`DELETE FROM "Hotel" WHERE id = $1`, [data.id])
    return { ok: true }
  })

export const hotelOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireSession()
  if (session.role === 'sub_admin') {
    if (!session.hotelId) return []
    return query(`SELECT id, name FROM "Hotel" WHERE id = $1 ORDER BY name`, [session.hotelId])
  }
  await requireModule('hotels')
  return query(`SELECT id, name FROM "Hotel" ORDER BY name`)
})

export const brandOptionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireModule('hotels')
  return query(`SELECT id, name FROM "Brand" ORDER BY name`)
})
