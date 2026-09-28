import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { Field } from '~/components/shared/field'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { formatDate } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { deleteGuestFn, getGuestFn, updateGuestFn } from '~/server/guests'

export const Route = createFileRoute('/_authenticated/guests/$guestId')({
  loader: ({ params }) => getGuestFn({ data: { id: params.guestId } }),
  component: GuestDetailPage,
})

function GuestDetailPage() {
  const { guest, bookings } = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const form = useForm({
    defaultValues: {
      name: String(guest.name ?? ''),
      email: String(guest.email ?? ''),
      phone: String(guest.phone ?? ''),
    },
  })

  return (
    <div>
      <PageHeader
        title={String(guest.name)}
        actions={
          auth.role === 'super_admin' ? (
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm('Delete this guest?')) return
                try {
                  await deleteGuestFn({ data: { id: String(guest.id) } })
                  toast.success('Guest deleted')
                  await router.navigate({ to: '/guests' })
                } catch (error) {
                  toast.error(toUserMessage(error))
                }
              }}
            >
              Delete
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await updateGuestFn({ data: { id: String(guest.id), ...values } })
                  toast.success('Guest updated')
                  await router.invalidate()
                } catch (error) {
                  toast.error(toUserMessage(error))
                }
              })}
            >
              {auth.role === 'super_admin' ? (
                <Field label="Name">
                  <Input {...form.register('name')} />
                </Field>
              ) : null}
              <Field label="Email">
                <Input type="email" {...form.register('email')} />
              </Field>
              <Field label="Phone">
                <Input {...form.register('phone')} />
              </Field>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Booking history</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={String(b.id)}>
                      <TableCell>
                        <Link
                          className="text-primary hover:underline"
                          to="/bookings/$bookingId"
                          params={{ bookingId: String(b.id) }}
                        >
                          {String(b.hotel_name ?? 'Stay')}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(String(b.check_in))}</TableCell>
                      <TableCell>
                        <StatusBadge value={String(b.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
