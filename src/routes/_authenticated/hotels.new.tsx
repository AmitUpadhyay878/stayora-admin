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
import { requireSuperAdmin } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { createHotelFn } from '~/server/hotels'

export const Route = createFileRoute('/_authenticated/hotels/new')({
  beforeLoad: ({ context }) => requireSuperAdmin(context.auth),
  component: NewHotelPage,
})

function NewHotelPage() {
  const router = useRouter()
  const form = useForm<z.infer<typeof hotelSchema>>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: '',
      city: '',
      country: '',
      address: '',
      description: '',
      starRating: 4,
      thumbnailUrl: '',
      status: 'active',
      pricePerNight: 3000,
      email: '',
      phone: '',
      brandId: '',
    },
  })

  return (
    <div>
      <PageHeader title="Add hotel" description="Create a Stayora property" />
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                await createHotelFn({ data: values })
                toast.success('Hotel created')
                await router.navigate({ to: '/hotels' })
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            })}
          >
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <Field label="City" error={form.formState.errors.city?.message}>
              <Input {...form.register('city')} />
            </Field>
            <Field label="Country" error={form.formState.errors.country?.message}>
              <Input {...form.register('country')} />
            </Field>
            <Field label="Star rating">
              <Input type="number" min={1} max={5} {...form.register('starRating', { valueAsNumber: true })} />
            </Field>
            <Field label="Address" error={form.formState.errors.address?.message}>
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
                className="h-11 rounded-xl border border-border bg-card px-3"
                {...form.register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save hotel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
