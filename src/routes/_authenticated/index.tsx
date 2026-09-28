import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { PageHeader } from '~/components/shared/page-header'
import { StatusBadge } from '~/components/shared/status-badge'
import { EmptyState } from '~/components/shared/empty-state'
import { formatDate, formatMoney } from '~/lib/utils'
import { dashboardFn } from '~/server/dashboard'
import { dbHealthFn } from '~/server/auth'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: (search: Record<string, unknown>) => ({
    denied: typeof search.denied === 'string' ? search.denied : undefined,
  }),
  loader: () => dashboardFn(),
  component: DashboardPage,
})

function DashboardPage() {
  const data = Route.useLoaderData()
  const search = useSearch({ from: '/_authenticated/' })

  useEffect(() => {
    if (search.denied) toast.error('You do not have access')
  }, [search.denied])

  return (
    <div>
      <DbBanner />
      <PageHeader
        title="Dashboard"
        description={
          data.role === 'super_admin'
            ? 'Operations overview for Stayora'
            : 'Today’s arrivals, in-house guests, and pending bookings'
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.role === 'super_admin' ? (
          <>
            <Kpi title="Hotels" value={String(data.kpis.hotels)} />
            <Kpi title="Rooms" value={String(data.kpis.rooms)} />
            <Kpi title="Bookings today" value={String(data.kpis.bookingsToday)} />
            <Kpi title="Bookings this month" value={String(data.kpis.bookingsMonth)} />
            <Kpi title="Revenue this month" value={formatMoney(data.kpis.revenue)} />
            <Kpi title="Occupancy" value={`${data.kpis.occupancy}%`} />
          </>
        ) : (
          <>
            <Kpi title="Pending bookings" value={String(data.kpis.pending)} />
            <Kpi title="Arrivals today" value={String(data.kpis.arrivalsToday)} />
            <Kpi title="In-house" value={String(data.kpis.inHouse)} />
            <Kpi title="Guests" value={String(data.kpis.guests)} />
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <EmptyState title="No bookings yet" description="New reservations will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((row) => (
                  <TableRow key={String(row.id)}>
                    <TableCell>
                      <Link
                        to="/bookings/$bookingId"
                        params={{ bookingId: String(row.id) }}
                        className="font-medium text-primary hover:underline"
                      >
                        {String(row.guest_name ?? 'Guest')}
                      </Link>
                    </TableCell>
                    <TableCell>{String(row.hotel_name ?? '—')}</TableCell>
                    <TableCell>{formatDate(String(row.check_in))}</TableCell>
                    <TableCell>
                      <StatusBadge value={String(row.status)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="font-display text-3xl">{value}</p>
      </CardHeader>
    </Card>
  )
}

function DbBanner() {
  const q = useQuery({ queryKey: ['db-health'], queryFn: () => dbHealthFn() })
  if (q.data && !q.data.ok) {
    return (
      <div className="mb-4 rounded-md border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
        Cannot reach database. Check DATABASE_URL.
      </div>
    )
  }
  return null
}
