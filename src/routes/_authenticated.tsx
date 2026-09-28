import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '~/components/layout/app-shell'
import { meFn } from '~/server/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const user = await meFn()
    if (!user) throw redirect({ to: '/login' })
    return { auth: user }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { auth } = Route.useRouteContext()
  return (
    <AppShell user={auth}>
      <Outlet />
    </AppShell>
  )
}
