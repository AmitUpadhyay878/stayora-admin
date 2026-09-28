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
import { roomSchema } from '~/lib/validators'
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { hotelOptionsFn } from '~/server/hotels'
import { getRoomFn, updateRoomFn } from '~/server/rooms'

export const Route = createFileRoute('/_authenticated/rooms/$roomId/edit')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'rooms'),
  loader: async ({ params }) => {
    const [room, hotels] = await Promise.all([
      getRoomFn({ data: { id: params.roomId } }),
      hotelOptionsFn(),
    ])
    return { room, hotels }
  },
  component: EditRoomPage,
})

function EditRoomPage() {
  const { room, hotels } = Route.useLoaderData()
  const router = useRouter()
  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      hotelId: String(room.hotel_id),
      name: String(room.name),
      roomType: String(room.room_type),
      capacity: Number(room.capacity),
      pricePerNight: Number(room.price_per_night),
      currency: String(room.currency ?? 'INR'),
      description: String(room.description ?? ''),
      status: (room.status as 'available' | 'unavailable') ?? 'available',
    },
  })

  return (
    <div>
      <PageHeader title="Edit room" />
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await updateRoomFn({ data: { ...values, id: String(room.id) } })
                toast.success('Room updated')
                await router.navigate({ to: '/rooms/$roomId', params: { roomId: String(room.id) } })
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            })}
          >
            <Field label="Hotel">
              <select
                className="h-11 rounded-md border border-border bg-card px-3"
                {...form.register('hotelId')}
              >
                {hotels.map((h) => (
                  <option key={String(h.id)} value={String(h.id)}>
                    {String(h.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name">
              <Input {...form.register('name')} />
            </Field>
            <Field label="Type">
              <Input {...form.register('roomType')} />
            </Field>
            <Field label="Capacity">
              <Input type="number" {...form.register('capacity', { valueAsNumber: true })} />
            </Field>
            <Field label="Price per night">
              <Input type="number" step="0.01" {...form.register('pricePerNight', { valueAsNumber: true })} />
            </Field>
            <Field label="Currency">
              <Input {...form.register('currency')} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea {...form.register('description')} />
              </Field>
            </div>
            <Field label="Status">
              <select
                className="h-11 rounded-md border border-border bg-card px-3"
                {...form.register('status')}
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
