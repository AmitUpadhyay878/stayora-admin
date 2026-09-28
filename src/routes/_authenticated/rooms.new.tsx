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
import { createRoomFn } from '~/server/rooms'

export const Route = createFileRoute('/_authenticated/rooms/new')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'rooms'),
  loader: () => hotelOptionsFn(),
  component: NewRoomPage,
})

function NewRoomPage() {
  const hotels = Route.useLoaderData()
  const router = useRouter()
  const form = useForm<z.infer<typeof roomSchema>>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      hotelId: hotels[0] ? String(hotels[0].id) : '',
      name: '',
      roomType: 'Standard',
      capacity: 2,
      pricePerNight: 3000,
      currency: 'INR',
      description: '',
      status: 'available',
    },
  })

  return (
    <div>
      <PageHeader title="Add room" />
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await createRoomFn({ data: values })
                toast.success('Room created')
                await router.navigate({ to: '/rooms' })
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            })}
          >
            <Field label="Hotel" error={form.formState.errors.hotelId?.message}>
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
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <Field label="Type">
              <Input {...form.register('roomType')} />
            </Field>
            <Field label="Capacity">
              <Input type="number" min={1} {...form.register('capacity', { valueAsNumber: true })} />
            </Field>
            <Field label="Price per night">
              <Input type="number" min={0} step="0.01" {...form.register('pricePerNight', { valueAsNumber: true })} />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save room
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
