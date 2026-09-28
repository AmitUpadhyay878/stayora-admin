export type AdminRole = 'super_admin' | 'sub_admin'

export type ModuleName =
  | 'dashboard'
  | 'hotels'
  | 'rooms'
  | 'bookings'
  | 'guests'
  | 'payments'
  | 'reviews'
  | 'staff'

const SUB_ADMIN_MODULES: ModuleName[] = [
  'dashboard',
  'hotels',
  'rooms',
  'bookings',
  'guests',
  'payments',
  'reviews',
]

export function isAdminRole(role: string): role is AdminRole {
  return role === 'super_admin' || role === 'sub_admin'
}

export function normalizeRole(raw: string | null | undefined): string {
  if (!raw) return 'guest'
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['super_admin', 'superadmin', 'admin', 'owner'].includes(value)) {
    return 'super_admin'
  }
  if (['sub_admin', 'subadmin', 'staff', 'manager', 'support'].includes(value)) {
    return 'sub_admin'
  }
  return value
}

export function canAccessModule(role: AdminRole, module: ModuleName) {
  if (role === 'super_admin') return true
  return SUB_ADMIN_MODULES.includes(module)
}

export function parseActive(value: unknown) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true
  if (typeof value === 'string') {
    const v = value.toLowerCase()
    if (['active', 'enabled', 'yes'].includes(v)) return true
    if (['inactive', 'disabled', 'no', 'false', '0'].includes(v)) return false
  }
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return true
}
