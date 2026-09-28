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
import { requireAccess } from '~/lib/super-admin-guard'
import { formatMoney } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import { listPaymentsFn, markPaymentPaidFn, markPaymentRefundedFn } from '~/server/payments'

type PaymentFilters = {
  guest: string
  minAmount: string
  maxAmount: string
  method: 'card' | 'cash' | 'transfer' | 'other' | 'all'
  status: 'pending' | 'paid' | 'refunded' | 'failed' | 'all'
}

const emptyFilters: PaymentFilters = {
  guest: '',
  minAmount: '',
  maxAmount: '',
  method: 'all',
  status: 'all',
}

function toListData(filters: PaymentFilters, page: number) {
  const minAmount = Number(filters.minAmount)
  const maxAmount = Number(filters.maxAmount)
  return {
    page,
    pageSize: 20,
    search: '',
    guest: filters.guest,
    minAmount: Number.isFinite(minAmount) && filters.minAmount !== '' ? minAmount : undefined,
    maxAmount: Number.isFinite(maxAmount) && filters.maxAmount !== '' ? maxAmount : undefined,
    method: filters.method,
    status: filters.status,
  }
}

export const Route = createFileRoute('/_authenticated/payments')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'payments'),
  loader: () => listPaymentsFn({ data: toListData(emptyFilters, 1) }),
  component: PaymentsPage,
})

function PaymentsPage() {
  const initial = Route.useLoaderData()
  const [draft, setDraft] = useState<PaymentFilters>(emptyFilters)
  const [applied, setApplied] = useState<PaymentFilters>(emptyFilters)
  const [data, setData] = useState(initial)

  async function reload(page = 1, next = applied) {
    try {
      setData(await listPaymentsFn({ data: toListData(next, page) }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  function apply(next: PaymentFilters) {
    setDraft(next)
    setApplied(next)
    void reload(1, next)
  }

  return (
    <div>
      <PageHeader title="Payments" description="Mark paid or refunded. No card data is stored." />
      <FilterBar onSubmit={() => apply(draft)} onClear={() => apply(emptyFilters)}>
        <Input
          placeholder="Guest"
          value={draft.guest}
          onChange={(e) => setDraft({ ...draft, guest: e.target.value })}
          aria-label="Guest"
        />
        <Input
          type="number"
          min={0}
          placeholder="Min amount"
          value={draft.minAmount}
          onChange={(e) => setDraft({ ...draft, minAmount: e.target.value })}
          aria-label="Min amount"
        />
        <Input
          type="number"
          min={0}
          placeholder="Max amount"
          value={draft.maxAmount}
          onChange={(e) => setDraft({ ...draft, maxAmount: e.target.value })}
          aria-label="Max amount"
        />
        <FilterSelect
          label="Method"
          value={draft.method}
          onChange={(value) => apply({ ...draft, method: value as PaymentFilters['method'] })}
        >
          <option value="all">All methods</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="transfer">Transfer</option>
          <option value="other">Other</option>
        </FilterSelect>
        <FilterSelect
          label="Status"
          value={draft.status}
          onChange={(value) => apply({ ...draft, status: value as PaymentFilters['status'] })}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </FilterSelect>
      </FilterBar>
      {data.items.length === 0 ? (
        <EmptyState title="No payments" description="Stayora bookings do not store payment records yet." />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={String(p.id)}>
                    <TableCell>
                      <Link
                        className="text-primary hover:underline"
                        to="/bookings/$bookingId"
                        params={{ bookingId: String(p.booking_id) }}
                      >
                        {String(p.guest_name ?? 'Booking')}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatMoney(String(p.amount), String(p.currency ?? 'USD'))}
                    </TableCell>
                    <TableCell>{String(p.method)}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(p.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await markPaymentPaidFn({ data: { id: String(p.id) } })
                              toast.success('Marked paid')
                              await reload(data.page)
                            } catch (error) {
                              toast.error(toUserMessage(error))
                            }
                          }}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                      {p.status === 'paid' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await markPaymentRefundedFn({ data: { id: String(p.id) } })
                              toast.success('Refunded')
                              await reload(data.page)
                            } catch (error) {
                              toast.error(toUserMessage(error))
                            }
                          }}
                        >
                          Refund
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
