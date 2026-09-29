import { createServerFn } from '@tanstack/react-start'
import { loginSchema } from '~/lib/validators'
import { authenticateAdmin, ensureBootstrapSuperAdmin } from '~/lib/user-repo'
import { clearAuthSession, getAuthSession, setAuthSession } from '~/lib/session'
import { pingDb } from '~/lib/schema-adapter'
import { UnauthorizedError } from '~/lib/errors'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    await ensureBootstrapSuperAdmin()
    const user = await authenticateAdmin(data.email, data.password)
    if (!user) {
      throw new UnauthorizedError('Invalid email or password')
    }
    await setAuthSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      hotelId: user.role === 'sub_admin' ? user.hotelId : null,
      hotelName: user.role === 'sub_admin' ? user.hotelName : null,
    })
    return {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      hotelId: user.role === 'sub_admin' ? user.hotelId : null,
      hotelName: user.role === 'sub_admin' ? user.hotelName : null,
    }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  await clearAuthSession()
  return { ok: true }
})

export const meFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getAuthSession()
})

export const dbHealthFn = createServerFn({ method: 'GET' }).handler(async () => {
  const ok = await pingDb()
  return { ok }
})
