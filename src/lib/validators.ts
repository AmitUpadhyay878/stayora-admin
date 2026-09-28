import { z } from 'zod'
import { BOOKING_STATUSES } from '~/lib/booking-status'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const emptyToUndef = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined
  return value
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.preprocess(emptyToUndef, z.string().optional().default('')),
})

export const optionalText = z.preprocess(emptyToUndef, z.string().optional().default(''))

const toOptionalNumber = (value: unknown) => {
  const next = emptyToUndef(value)
  if (next === undefined) return undefined
  const n = Number(next)
  return Number.isFinite(n) ? n : undefined
}

export const optionalNumber = z.preprocess(toOptionalNumber, z.number().finite().optional())
export const optionalInt = z.preprocess(toOptionalNumber, z.number().int().optional())

export const hotelListSchema = paginationSchema.extend({
  name: optionalText,
  city: optionalText,
  starRating: optionalInt,
  status: z.enum(['active', 'inactive', 'all']).default('all'),
})

export const bookingListSchema = paginationSchema.extend({
  guest: optionalText,
  hotelId: optionalText,
  room: optionalText,
  from: optionalText,
  to: optionalText,
  minTotal: optionalNumber,
  maxTotal: optionalNumber,
  status: z.string().optional().default('all'),
})

export const guestListSchema = paginationSchema.extend({
  name: optionalText,
  email: optionalText,
  phone: optionalText,
})

export const reviewListSchema = paginationSchema.extend({
  hotelId: optionalText,
  guest: optionalText,
  comment: optionalText,
  visibility: z.enum(['visible', 'hidden', 'all']).default('all'),
  rating: z.string().optional().default('all'),
})

export const paymentListSchema = paginationSchema.extend({
  guest: optionalText,
  minAmount: optionalNumber,
  maxAmount: optionalNumber,
  status: z.enum(['pending', 'paid', 'refunded', 'failed', 'all']).default('all'),
  method: z.enum(['card', 'cash', 'transfer', 'other', 'all']).default('all'),
})

export const staffListSchema = z.object({
  name: optionalText,
  email: optionalText,
  hotelId: optionalText,
  active: z.enum(['all', 'active', 'inactive']).default('all'),
})

export const staffCreateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  active: z.boolean(),
  hotelId: z.string().min(1, 'Hotel is required'),
})

export const staffUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8).optional().or(z.literal('')),
  active: z.boolean(),
  hotelId: z.string().min(1, 'Hotel is required'),
})

export const hotelSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  address: z.string(),
  description: z.string(),
  starRating: z.number().min(1).max(5),
  thumbnailUrl: z.string(),
  status: z.enum(['active', 'inactive']),
  pricePerNight: z.number().min(0),
  email: z.string(),
  phone: z.string(),
  brandId: z.string(),
})

export const roomSchema = z.object({
  hotelId: z.string().min(1, 'Hotel is required'),
  name: z.string().min(1, 'Name is required'),
  roomType: z.string().min(1, 'Type is required'),
  capacity: z.number().int().min(1),
  pricePerNight: z.number().min(0, 'Price is required'),
  currency: z.string().min(1),
  description: z.string(),
  status: z.enum(['available', 'unavailable']),
})

export const guestUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email('Enter a valid email').optional(),
  phone: z.string().optional().default(''),
})

export const bookingCreateSchema = z.object({
  hotelId: z.string().min(1),
  roomId: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guestsCount: z.number().int().min(1),
  notes: z.string(),
})

export const bookingUpdateSchema = bookingCreateSchema.extend({
  id: z.string().min(1),
  status: z.enum(BOOKING_STATUSES as [string, ...string[]]).optional(),
})

export const bookingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(BOOKING_STATUSES as [string, ...string[]]),
})

export const idSchema = z.object({ id: z.string().min(1) })
