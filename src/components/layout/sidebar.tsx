import { Link } from '@tanstack/react-router'
import {
  BedDouble,
  Building2,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCog,
} from 'lucide-react'
import type { AdminRole, ModuleName } from '~/lib/auth-roles'
import { canAccessModule } from '~/lib/auth-roles'
import { cn } from '~/lib/utils'

const ITEMS: { to: string; label: string; module: ModuleName; icon: typeof LayoutDashboard }[] = [
  { to: '/', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
  { to: '/hotels', label: 'Hotels', module: 'hotels', icon: Building2 },
  { to: '/rooms', label: 'Rooms', module: 'rooms', icon: BedDouble },
  { to: '/bookings', label: 'Bookings', module: 'bookings', icon: CalendarCheck },
  { to: '/guests', label: 'Guests', module: 'guests', icon: Users },
  { to: '/payments', label: 'Payments', module: 'payments', icon: CreditCard },
  { to: '/reviews', label: 'Reviews', module: 'reviews', icon: MessageSquare },
  { to: '/staff', label: 'Sub-admins', module: 'staff', icon: UserCog },
]

export function Sidebar({ role }: { role: AdminRole }) {
  const items = ITEMS.filter((item) => canAccessModule(role, item.module))
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-display text-xl tracking-wide">Stayora</p>
        <p className="text-xs uppercase tracking-[0.18em] text-white/60">Admin</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
              activeProps={{ className: 'bg-white/15 text-white font-medium' }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export function MobileNav({ role }: { role: AdminRole }) {
  const items = ITEMS.filter((item) => canAccessModule(role, item.module))
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card md:hidden"
      aria-label="Mobile"
    >
      {items.slice(0, 5).map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground',
            )}
            activeProps={{ className: 'text-primary font-medium' }}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
