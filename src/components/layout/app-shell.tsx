import type { ReactNode } from 'react'
import { MobileNav, Sidebar } from '~/components/layout/sidebar'
import { Topbar } from '~/components/layout/topbar'
import type { AuthUser } from '~/lib/session'

export function AppShell({
  user,
  children,
}: {
  user: AuthUser
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background p-3 md:p-4">
      <div className="flex min-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-card)] md:min-h-[calc(100dvh-2rem)]">
        <div className="hidden md:flex">
          <Sidebar role={user.role} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:pb-8">{children}</main>
        </div>
      </div>
      <MobileNav role={user.role} />
    </div>
  )
}
