import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { Pagination } from '~/components/shared/pagination'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatMoney } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { deleteRoomFn, listRoomsFn } from '~/server/rooms'
import { hotelOptionsFn } from '~/server/hotels'

type RoomFilters = {
  hotelId: string
  search: string
  roomType: string
  capacity: string
  minPrice: string
  maxPrice: string
  status: 'available' | 'unavailable' | 'all'
}

const emptyFilters: RoomFilters = {
  hotelId: '',
  search: '',
  roomType: '',
  capacity: '',
  minPrice: '',
  maxPrice: '',
  status: 'all',
}

function toListData(filters: RoomFilters, page: number) {
  const capacity = Number(filters.capacity)
  const minPrice = Number(filters.minPrice)
  const maxPrice = Number(filters.maxPrice)
  return {
    page,
    pageSize: 20,
    search: filters.search,
    hotelId: filters.hotelId,
    roomType: filters.roomType,
    capacity: Number.isInteger(capacity) && capacity >= 1 ? capacity : undefined,
    minPrice: Number.isFinite(minPrice) && filters.minPrice !== '' ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) && filters.maxPrice !== '' ? maxPrice : undefined,
    status: filters.status,
  }
}

export const Route = createFileRoute('/_authenticated/rooms')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'rooms'),
  loader: async () => {
    const [rooms, hotels] = await Promise.all([
      listRoomsFn({ data: toListData(emptyFilters, 1) }),
      hotelOptionsFn(),
    ])
    return { rooms, hotels }
  },
  component: RoomsPage,
})

function RoomsPage() {
  const { rooms: initial, hotels } = Route.useLoaderData()
  const [draft, setDraft] = useState<RoomFilters>(emptyFilters)
  const [applied, setApplied] = useState<RoomFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listRoomsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: RoomFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  function patch(field: keyof RoomFilters, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <PageHeader
        title="Rooms"
        description="Inventory, rates, and availability"
        actions={
          <Button asChild>
            <Link to="/rooms/new">Add room</Link>
          </Button>
        }
      />
      <form
        className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        onSubmit={(e) => {
          e.preventDefault()
          apply(draft)
        }}
      >
        <select
          className="h-11 rounded-md border border-border bg-card px-3"
          value={draft.hotelId}
          onChange={(e) => apply({ ...draft, hotelId: e.target.value })}
          aria-label="Hotel"
        >
          <option value="">All hotels</option>
          {hotels.map((hotel) => (
            <option key={String(hotel.id)} value={String(hotel.id)}>
              {String(hotel.name)}
            </option>
          ))}
        </select>
        <Input
          placeholder="Room name"
          value={draft.search}
          onChange={(e) => patch('search', e.target.value)}
          aria-label="Room"
        />
        <Input
          placeholder="Type"
          value={draft.roomType}
          onChange={(e) => patch('roomType', e.target.value)}
          aria-label="Type"
        />
        <Input
          type="number"
          min={1}
          placeholder="Capacity"
          value={draft.capacity}
          onChange={(e) => patch('capacity', e.target.value)}
          aria-label="Capacity"
        />
        <Input
          type="number"
          min={0}
          placeholder="Min price"
          value={draft.minPrice}
          onChange={(e) => patch('minPrice', e.target.value)}
          aria-label="Min price"
        />
        <Input
          type="number"
          min={0}
          placeholder="Max price"
          value={draft.maxPrice}
          onChange={(e) => patch('maxPrice', e.target.value)}
          aria-label="Max price"
        />
        <select
          className="h-11 rounded-md border border-border bg-card px-3"
          value={draft.status}
          onChange={(e) =>
            apply({ ...draft, status: e.target.value as RoomFilters['status'] })
          }
          aria-label="Status"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-7">
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => apply(emptyFilters)}
          >
            Clear
          </Button>
        </div>
      </form>
      {data.items.length === 0 ? (
        <EmptyState title="No rooms" description="Add rooms to your hotels." />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((room) => (
                  <TableRow key={String(room.id)}>
                    <TableCell>{String(room.hotel_name ?? '—')}</TableCell>
                    <TableCell className="font-medium">{String(room.name)}</TableCell>
                    <TableCell>{String(room.room_type)}</TableCell>
                    <TableCell>{String(room.capacity)}</TableCell>
                    <TableCell>
                      {formatMoney(String(room.price_per_night), String(room.currency ?? 'USD'))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={String(room.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/rooms/$roomId" params={{ roomId: String(room.id) }}>
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/rooms/$roomId/edit" params={{ roomId: String(room.id) }}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm('Delete this room?')) return
                          try {
                            await deleteRoomFn({ data: { id: String(room.id) } })
                            toast.success('Room deleted')
                            await reload(data.page)
                          } catch (error) {
                            toast.error(toUserMessage(error))
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={(p) => void reload(p)}
          />
        </>
      )}
    </div>
  )
}
