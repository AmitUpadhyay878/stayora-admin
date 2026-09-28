import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar } from '~/components/shared/filter-bar'
import { Pagination } from '~/components/shared/pagination'
import { Field } from '~/components/shared/field'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import {
  createInventoryFn,
  deleteInventoryFn,
  listInventoryFn,
  updateInventoryFn,
} from '~/server/inventory'
import { hotelOptionsFn } from '~/server/hotels'

type Filters = { name: string; location: string }
const emptyFilters: Filters = { name: '', location: '' }

export const Route = createFileRoute('/_authenticated/inventory')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'inventory'),
  loader: async () => {
    const [data, hotels] = await Promise.all([
      listInventoryFn({ data: { ...emptyFilters, page: 1, pageSize: 20, search: '' } }),
      hotelOptionsFn(),
    ])
    return { data, hotels }
  },
  component: InventoryPage,
})

function InventoryPage() {
  const initial = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [data, setData] = useState(initial.data)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    id: '',
    hotelId: '',
    name: '',
    sku: '',
    quantity: 0,
    location: '',
  })

  async function reload(page = 1, next = applied) {
    try {
      setData(await listInventoryFn({ data: { ...next, page, pageSize: 20, search: '' } }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock for housekeeping and ops"
        actions={
          <Button
            onClick={() => {
              setForm({ id: '', hotelId: '', name: '', sku: '', quantity: 0, location: '' })
              setOpen(true)
            }}
          >
            Add item
          </Button>
        }
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
          placeholder="Name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Name"
        />
        <Input
          placeholder="Location"
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          aria-label="Location"
        />
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No inventory" description="Add supplies, linens, or amenities." />
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell className="font-medium">{String(row.name)}</TableCell>
                    <TableCell>{String(row.sku || '—')}</TableCell>
                    <TableCell className="tabular-nums">{String(row.quantity)}</TableCell>
                    <TableCell>{String(row.location || '—')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            id: String(row.id),
                            hotelId: String(row.hotel_id),
                            name: String(row.name),
                            sku: String(row.sku ?? ''),
                            quantity: Number(row.quantity),
                            location: String(row.location ?? ''),
                          })
                          setOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm('Delete this item?')) return
                          try {
                            await deleteInventoryFn({ data: { id: String(row.id) } })
                            toast.success('Item deleted')
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
            onPage={(page) => void reload(page)}
          />
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit item' : 'Add item'}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                if (form.id) {
                  await updateInventoryFn({ data: form })
                  toast.success('Item updated')
                } else {
                  await createInventoryFn({
                    data: { ...form, hotelId: form.hotelId || (auth.hotelId ?? '') },
                  })
                  toast.success('Item created')
                }
                setOpen(false)
                await reload()
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            }}
          >
            {auth.role === 'super_admin' && !form.id ? (
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
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Location">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
