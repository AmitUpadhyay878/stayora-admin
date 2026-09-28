import { Link, createFileRoute, useSearch } from '@tanstack/react-router'
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
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { DonutChart } from '~/components/charts/donut-chart'
import { GroupedBarChart } from '~/components/charts/bar-chart'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatDate, formatMoney } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { createExpenseFn, listExpensesFn } from '~/server/expenses'
import { hotelOptionsFn } from '~/server/hotels'

type Filters = {
  category: 'supplies' | 'utilities' | 'maintenance' | 'salaries' | 'marketing' | 'other' | 'all'
  status: 'pending' | 'completed' | 'all'
}
const emptyFilters: Filters = { category: 'all', status: 'all' }

export const Route = createFileRoute('/_authenticated/financials')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === 'payments' ? 'payments' : 'expenses',
  }),
  beforeLoad: ({ context }) => requireAccess(context.auth, 'financials'),
  loader: async () => {
    const [data, hotels] = await Promise.all([
      listExpensesFn({
        data: { ...emptyFilters, page: 1, pageSize: 20, search: '', from: '', to: '' },
      }),
      hotelOptionsFn(),
    ])
    return { data, hotels }
  },
  component: FinancialsPage,
})

function FinancialsPage() {
  const initial = Route.useLoaderData()
  const search = useSearch({ from: '/_authenticated/financials' })
  const { auth } = Route.useRouteContext()
  const [draft, setDraft] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [data, setData] = useState(initial.data)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    hotelId: '',
    title: '',
    category: 'supplies' as const,
    quantity: 1,
    amount: 0,
    expenseDate: '',
    status: 'completed' as const,
  })
  const tab = search.tab
  const balance = data.totals.income - data.totals.expenses

  async function reload(page = 1, next = applied) {
    try {
      setData(
        await listExpensesFn({
          data: { ...next, page, pageSize: 20, search: '', from: '', to: '' },
        }),
      )
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Financials"
        description="Income from stays and logged expenses"
        actions={
          tab === 'expenses' ? <Button onClick={() => setOpen(true)}>Add expense</Button> : null
        }
      />
      <div className="mb-4 flex gap-2">
        <Button asChild variant={tab === 'expenses' ? 'default' : 'ghost'} size="sm">
          <Link to="/financials" search={{ tab: 'expenses' }}>
            Expenses
          </Link>
        </Button>
        <Button asChild variant={tab === 'payments' ? 'default' : 'ghost'} size="sm">
          <Link to="/financials" search={{ tab: 'payments' }}>
            Payments
          </Link>
        </Button>
      </div>
      {tab === 'payments' ? (
        <EmptyState
          title="No payments"
          description="Stayora bookings do not store payment records yet."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total balance</CardTitle>
                <p className="text-3xl font-semibold tabular-nums">{formatMoney(balance)}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total income</CardTitle>
                <p className="text-3xl font-semibold tabular-nums">{formatMoney(data.totals.income)}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total expenses</CardTitle>
                <p className="text-3xl font-semibold tabular-nums">{formatMoney(data.totals.expenses)}</p>
              </CardHeader>
            </Card>
          </div>
          <div className="mb-6 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Income vs expense</CardTitle>
              </CardHeader>
              <CardContent>
                <GroupedBarChart
                  data={data.monthly.map((row) => ({
                    label: row.label,
                    booked: row.income,
                    cancelled: row.expense,
                  }))}
                  ariaLabel="Monthly income versus expenses"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses yet.</p>
                ) : (
                  <DonutChart
                    slices={data.byCategory.map((row) => ({ label: row.category, value: row.amount }))}
                    totalLabel={formatMoney(data.totals.expenses)}
                    ariaLabel="Expense totals by category"
                  />
                )}
              </CardContent>
            </Card>
          </div>
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
              label="Category"
              value={draft.category}
              onChange={(value) => setDraft({ ...draft, category: value as Filters['category'] })}
            >
              <option value="all">All categories</option>
              <option value="supplies">Supplies</option>
              <option value="utilities">Utilities</option>
              <option value="maintenance">Maintenance</option>
              <option value="salaries">Salaries</option>
              <option value="marketing">Marketing</option>
              <option value="other">Other</option>
            </FilterSelect>
            <FilterSelect
              label="Status"
              value={draft.status}
              onChange={(value) => setDraft({ ...draft, status: value as Filters['status'] })}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </FilterSelect>
          </FilterBar>
          {data.items.length === 0 ? (
            <EmptyState title="No expenses" description="Log an expense to see it here." />
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((row) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="font-medium">{String(row.title)}</TableCell>
                        <TableCell>{String(row.category)}</TableCell>
                        <TableCell>{String(row.quantity)}</TableCell>
                        <TableCell>{formatMoney(Number(row.amount))}</TableCell>
                        <TableCell>{formatDate(String(row.expense_date))}</TableCell>
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
                onPage={(page) => void reload(page)}
              />
            </>
          )}
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await createExpenseFn({
                  data: { ...form, hotelId: form.hotelId || (auth.hotelId ?? '') },
                })
                toast.success('Expense added')
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
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Category">
              <select
                className="h-11 w-full rounded-xl border border-border bg-card px-3"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
              >
                <option value="supplies">Supplies</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="salaries">Salaries</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Amount">
              <Input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                required
              />
            </Field>
            <Button type="submit">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
