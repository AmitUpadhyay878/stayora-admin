import type { ReactNode } from 'react'
import { Label } from '~/components/ui/label'

export function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string
  error?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
