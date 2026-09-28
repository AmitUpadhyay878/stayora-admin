import { redirect } from '@tanstack/react-router'
import { canAccessModule, type ModuleName } from '~/lib/auth-roles'
import type { AuthUser } from '~/lib/session'

export function requireSuperAdmin(auth: AuthUser | undefined) {
  if (!auth || auth.role !== 'super_admin') {
    throw redirect({ to: '/', search: { denied: '1' } })
  }
}

export function requireAccess(auth: AuthUser | undefined, module: ModuleName) {
  if (!auth || !canAccessModule(auth.role, module)) {
    throw redirect({ to: '/', search: { denied: '1' } })
  }
}
