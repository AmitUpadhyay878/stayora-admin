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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { formatDate, formatMoney } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { listBookingsFn } from '~/server/bookings'
import { hotelOptionsFn } from '~/server/hotels'
import { BOOKING_STATUSES } from '~/lib/booking-status'

type BookingFilters = {
  guest: string
  hotelId: string
  room: string
  from: string
  to: string
  minTotal: string
  maxTotal: string
  status: string
}

const emptyFilters: BookingFilters = {
  guest: '',
  hotelId: '',
  room: '',
  from: '',
  to: '',
  minTotal: '',
  maxTotal: '',
  status: 'all',
}

function toListData(filters: BookingFilters, page: number) {
  const minTotal = Number(filters.minTotal)
  const maxTotal = Number(filters.maxTotal)
  return {
    page,
    pageSize: 20,
    search: '',
    guest: filters.guest,
    hotelId: filters.hotelId,
    room: filters.room,
    from: filters.from,
    to: filters.to,
    minTotal: Number.isFinite(minTotal) && filters.minTotal !== '' ? minTotal : undefined,
    maxTotal: Number.isFinite(maxTotal) && filters.maxTotal !== '' ? maxTotal : undefined,
    status: filters.status,
  }
}

export const Route = createFileRoute('/_authenticated/bookings')({
  loader: async () => {
    const [bookings, hotels] = await Promise.all([
      listBookingsFn({ data: toListData(emptyFilters, 1) }),
      hotelOptionsFn(),
    ])
    return { bookings, hotels }
  },
  component: BookingsPage,
})

function BookingsPage() {
  const { bookings: initial, hotels } = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const isSuper = auth.role === 'super_admin'
  const [draft, setDraft] = useState<BookingFilters>(emptyFilters)
  const [applied, setApplied] = useState<BookingFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listBookingsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: BookingFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  return (
    <div>
      <PageHeader
        title="Reservation"
        description="Reservations across Stayora properties"
        actions={
          <Button asChild>
            <Link to="/bookings/new">New booking</Link>
          </Button>
        }
      />
      <FilterBar
        className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
        onSubmit={() => apply(draft)}
        onClear={() => apply(emptyFilters)}
      >
        <Input
          placeholder="Guest"
          value={draft.guest}
          onChange={(e) => setDraft({ ...draft, guest: e.target.value })}
          aria-label="Guest"
        />
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
          placeholder="Room"
          value={draft.room}
          onChange={(e) => setDraft({ ...draft, room: e.target.value })}
          aria-label="Room"
        />
        <Input
          type="date"
          value={draft.from}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          aria-label="Check-in from"
        />
        <Input
          type="number"
          min={0}
          placeholder="Min total"
          value={draft.minTotal}
          onChange={(e) => setDraft({ ...draft, minTotal: e.target.value })}
          aria-label="Min total"
        />
        <Input
          type="number"
          min={0}
          placeholder="Max total"
          value={draft.maxTotal}
          onChange={(e) => setDraft({ ...draft, maxTotal: e.target.value })}
          aria-label="Max total"
        />
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => apply({ ...draft, status: value })}
        >
          <option value="all">All statuses</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No bookings" description="Reservations will appear here." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        to="/bookings/$bookingId"
                        params={{ bookingId: String(row.id) }}
                      >
                        {String(row.guest_name ?? 'Guest')}
                      </Link>
                    </TableCell>
                    <TableCell>{String(row.hotel_name ?? '—')}</TableCell>
                    <TableCell>{String(row.room_name ?? '—')}</TableCell>
                    <TableCell>{formatDate(String(row.check_in))}</TableCell>
                    <TableCell>
                      {formatMoney(String(row.total_amount), String(row.currency ?? 'USD'))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={String(row.status)} />
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
