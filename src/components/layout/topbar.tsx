import { useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { StatusBadge } from '~/components/shared/status-badge'
import { logoutFn } from '~/server/auth'
import type { AuthUser } from '~/lib/session'

export function Topbar({ user }: { user: AuthUser }) {
  const router = useRouter()
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <p className="text-sm font-medium text-muted-foreground">Stayora Admin</p>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{user.name || user.email}</p>
          <div className="flex justify-end">
            <StatusBadge value={user.role} />
          </div>
        </div>
        <Button
          variant="outline"
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
