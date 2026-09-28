import { Badge } from '~/components/ui/badge'

import type { ComponentProps } from 'react'

const MAP: Record<string, { label: string; variant: ComponentProps<typeof Badge>['variant'] }> =
  {
    pending: { label: 'Pending', variant: 'warning' },
    confirmed: { label: 'Confirmed', variant: 'default' },
    checked_in: { label: 'Checked in', variant: 'success' },
    completed: { label: 'Completed', variant: 'muted' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    paid: { label: 'Paid', variant: 'success' },
    refunded: { label: 'Refunded', variant: 'gold' },
    failed: { label: 'Failed', variant: 'danger' },
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'muted' },
    available: { label: 'Available', variant: 'success' },
    unavailable: { label: 'Unavailable', variant: 'muted' },
    visible: { label: 'Visible', variant: 'success' },
    hidden: { label: 'Hidden', variant: 'muted' },
    super_admin: { label: 'Super-admin', variant: 'gold' },
    sub_admin: { label: 'Sub-admin', variant: 'default' },
    todo: { label: 'To do', variant: 'warning' },
    doing: { label: 'Doing', variant: 'default' },
    done: { label: 'Done', variant: 'success' },
    open: { label: 'Open', variant: 'warning' },
  }

export function StatusBadge({ value }: { value: string }) {
  const item = MAP[value] ?? { label: value, variant: 'muted' as const }
  return <Badge variant={item.variant}>{item.label}</Badge>
}
