import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { z } from 'zod'
import { PageHeader } from '~/components/shared/page-header'
import { Field } from '~/components/shared/field'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent } from '~/components/ui/card'
import { bookingCreateSchema } from '~/lib/validators'
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { hotelOptionsFn } from '~/server/hotels'
import { listRoomsFn } from '~/server/rooms'
import { createBookingFn } from '~/server/bookings'

export const Route = createFileRoute('/_authenticated/bookings/new')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'bookings'),
  loader: async () => {
    const [hotels, rooms] = await Promise.all([
      hotelOptionsFn(),
      listRoomsFn({ data: { page: 1, pageSize: 100, search: '', hotelId: '', status: 'all' } }),
    ])
    return { hotels, rooms: rooms.items }
  },
  component: NewBookingPage,
})

function NewBookingPage() {
  const { hotels, rooms } = Route.useLoaderData()
  const router = useRouter()
  const form = useForm<z.infer<typeof bookingCreateSchema>>({
    resolver: zodResolver(bookingCreateSchema),
    defaultValues: {
      hotelId: hotels[0] ? String(hotels[0].id) : '',
      roomId: rooms[0] ? String(rooms[0].id) : '',
      firstName: '',
      lastName: '',
      email: '',
      checkIn: '',
      checkOut: '',
      guestsCount: 1,
      notes: '',
    },
  })

  return (
    <div>
      <PageHeader title="New booking" />
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                const created = await createBookingFn({ data: values })
                toast.success('Booking created')
                await router.navigate({
                  to: '/bookings/$bookingId',
                  params: { bookingId: String(created?.id) },
                })
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            })}
          >
            <Field label="Hotel">
              <select className="h-11 rounded-xl border border-border bg-card px-3" {...form.register('hotelId')}>
                {hotels.map((h) => (
                  <option key={String(h.id)} value={String(h.id)}>
                    {String(h.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room">
              <select className="h-11 rounded-xl border border-border bg-card px-3" {...form.register('roomId')}>
                {rooms.map((r) => (
                  <option key={String(r.id)} value={String(r.id)}>
                    {String(r.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="First name" error={form.formState.errors.firstName?.message}>
              <Input {...form.register('firstName')} />
            </Field>
            <Field label="Last name" error={form.formState.errors.lastName?.message}>
              <Input {...form.register('lastName')} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register('email')} />
            </Field>
            <Field label="Guests count">
              <Input type="number" min={1} {...form.register('guestsCount', { valueAsNumber: true })} />
            </Field>
            <Field label="Check-in" error={form.formState.errors.checkIn?.message}>
              <Input type="date" {...form.register('checkIn')} />
            </Field>
            <Field label="Check-out" error={form.formState.errors.checkOut?.message}>
              <Input type="date" {...form.register('checkOut')} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <Textarea {...form.register('notes')} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create booking</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
