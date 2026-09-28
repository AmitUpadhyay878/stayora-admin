import { getAuthSession } from '~/lib/session'
import { ForbiddenError, UnauthorizedError } from '~/lib/errors'
import {
  canAccessModule,
  isAdminRole,
  type AdminRole,
  type ModuleName,
} from '~/lib/auth-roles'

export async function getSession() {
  return getAuthSession()
}

export async function requireSession() {
  const session = await getAuthSession()
  if (!session) throw new UnauthorizedError()
  return session
}

export async function requireRole(...roles: AdminRole[]) {
  const session = await requireSession()
  if (!roles.includes(session.role)) {
    throw new ForbiddenError()
  }
  return session
}

export async function requireModule(module: ModuleName) {
  const session = await requireSession()
  if (!isAdminRole(session.role) || !canAccessModule(session.role, module)) {
    throw new ForbiddenError()
  }
  return session
}
