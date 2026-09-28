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
import { hotelSchema } from '~/lib/validators'
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { getHotelFn, updateHotelFn } from '~/server/hotels'

export const Route = createFileRoute('/_authenticated/hotels/$hotelId/edit')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'hotels'),
  loader: ({ params }) => getHotelFn({ data: { id: params.hotelId } }),
  component: EditHotelPage,
})

function EditHotelPage() {
  const { hotel } = Route.useLoaderData()
  const router = useRouter()
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: String(hotel.name ?? ''),
      city: String(hotel.city ?? ''),
      country: String(hotel.country ?? ''),
      address: String(hotel.address ?? ''),
      description: String(hotel.description ?? ''),
      starRating: Number(hotel.star_rating ?? 4),
      thumbnailUrl: String(hotel.thumbnail_url ?? ''),
      status: (hotel.status as 'active' | 'inactive') ?? 'active',
      pricePerNight: Number(hotel.price_per_night ?? 0),
      email: String(hotel.email ?? ''),
      phone: String(hotel.phone ?? ''),
      brandId: String(hotel.brand_id ?? ''),
    },
  })

  return (
    <div>
      <PageHeader title="Edit hotel" />
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await updateHotelFn({ data: { ...values, id: String(hotel.id) } })
                toast.success('Hotel updated')
                await router.navigate({
                  to: '/hotels/$hotelId',
                  params: { hotelId: String(hotel.id) },
                })
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            })}
          >
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <Field label="City">
              <Input {...form.register('city')} />
            </Field>
            <Field label="Country">
              <Input {...form.register('country')} />
            </Field>
            <Field label="Star rating">
              <Input type="number" min={1} max={5} {...form.register('starRating', { valueAsNumber: true })} />
            </Field>
            <Field label="Address">
              <Input {...form.register('address')} />
            </Field>
            <Field label="Nightly rate (INR)">
              <Input type="number" min={0} {...form.register('pricePerNight', { valueAsNumber: true })} />
            </Field>
            <Field label="Email">
              <Input type="email" {...form.register('email')} />
            </Field>
            <Field label="Phone">
              <Input {...form.register('phone')} />
            </Field>
            <Field label="Thumbnail URL">
              <Input {...form.register('thumbnailUrl')} />
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
