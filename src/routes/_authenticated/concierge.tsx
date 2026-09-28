import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar, FilterSelect } from '~/components/shared/filter-bar'
import { Pagination } from '~/components/shared/pagination'
import { StatusBadge } from '~/components/shared/status-badge'
import { Field } from '~/components/shared/field'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatDate } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { createConciergeFn, listConciergeFn, updateConciergeFn } from '~/server/concierge'
import { hotelOptionsFn } from '~/server/hotels'

type Filters = { guest: string; status: 'open' | 'done' | 'all' }
const emptyFilters: Filters = { guest: '', status: 'all' }

export const Route = createFileRoute('/_authenticated/concierge')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'concierge'),
  loader: async () => {
    const [data, hotels] = await Promise.all([
      listConciergeFn({ data: { ...emptyFilters, page: 1, pageSize: 20, search: '' } }),
      hotelOptionsFn(),
    ])
    return { data, hotels }
  },
  component: ConciergePage,
})

function ConciergePage() {
  const initial = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [data, setData] = useState(initial.data)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    hotelId: '',
    guestName: '',
    guestEmail: '',
    requestType: '',
    notes: '',
    status: 'open' as const,
  })

  async function reload(page = 1, next = applied) {
    try {
      setData(await listConciergeFn({ data: { ...next, page, pageSize: 20, search: '' } }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Concierge"
        description="Guest requests and follow-ups"
        actions={<Button onClick={() => setOpen(true)}>Add request</Button>}
      />
      <FilterBar
        onSubmit={() => {
          setApplied(draft)
          void reload(1, draft)
        }}
        onClear={() => {
          setDraft(emptyFilters)
          setApplied(emptyFilters)
          void reload(1, emptyFilters)
        }}
      >
        <Input
          placeholder="Guest"
          value={draft.guest}
          onChange={(e) => setDraft({ ...draft, guest: e.target.value })}
          aria-label="Guest"
        />
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => setDraft({ ...draft, status: value as Filters['status'] })}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No requests" description="Guest concierge requests will appear here." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>
                      <p className="font-medium">{String(row.guest_name)}</p>
                      <p className="text-xs text-muted-foreground">{String(row.guest_email)}</p>
                    </TableCell>
                    <TableCell>{String(row.request_type)}</TableCell>
                    <TableCell>{String(row.notes || '—')}</TableCell>
                    <TableCell>{formatDate(String(row.created_at))}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(row.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status !== 'done' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await updateConciergeFn({
                                data: { id: String(row.id), status: 'done' },
                              })
                              toast.success('Marked done')
                              await reload(data.page)
                            } catch (error) {
                              toast.error(toUserMessage(error))
                            }
                          }}
                        >
                          Done
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
            onPage={(page) => void reload(page)}
          />
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add request</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await createConciergeFn({
                  data: { ...form, hotelId: form.hotelId || (auth.hotelId ?? '') },
                })
                toast.success('Request created')
                setOpen(false)
                await reload()
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            }}
          >
            {auth.role === 'super_admin' ? (
              <Field label="Hotel">
                <select
                  className="h-11 w-full rounded-xl border border-border bg-card px-3"
                  value={form.hotelId}
                  onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
                >
                  <option value="">Select hotel</option>
                  {initial.hotels.map((hotel) => (
                    <option key={String(hotel.id)} value={String(hotel.id)}>
                      {String(hotel.name)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Guest name">
              <Input
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                required
              />
            </Field>
            <Field label="Guest email">
              <Input
                type="email"
                value={form.guestEmail}
                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                required
              />
            </Field>
            <Field label="Type">
              <Input
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value })}
                required
              />
            </Field>
            <Field label="Notes">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <Button type="submit">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
