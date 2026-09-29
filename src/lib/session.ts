import {
  useSession,
  type SessionConfig,
} from '@tanstack/react-start/server'
import { getSessionSecret } from '~/lib/env'
import type { AdminRole } from '~/lib/auth-roles'

export type AuthUser = {
  userId: string
  role: AdminRole
  email: string
  name: string
  hotelId: string | null
  hotelName: string | null
}

export const sessionConfig: SessionConfig = {
  password: getSessionSecret(),
  name: 'stayora_admin_session',
  maxAge: 60 * 60 * 24 * 7,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
}

export async function getAuthSession() {
  const session = await useSession<AuthUser>(sessionConfig)
  const data = session.data
  if (!data?.userId || !data.role) return null
  const { findUserById } = await import('~/lib/user-repo')
  const { isAdminRole } = await import('~/lib/auth-roles')
  const fresh = await findUserById(data.userId)
  if (!fresh || !fresh.active || !isAdminRole(fresh.role)) {
    await session.clear()
    return null
  }
  const user: AuthUser = {
    userId: fresh.id,
    role: fresh.role,
    email: fresh.email,
    name: fresh.name,
    hotelId: fresh.role === 'sub_admin' ? fresh.hotelId : null,
    hotelName: fresh.role === 'sub_admin' ? fresh.hotelName : null,
  }
  if (
    data.hotelId !== user.hotelId ||
    data.role !== user.role ||
    data.email !== user.email ||
    data.name !== user.name ||
    data.hotelName !== user.hotelName
  ) {
    await session.update(user)
  }
  return user
}

export async function setAuthSession(user: AuthUser) {
  const session = await useSession<AuthUser>(sessionConfig)
  await session.update(user)
}

export async function clearAuthSession() {
  const session = await useSession<AuthUser>(sessionConfig)
  await session.clear()
}
