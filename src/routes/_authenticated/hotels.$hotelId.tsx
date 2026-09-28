import { Link, createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/page-header'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatMoney } from '~/lib/utils'
import { getHotelFn } from '~/server/hotels'

export const Route = createFileRoute('/_authenticated/hotels/$hotelId')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'hotels'),
  loader: ({ params }) => getHotelFn({ data: { id: params.hotelId } }),
  component: HotelDetailPage,
})

function HotelDetailPage() {
  const { hotel, rooms } = Route.useLoaderData()
  return (
    <div>
      <PageHeader
        title={String(hotel.name)}
        description={`${hotel.city}, ${hotel.country}`}
        actions={
          <Button asChild>
            <Link to="/hotels/$hotelId/edit" params={{ hotelId: String(hotel.id) }}>
              Edit
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status: <StatusBadge value={String(hotel.status)} />
            </p>
            <p>Rating: {String(hotel.rating ?? hotel.star_rating)}</p>
            <p>Nightly from: {formatMoney(String(hotel.price_per_night), 'INR')}</p>
            <p>Address: {String(hotel.address || '—')}</p>
            <p>Email: {String(hotel.email || '—')}</p>
            <p>Phone: {String(hotel.phone || '—')}</p>
            <p className="text-muted-foreground">{String(hotel.description || '')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rooms yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rooms.map((room) => (
                  <li key={String(room.id)} className="flex justify-between">
                    <span>{String(room.name)}</span>
                    <StatusBadge value={String(room.status)} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
