import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
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
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { deleteHotelFn, listHotelsFn } from '~/server/hotels'

type HotelFilters = {
  name: string
  city: string
  starRating: string
  status: 'active' | 'inactive' | 'all'
}

const emptyFilters: HotelFilters = { name: '', city: '', starRating: '', status: 'all' }

function toListData(filters: HotelFilters, page: number) {
  const stars = Number(filters.starRating)
  return {
    page,
    pageSize: 20,
    search: '',
    name: filters.name,
    city: filters.city,
    starRating: Number.isInteger(stars) && stars >= 1 ? stars : undefined,
    status: filters.status,
  }
}

export const Route = createFileRoute('/_authenticated/hotels')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'hotels'),
  loader: () => listHotelsFn({ data: toListData(emptyFilters, 1) }),
  component: HotelsPage,
})

function HotelsPage() {
  const initial = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const router = useRouter()
  const isSuper = auth.role === 'super_admin'
  const [draft, setDraft] = useState<HotelFilters>(emptyFilters)
  const [applied, setApplied] = useState<HotelFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listHotelsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: HotelFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  return (
    <div>
      <PageHeader
        title="Hotels"
        description="Catalog, status, and property details"
        actions={
          isSuper ? (
            <Button asChild>
              <Link to="/hotels/new">Add hotel</Link>
            </Button>
          ) : null
        }
      />
      <FilterBar onSubmit={() => apply(draft)} onClear={() => apply(emptyFilters)}>
        <Input
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Name"
        />
        <Input
          placeholder="City"
          value={draft.city}
          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          aria-label="City"
        />
        <FilterSelect
          label="Stars"
          value={draft.starRating}
          onChange={(value) => apply({ ...draft, starRating: value })}
        >
          <option value="">All stars</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>
              {n} star{n === 1 ? '' : 's'}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => apply({ ...draft, status: value as HotelFilters['status'] })}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState
          title="No hotels"
          description={isSuper ? 'Add the first Stayora property.' : 'No hotel is assigned to this account.'}
          actionLabel={isSuper ? 'Add hotel' : undefined}
          onAction={isSuper ? () => router.navigate({ to: '/hotels/new' }) : undefined}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Stars</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((hotel) => (
                  <TableRow key={String(hotel.id)}>
                    <TableCell className="font-medium">{String(hotel.name)}</TableCell>
                    <TableCell>
                      {String(hotel.city)}, {String(hotel.country)}
                    </TableCell>
                    <TableCell>{String(hotel.star_rating)}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(hotel.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/hotels/$hotelId" params={{ hotelId: String(hotel.id) }}>
                          View
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          to="/hotels/$hotelId/edit"
                          params={{ hotelId: String(hotel.id) }}
                        >
                          Edit
                        </Link>
                      </Button>
                      {isSuper ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Delete this hotel?')) return
                            try {
                              await deleteHotelFn({ data: { id: String(hotel.id) } })
                              toast.success('Hotel deleted')
                              await reload(data.page)
                            } catch (error) {
                              toast.error(toUserMessage(error))
                            }
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
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
