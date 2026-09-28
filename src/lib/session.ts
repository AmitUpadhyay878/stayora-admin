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
  return { ...data, hotelId: data.hotelId ?? null } as AuthUser
}

export async function setAuthSession(user: AuthUser) {
  const session = await useSession<AuthUser>(sessionConfig)
  await session.update(user)
}

export async function clearAuthSession() {
  const session = await useSession<AuthUser>(sessionConfig)
  await session.clear()
}
