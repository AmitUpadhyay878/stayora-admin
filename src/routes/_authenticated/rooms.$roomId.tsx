import { Link, createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/page-header'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatMoney } from '~/lib/utils'
import { getRoomFn } from '~/server/rooms'

export const Route = createFileRoute('/_authenticated/rooms/$roomId')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'rooms'),
  loader: ({ params }) => getRoomFn({ data: { id: params.roomId } }),
  component: RoomDetailPage,
})

function RoomDetailPage() {
  const room = Route.useLoaderData()
  return (
    <div>
      <PageHeader
        title={String(room.name)}
        description={String(room.hotel_name ?? '')}
        actions={
          <Button asChild>
            <Link to="/rooms/$roomId/edit" params={{ roomId: String(room.id) }}>
              Edit
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          <p>Type: {String(room.room_type)}</p>
          <p>Capacity: {String(room.capacity)}</p>
          <p>Rate: {formatMoney(String(room.price_per_night), String(room.currency ?? 'USD'))}</p>
          <p>
            Status: <StatusBadge value={String(room.status)} />
          </p>
          <p className="text-muted-foreground">{String(room.description ?? '')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
