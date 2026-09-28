import { createFileRoute } from '@tanstack/react-router'
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
import { deleteReviewFn, listReviewsFn, setReviewVisibilityFn } from '~/server/reviews'
import { hotelOptionsFn } from '~/server/hotels'

type ReviewFilters = {
  hotelId: string
  guest: string
  rating: string
  comment: string
  visibility: 'visible' | 'hidden' | 'all'
}

const emptyFilters: ReviewFilters = {
  hotelId: '',
  guest: '',
  rating: 'all',
  comment: '',
  visibility: 'all',
}

function toListData(filters: ReviewFilters, page: number) {
  return {
    page,
    pageSize: 20,
    search: '',
    hotelId: filters.hotelId,
    guest: filters.guest,
    rating: filters.rating,
    comment: filters.comment,
    visibility: filters.visibility,
  }
}

export const Route = createFileRoute('/_authenticated/reviews')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'reviews'),
  loader: async () => {
    const [reviews, hotels] = await Promise.all([
      listReviewsFn({ data: toListData(emptyFilters, 1) }),
      hotelOptionsFn(),
    ])
    return { reviews, hotels }
  },
  component: ReviewsPage,
})

function ReviewsPage() {
  const { reviews: initial, hotels } = Route.useLoaderData()
  const [draft, setDraft] = useState<ReviewFilters>(emptyFilters)
  const [applied, setApplied] = useState<ReviewFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listReviewsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: ReviewFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  return (
    <div>
      <PageHeader title="Reviews" description="Hide, show, or remove guest reviews" />
      <FilterBar onSubmit={() => apply(draft)} onClear={() => apply(emptyFilters)}>
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
        <Input
          placeholder="Guest"
          value={draft.guest}
          onChange={(e) => setDraft({ ...draft, guest: e.target.value })}
          aria-label="Guest"
        />
        <FilterSelect
          label="Rating"
          value={draft.rating}
          onChange={(value) => apply({ ...draft, rating: value })}
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} star{n === 1 ? '' : 's'}
            </option>
          ))}
        </FilterSelect>
        <Input
          placeholder="Comment"
          value={draft.comment}
          onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          aria-label="Comment"
        />
        <FilterSelect
          label="Visibility"
          value={draft.visibility}
          onChange={(value) => apply({ ...draft, visibility: value as ReviewFilters['visibility'] })}
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No reviews" description="Guest reviews will appear here." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow key={String(r.id)}>
                    <TableCell>{String(r.hotel_name ?? '—')}</TableCell>
                    <TableCell>{String(r.guest_name ?? '—')}</TableCell>
                    <TableCell>{String(r.rating)}/5</TableCell>
                    <TableCell className="max-w-sm truncate">{String(r.comment)}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(r.visibility)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await setReviewVisibilityFn({
                              data: {
                                id: String(r.id),
                                visibility: r.visibility === 'hidden' ? 'visible' : 'hidden',
                              },
                            })
                            toast.success('Updated')
                            await reload(data.page)
                          } catch (error) {
                            toast.error(toUserMessage(error))
                          }
                        }}
                      >
                        Hide
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm('Delete this review?')) return
                          try {
                            await deleteReviewFn({ data: { id: String(r.id) } })
                            toast.success('Deleted')
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
