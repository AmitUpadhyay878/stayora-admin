import { cn } from '~/lib/utils'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & {
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'gold' && 'bg-amber-100 text-amber-800',
        variant === 'success' && 'bg-emerald-100 text-emerald-800',
        variant === 'warning' && 'bg-orange-100 text-orange-800',
        variant === 'danger' && 'bg-red-100 text-red-800',
        variant === 'muted' && 'bg-muted text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
