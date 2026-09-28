import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Field } from '~/components/shared/field'
import { loginSchema } from '~/lib/validators'
import { loginFn, meFn } from '~/server/auth'
import { toUserMessage } from '~/lib/errors'
import type { z } from 'zod'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await meFn()
    if (user) throw redirect({ to: '/', search: { denied: undefined } })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [formError, setFormError] = useState('')
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[linear-gradient(160deg,#0b1b3d_0%,#1e3a8a_55%,#0f172a_100%)] px-4">
      <Card className="w-full max-w-md border-white/10 shadow-2xl">
        <CardHeader>
          <p className="font-display text-3xl text-primary">Stayora</p>
          <CardTitle className="text-xl">Sign in to Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hotel operations for Super-admins and Sub-admins
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError('')
              try {
                await loginFn({ data: values })
                toast.success('Welcome back')
                await router.navigate({ to: '/', search: { denied: undefined } })
              } catch (error) {
                const message = toUserMessage(error)
                setFormError(message)
              }
            })}
          >
            <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              error={form.formState.errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
            </Field>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
