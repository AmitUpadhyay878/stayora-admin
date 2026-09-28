import type { FormEvent, ReactNode } from 'react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export function FilterBar({
  children,
  onSubmit,
  onClear,
  className,
}: {
  children: ReactNode
  onSubmit: () => void
  onClear: () => void
  className?: string
}) {
  return (
    <form
      className={cn(
        'mb-4 grid gap-2 rounded-2xl bg-secondary/60 p-3 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {children}
      <div className="col-span-full flex gap-2">
        <Button type="submit">Filter</Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  )
}

export function FilterSelect({
  value,
  onChange,
  children,
  label,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  label: string
}) {
  return (
    <select
      className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      {children}
    </select>
  )
}
