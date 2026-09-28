import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatDate, formatMoney } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { allowedTransitions, canDeleteBooking, type BookingStatus } from '~/lib/booking-status'
import {
  deleteBookingFn,
  getBookingFn,
  updateBookingStatusFn,
} from '~/server/bookings'

export const Route = createFileRoute('/_authenticated/bookings/$bookingId')({
  loader: ({ params }) => getBookingFn({ data: { id: params.bookingId } }),
  component: BookingDetailPage,
})

function BookingDetailPage() {
  const { booking, payments } = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const status = String(booking.status) as BookingStatus
  const next = allowedTransitions[status] ?? []

  return (
    <div>
      <PageHeader
        title={`Booking ${String(booking.id).slice(0, 8)}`}
        description={String(booking.guest_name ?? '')}
        actions={
          <>
            {next.map((s) => (
              <Button
                key={s}
                variant={s === 'cancelled' ? 'destructive' : 'default'}
                onClick={async () => {
                  try {
                    await updateBookingStatusFn({ data: { id: String(booking.id), status: s } })
                    toast.success(`Status set to ${s}`)
                    await router.invalidate()
                  } catch (error) {
                    toast.error(toUserMessage(error))
                  }
                }}
              >
                Mark {s.replace('_', ' ')}
              </Button>
            ))}
            {auth.role === 'super_admin' && canDeleteBooking(status) ? (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm('Delete this booking?')) return
                  try {
                    await deleteBookingFn({ data: { id: String(booking.id) } })
                    toast.success('Booking deleted')
                    await router.navigate({ to: '/bookings' })
                  } catch (error) {
                    toast.error(toUserMessage(error))
                  }
                }}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status: <StatusBadge value={status} />
            </p>
            <p>Hotel: {String(booking.hotel_name ?? '—')}</p>
            <p>Room: {String(booking.room_name ?? '—')}</p>
            <p>
              {formatDate(String(booking.check_in))} – {formatDate(String(booking.check_out))}
            </p>
            <p>Guests: {String(booking.guests_count)}</p>
            <p>{formatMoney(String(booking.total_amount), String(booking.currency ?? 'USD'))}</p>
            <p className="text-muted-foreground">{String(booking.notes ?? '')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{String(booking.guest_name ?? '—')}</p>
            <p>{String(booking.guest_email ?? '')}</p>
            <p>{String(booking.guest_phone ?? '')}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payments.length === 0 ? (
              <p className="text-muted-foreground">No payments recorded.</p>
            ) : (
              payments.map((p) => (
                <div key={String(p.id)} className="flex items-center justify-between">
                  <span>
                    {formatMoney(String(p.amount), String(p.currency ?? 'USD'))} · {String(p.method)}
                  </span>
                  <StatusBadge value={String(p.status)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
