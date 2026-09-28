import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar } from '~/components/shared/filter-bar'
import { Pagination } from '~/components/shared/pagination'
import { Input } from '~/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { toUserMessage } from '~/lib/errors'
import { listGuestsFn } from '~/server/guests'

type GuestFilters = { name: string; email: string; phone: string }

const emptyFilters: GuestFilters = { name: '', email: '', phone: '' }

function toListData(filters: GuestFilters, page: number) {
  return {
    page,
    pageSize: 20,
    search: '',
    name: filters.name,
    email: filters.email,
    phone: filters.phone,
  }
}

export const Route = createFileRoute('/_authenticated/guests')({
  loader: () => listGuestsFn({ data: toListData(emptyFilters, 1) }),
  component: GuestsPage,
})

function GuestsPage() {
  const initial = Route.useLoaderData()
  const [draft, setDraft] = useState<GuestFilters>(emptyFilters)
  const [applied, setApplied] = useState<GuestFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listGuestsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: GuestFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  return (
    <div>
      <PageHeader title="Guests" description="Guest profiles and stay history" />
      <FilterBar onSubmit={() => apply(draft)} onClear={() => apply(emptyFilters)}>
        <Input
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Name"
        />
        <Input
          placeholder="Email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          aria-label="Email"
        />
        <Input
          placeholder="Phone"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          aria-label="Phone"
        />
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No guests" description="Guest records will appear after bookings are created." />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((g) => (
                  <TableRow key={String(g.id)}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary hover:underline"
                        to="/guests/$guestId"
                        params={{ guestId: String(g.id) }}
                      >
                        {String(g.name)}
                      </Link>
                    </TableCell>
                    <TableCell>{String(g.email)}</TableCell>
                    <TableCell>{String(g.phone || '—')}</TableCell>
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
