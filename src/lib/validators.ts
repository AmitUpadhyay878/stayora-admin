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

export const housekeepingListSchema = paginationSchema.extend({
  roomId: optionalText,
  status: z.enum(['todo', 'doing', 'done', 'all']).default('all'),
})

export const housekeepingCreateSchema = z.object({
  hotelId: z.string().optional().default(''),
  roomId: optionalText,
  title: z.string().min(2, 'Title is required'),
  dueAt: z.string().min(1, 'Due date is required'),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
})

export const housekeepingUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['todo', 'doing', 'done']),
})

export const messageListSchema = paginationSchema.extend({
  guest: optionalText,
})

export const messageCreateSchema = z.object({
  hotelId: z.string().optional().default(''),
  guestEmail: z.string().email('Enter a valid email'),
  guestName: z.string().min(1, 'Guest name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message is required'),
})

export const messageReplySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1, 'Message is required'),
})

export const inventoryListSchema = paginationSchema.extend({
  name: optionalText,
  location: optionalText,
})

export const inventoryCreateSchema = z.object({
  hotelId: z.string().optional().default(''),
  name: z.string().min(1, 'Name is required'),
  sku: optionalText,
  quantity: z.coerce.number().int().min(0),
  location: optionalText,
})

export const inventoryUpdateSchema = inventoryCreateSchema.extend({
  id: z.string().min(1),
})

export const expenseListSchema = paginationSchema.extend({
  category: z
    .enum(['supplies', 'utilities', 'maintenance', 'salaries', 'marketing', 'other', 'all'])
    .default('all'),
  status: z.enum(['pending', 'completed', 'all']).default('all'),
  from: optionalText,
  to: optionalText,
})

export const expenseCreateSchema = z.object({
  hotelId: z.string().optional().default(''),
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['supplies', 'utilities', 'maintenance', 'salaries', 'marketing', 'other']),
  quantity: z.coerce.number().int().min(1).default(1),
  amount: z.coerce.number().min(0),
  expenseDate: z.string().min(1, 'Date is required'),
  status: z.enum(['pending', 'completed']).default('completed'),
})

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export const conciergeListSchema = paginationSchema.extend({
  status: z.enum(['open', 'done', 'all']).default('all'),
  guest: optionalText,
})

export const conciergeCreateSchema = z.object({
  hotelId: z.string().optional().default(''),
  guestName: z.string().min(1, 'Guest name is required'),
  guestEmail: z.string().email('Enter a valid email'),
  requestType: z.string().min(1, 'Type is required'),
  notes: optionalText,
  status: z.enum(['open', 'done']).default('open'),
})

export const conciergeUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'done']),
})
