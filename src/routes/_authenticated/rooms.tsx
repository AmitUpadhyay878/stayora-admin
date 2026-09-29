import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar, FilterSelect } from '~/components/shared/filter-bar'
import { Pagination } from '~/components/shared/pagination'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
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
  const { auth } = Route.useRouteContext()
  const isSuper = auth.role === 'super_admin'
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
      <FilterBar
        className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        onSubmit={() => apply(draft)}
        onClear={() => apply(emptyFilters)}
      >
        {isSuper ? (
          <FilterSelect
            label="Hotel"
            value={draft.hotelId}
            onChange={(value) => apply({ ...draft, hotelId: value })}
          >
            <option value="">All hotels</option>
            {hotels.map((hotel) => (
              <option key={String(hotel.id)} value={String(hotel.id)}>
                {String(hotel.name)}
              </option>
            ))}
          </FilterSelect>
        ) : null}
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
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => apply({ ...draft, status: value as RoomFilters['status'] })}
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No rooms" description="Add rooms to your hotels." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((room) => {
              const image = String(room.image ?? '')
              return (
                <div key={String(room.id)} className="overflow-hidden rounded-2xl border border-border bg-card">
                  {image ? (
                    <img src={image} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-secondary text-sm text-muted-foreground">
                      {String(room.room_type || 'Room')}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{String(room.name)}</p>
                        <p className="text-xs text-muted-foreground">{String(room.hotel_name ?? '—')}</p>
                      </div>
                      <StatusBadge value={String(room.status)} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {String(room.room_type)} · {String(room.capacity)} guests
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatMoney(String(room.price_per_night), String(room.currency ?? 'USD'))}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm">
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
                    </div>
                  </div>
                </div>
              )
            })}
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
