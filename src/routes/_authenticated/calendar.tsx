import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { Button } from '~/components/ui/button'
import { requireAccess } from '~/lib/super-admin-guard'
import { toUserMessage } from '~/lib/errors'
import { listCalendarFn } from '~/server/calendar'
import type { JsonRow } from '~/lib/db'

function currentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export const Route = createFileRoute('/_authenticated/calendar')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'calendar'),
  loader: () => listCalendarFn({ data: currentMonth() }),
  component: CalendarPage,
})

function CalendarPage() {
  const initial = Route.useLoaderData()
  const [cursor, setCursor] = useState(currentMonth)
  const [items, setItems] = useState(initial.items)

  async function load(next: { year: number; month: number }) {
    try {
      const data = await listCalendarFn({ data: next })
      setCursor(next)
      setItems(data.items)
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  const first = new Date(cursor.year, cursor.month - 1, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate()
  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const title = first.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function bookingsOn(day: number) {
    const date = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return items.filter((row) => {
      const inDate = String(row.check_in).slice(0, 10)
      const outDate = String(row.check_out).slice(0, 10)
      return inDate <= date && outDate > date
    })
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={title}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date(cursor.year, cursor.month - 2, 1)
                void load({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date(cursor.year, cursor.month, 1)
                void load({ year: d.getFullYear(), month: d.getMonth() + 1 })
              }}
            >
              Next
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-7 gap-2 text-xs font-medium uppercase text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-2">
        {cells.map((day, index) => (
          <div key={index} className="min-h-24 rounded-2xl border border-border bg-card p-2">
            {day ? (
              <>
                <p className="text-sm font-semibold">{day}</p>
                <ul className="mt-1 grid gap-1">
                  {bookingsOn(day).slice(0, 3).map((row: JsonRow) => (
                    <li key={String(row.id)}>
                      <Link
                        to="/bookings/$bookingId"
                        params={{ bookingId: String(row.id) }}
                        className="block truncate rounded-full bg-secondary px-2 py-0.5 text-xs hover:bg-primary"
                      >
                        {String(row.guest_name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
