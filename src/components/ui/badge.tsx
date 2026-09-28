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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-primary/40 text-foreground',
        variant === 'gold' && 'bg-primary text-foreground',
        variant === 'success' && 'bg-secondary text-success',
        variant === 'warning' && 'bg-[#f5c84c]/20 text-[#8a6400]',
        variant === 'danger' && 'bg-[#e85d5d]/15 text-[#b42318]',
        variant === 'muted' && 'bg-border text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
