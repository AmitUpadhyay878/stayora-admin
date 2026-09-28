import { describe, it, expect } from 'vitest'
import { canAccessModule, isAdminRole, normalizeRole } from '../src/lib/auth-roles'

describe('role guards', () => {
  it('recognizes admin roles', () => {
    expect(isAdminRole('super_admin')).toBe(true)
    expect(isAdminRole('sub_admin')).toBe(true)
    expect(isAdminRole('guest')).toBe(false)
  })

  it('normalizes aliases', () => {
    expect(normalizeRole('Admin')).toBe('super_admin')
    expect(normalizeRole('staff')).toBe('sub_admin')
    expect(normalizeRole('guest')).toBe('guest')
  })

  it('gives super-admin all modules', () => {
    expect(canAccessModule('super_admin', 'staff')).toBe(true)
    expect(canAccessModule('super_admin', 'payments')).toBe(true)
  })

  it('lets sub-admin manage assigned-hotel modules but not staff', () => {
    expect(canAccessModule('sub_admin', 'dashboard')).toBe(true)
    expect(canAccessModule('sub_admin', 'bookings')).toBe(true)
    expect(canAccessModule('sub_admin', 'guests')).toBe(true)
    expect(canAccessModule('sub_admin', 'hotels')).toBe(true)
    expect(canAccessModule('sub_admin', 'rooms')).toBe(true)
    expect(canAccessModule('sub_admin', 'payments')).toBe(true)
    expect(canAccessModule('sub_admin', 'reviews')).toBe(true)
    expect(canAccessModule('sub_admin', 'staff')).toBe(false)
  })
})
