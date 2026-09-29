import { useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { logoutFn } from '~/server/auth'
import type { AuthUser } from '~/lib/session'

export function Topbar({ user }: { user: AuthUser }) {
  const router = useRouter()
  const initial = (user.name || user.email || 'A').slice(0, 1).toUpperCase()
  const roleLabel = user.role === 'super_admin' ? 'Super-admin' : 'Sub-admin'
  return (
    <header className="flex min-h-16 items-center justify-between px-4 md:px-6">
      <p className="text-sm font-medium text-muted-foreground">Stayora Admin</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-full bg-secondary/80 py-1 pr-3 pl-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold">
            {initial}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight">{user.name || user.email}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === 'sub_admin' && user.hotelName ? `${roleLabel} · ${user.hotelName}` : roleLabel}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await logoutFn()
            toast.success('Signed out')
            await router.navigate({ to: '/login' })
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
