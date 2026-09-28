import { Link } from '@tanstack/react-router'
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CalendarDays,
  ConciergeBell,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Package,
  Sparkles,
  UserCog,
  Wallet,
} from 'lucide-react'
import type { AdminRole, ModuleName } from '~/lib/auth-roles'
import { canAccessModule } from '~/lib/auth-roles'
import { cn } from '~/lib/utils'

const ITEMS: { to: string; label: string; module: ModuleName; icon: typeof LayoutDashboard }[] = [
  { to: '/', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
  { to: '/bookings', label: 'Reservation', module: 'bookings', icon: CalendarCheck },
  { to: '/rooms', label: 'Rooms', module: 'rooms', icon: BedDouble },
  { to: '/messages', label: 'Messages', module: 'messages', icon: MessagesSquare },
  { to: '/housekeeping', label: 'Housekeeping', module: 'housekeeping', icon: Sparkles },
  { to: '/inventory', label: 'Inventory', module: 'inventory', icon: Package },
  { to: '/calendar', label: 'Calendar', module: 'calendar', icon: CalendarDays },
  { to: '/financials', label: 'Financials', module: 'financials', icon: Wallet },
  { to: '/reviews', label: 'Reviews', module: 'reviews', icon: MessageSquare },
  { to: '/concierge', label: 'Concierge', module: 'concierge', icon: ConciergeBell },
  { to: '/hotels', label: 'Hotels', module: 'hotels', icon: Building2 },
  { to: '/staff', label: 'Sub-admins', module: 'staff', icon: UserCog },
]

export function Sidebar({ role }: { role: AdminRole }) {
  const items = ITEMS.filter((item) => canAccessModule(role, item.module))
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold">
          S
        </span>
        <div>
          <p className="text-base font-semibold tracking-tight">Stayora</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex min-h-11 items-center gap-3 rounded-full px-3 text-sm text-foreground/70 transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              activeProps={{ className: 'bg-primary text-foreground font-semibold' }}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-sm font-semibold">Elevate Hospitality Standards</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep rooms ready, guests informed, and ops on schedule.
          </p>
        </div>
        <p className="mt-3 px-1 text-[11px] text-muted-foreground">Stayora Admin</p>
      </div>
    </aside>
  )
}

const MOBILE_ITEMS = ['/', '/bookings', '/rooms', '/housekeeping', '/financials']

export function MobileNav({ role }: { role: AdminRole }) {
  const items = ITEMS.filter(
    (item) => canAccessModule(role, item.module) && MOBILE_ITEMS.includes(item.to),
  )
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card md:hidden"
      aria-label="Mobile"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground',
            )}
            activeProps={{ className: 'text-foreground font-semibold' }}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
