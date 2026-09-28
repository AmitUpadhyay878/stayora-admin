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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatDate } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { createHousekeepingFn, listHousekeepingFn, updateHousekeepingFn } from '~/server/housekeeping'
import { hotelOptionsFn } from '~/server/hotels'
import { roomOptionsFn } from '~/server/rooms'

type Filters = { roomId: string; status: 'todo' | 'doing' | 'done' | 'all' }
const emptyFilters: Filters = { roomId: '', status: 'all' }

export const Route = createFileRoute('/_authenticated/housekeeping')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'housekeeping'),
  loader: async () => {
    const [data, hotels, rooms] = await Promise.all([
      listHousekeepingFn({ data: { ...emptyFilters, page: 1, pageSize: 20, search: '' } }),
      hotelOptionsFn(),
      roomOptionsFn(),
    ])
    return { data, hotels, rooms }
  },
  component: HousekeepingPage,
})

function HousekeepingPage() {
  const initial = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [data, setData] = useState(initial.data)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    hotelId: '',
    roomId: '',
    title: '',
    dueAt: '',
    status: 'todo' as 'todo' | 'doing' | 'done',
  })

  async function reload(page = 1, next = applied) {
    try {
      setData(
        await listHousekeepingFn({
          data: { ...next, page, pageSize: 20, search: '' },
        }),
      )
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        description="Room tasks for the assigned hotel"
        actions={<Button onClick={() => setOpen(true)}>Add task</Button>}
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
        <FilterSelect
          label="Room"
          value={draft.roomId}
          onChange={(value) => setDraft({ ...draft, roomId: value })}
        >
          <option value="">All rooms</option>
          {initial.rooms.map((room) => (
            <option key={String(room.id)} value={String(room.id)}>
              {String(room.name)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => setDraft({ ...draft, status: value as Filters['status'] })}
        >
          <option value="all">All</option>
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No tasks" description="Add a housekeeping task for a room." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>{String(row.room_name || '—')}</TableCell>
                    <TableCell className="font-medium">{String(row.title)}</TableCell>
                    <TableCell>{formatDate(String(row.due_at))}</TableCell>
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
                              await updateHousekeepingFn({
                                data: { id: String(row.id), status: 'done' },
                              })
                              toast.success('Task completed')
                              await reload(data.page)
                            } catch (error) {
                              toast.error(toUserMessage(error))
                            }
                          }}
                        >
                          Complete
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
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await createHousekeepingFn({
                  data: {
                    ...form,
                    hotelId: form.hotelId || (auth.hotelId ?? ''),
                  },
                })
                toast.success('Task created')
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
            <Field label="Room">
              <select
                className="h-11 w-full rounded-xl border border-border bg-card px-3"
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              >
                <option value="">None</option>
                {initial.rooms.map((room) => (
                  <option key={String(room.id)} value={String(room.id)}>
                    {String(room.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Due">
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                required
              />
            </Field>
            <Button type="submit">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
