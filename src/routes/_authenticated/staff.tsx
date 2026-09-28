import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar, FilterSelect } from '~/components/shared/filter-bar'
import { Field } from '~/components/shared/field'
import { StatusBadge } from '~/components/shared/status-badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { requireSuperAdmin } from '~/lib/super-admin-guard'
import { staffCreateSchema } from '~/lib/validators'
import { toUserMessage } from '~/lib/errors'
import { formatDate } from '~/lib/utils'
import { createStaffFn, deleteStaffFn, listStaffFn, updateStaffFn } from '~/server/staff'
import { hotelOptionsFn } from '~/server/hotels'
import type { SafeUser } from '~/lib/user-repo'
import type { JsonRow } from '~/lib/db'

type StaffFilters = {
  name: string
  email: string
  hotelId: string
  active: 'all' | 'active' | 'inactive'
}

const emptyFilters: StaffFilters = { name: '', email: '', hotelId: '', active: 'all' }

export const Route = createFileRoute('/_authenticated/staff')({
  beforeLoad: ({ context }) => requireSuperAdmin(context.auth),
  loader: async () => {
    const [staff, hotels] = await Promise.all([
      listStaffFn({ data: emptyFilters }),
      hotelOptionsFn(),
    ])
    return { staff, hotels }
  },
  component: StaffPage,
})

function StaffPage() {
  const { staff: initial, hotels } = Route.useLoaderData()
  const [draft, setDraft] = useState<StaffFilters>(emptyFilters)
  const [applied, setApplied] = useState<StaffFilters>(emptyFilters)
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SafeUser | null>(null)

  async function reload(next = applied) {
    try {
      setRows(await listStaffFn({ data: next }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: StaffFilters) {
    setDraft(next)
    setApplied(next)
    void reload(next)
  }

  return (
    <div>
      <PageHeader
        title="Sub-admins"
        description="Assign each Sub-admin to one hotel"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Add Sub-admin
          </Button>
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
          placeholder="Email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          aria-label="Email"
        />
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
        <FilterSelect
          label="Active"
          value={draft.active}
          onChange={(value) => apply({ ...draft, active: value as StaffFilters['active'] })}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState
          title={applied === emptyFilters ? 'No Sub-admins' : 'No matching Sub-admins'}
          description={
            applied === emptyFilters
              ? 'Super-admin can add staff who manage one assigned hotel.'
              : 'Try a different name, email, hotel, or active filter.'
          }
          actionLabel={applied === emptyFilters ? 'Add Sub-admin' : undefined}
          onAction={
            applied === emptyFilters
              ? () => {
                  setEditing(null)
                  setOpen(true)
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead>Name</TableHead>
                 <TableHead>Email</TableHead>
                 <TableHead>Hotel</TableHead>
                 <TableHead>Active</TableHead>
                 <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                   <TableCell className="font-medium">{row.name || '—'}</TableCell>
                   <TableCell>{row.email}</TableCell>
                   <TableCell>{row.hotelName || '—'}</TableCell>
                   <TableCell>
                    <StatusBadge value={row.active ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row)
                        setOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm('Delete this Sub-admin?')) return
                        try {
                          await deleteStaffFn({ data: { id: row.id } })
                          toast.success('Sub-admin deleted')
                          await reload()
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
      )}
      <StaffDialog
        open={open}
        editing={editing}
        hotels={hotels}
        onOpenChange={setOpen}
        onSaved={async () => {
          setOpen(false)
          await reload()
        }}
      />
    </div>
  )
}

function StaffDialog({
  open,
  editing,
  hotels,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  editing: SafeUser | null
  hotels: JsonRow[]
  onOpenChange: (v: boolean) => void
  onSaved: () => Promise<void>
}) {
  const isEdit = Boolean(editing)
  const form = useForm<z.infer<typeof staffCreateSchema>>({
    resolver: zodResolver(
      isEdit
        ? staffCreateSchema.extend({ password: z.union([z.string().min(8), z.literal('')]) })
        : staffCreateSchema,
    ),
    values: {
      name: editing?.name ?? '',
      email: editing?.email ?? '',
      password: '',
      active: editing?.active ?? true,
      hotelId: editing?.hotelId ?? (hotels[0] ? String(hotels[0].id) : ''),
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Sub-admin' : 'Add Sub-admin'}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              if (editing) {
                await updateStaffFn({
                  data: {
                    id: editing.id,
                    name: values.name,
                     email: values.email,
                     active: values.active,
                     hotelId: values.hotelId,
                     password: values.password,
                  },
                })
                toast.success('Sub-admin updated')
              } else {
                await createStaffFn({ data: values })
                toast.success('Sub-admin created')
              }
              await onSaved()
            } catch (error) {
              toast.error(toUserMessage(error))
            }
          })}
        >
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register('email')} />
          </Field>
          <Field
            label={isEdit ? 'New password (optional)' : 'Password'}
            error={form.formState.errors.password?.message}
          >
            <Input type="password" {...form.register('password')} />
          </Field>
          <Field label="Hotel" error={form.formState.errors.hotelId?.message}>
            <select
              className="h-11 w-full rounded-xl border border-border bg-card px-3"
              {...form.register('hotelId')}
            >
              {hotels.map((hotel) => (
                <option key={String(hotel.id)} value={String(hotel.id)}>
                  {String(hotel.name)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('active')} />
            Active
          </label>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
