import * as React from 'react'
import { cn } from '~/lib/utils'

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}
export function TableHeader(props: React.ComponentProps<'thead'>) {
  return <thead className="bg-secondary" {...props} />
}
export function TableBody(props: React.ComponentProps<'tbody'>) {
  return <tbody className="divide-y divide-border" {...props} />
}
export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('hover:bg-[#F7FBF4]', className)} {...props} />
}
export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('h-12 px-4 py-3 align-middle', className)} {...props} />
}
