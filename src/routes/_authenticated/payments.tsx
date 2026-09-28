import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/payments')({
  beforeLoad: () => {
    throw redirect({ to: '/financials', search: { tab: 'payments' } })
  },
})
