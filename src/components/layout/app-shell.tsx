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
    <div className="flex min-h-dvh">
      <div className="hidden md:flex">
        <Sidebar role={user.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>
      <MobileNav role={user.role} />
    </div>
  )
}
