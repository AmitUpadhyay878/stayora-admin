import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import {
  BedDouble,
  CalendarCheck,
  LogOut,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { PageHeader } from '~/components/shared/page-header'
import { StatusBadge } from '~/components/shared/status-badge'
import { EmptyState } from '~/components/shared/empty-state'
import { AreaChart } from '~/components/charts/area-chart'
import { GroupedBarChart } from '~/components/charts/bar-chart'
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
      <PageHeader title="Dashboard" description="Hotel operations overview" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Occupied" value={String(data.kpis.occupied)} hint="Checked in now" icon={BedDouble} />
        <Kpi title="Booked" value={String(data.kpis.booked)} hint="Confirmed today" icon={CalendarCheck} />
        <Kpi title="Check-outs" value={String(data.kpis.checkouts)} hint="Due today" icon={LogOut} />
        <Kpi title="Earnings" value={formatMoney(data.kpis.earnings)} hint="This month" icon={Wallet} />
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Room availability</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Available" value={data.availability.available} />
            <Stat label="Occupied" value={data.availability.occupied} />
            <Stat label="Booked" value={data.availability.booked} />
            <Stat label="Not ready" value={data.availability.notReady} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenueSeries.every((row) => row.value === 0) ? (
              <EmptyState title="No revenue yet" description="Confirmed stays will fill this chart." />
            ) : (
              <AreaChart
                data={data.revenueSeries}
                ariaLabel={`Revenue for last 6 months, latest ${formatMoney(data.revenueSeries.at(-1)?.value ?? 0)}`}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={data.reservationSeries}
              ariaLabel="Booked versus cancelled reservations for the last 7 days"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overall rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tabular-nums">{data.rating.average.toFixed(1)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.rating.count} reviews</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Booking list</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentBookings.length === 0 ? (
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
                  {data.recentBookings.map((row) => (
                    <TableRow key={String(row.id)}>
                      <TableCell>
                        <Link
                          to="/bookings/$bookingId"
                          params={{ bookingId: String(row.id) }}
                          className="font-medium hover:underline"
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
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open housekeeping tasks.</p>
              ) : (
                <ul className="grid gap-3 text-sm">
                  {data.tasks.map((task) => (
                    <li key={task.id}>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent activities</CardTitle>
            </CardHeader>
            <CardContent>
              {data.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Activity will appear as bookings change.</p>
              ) : (
                <ul className="grid gap-3 text-sm">
                  {data.activities.map((item) => (
                    <li key={item.id}>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint: string
  icon: typeof BedDouble
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardHeader>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function DbBanner() {
  const q = useQuery({ queryKey: ['db-health'], queryFn: () => dbHealthFn() })
  if (q.data && !q.data.ok) {
    return (
      <div className="mb-4 rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
        Cannot reach database. Check DATABASE_URL.
      </div>
    )
  }
  return null
}
