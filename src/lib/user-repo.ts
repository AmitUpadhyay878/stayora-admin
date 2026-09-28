import { createId, query, queryOne } from '~/lib/db'
import { ensureSchema } from '~/lib/schema-adapter'
import { hashPassword, verifyPassword } from '~/lib/password'
import { isAdminRole, normalizeRole, parseActive, type AdminRole } from '~/lib/auth-roles'
import { ConflictError, NotFoundError } from '~/lib/errors'

export type SafeUser = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  hotelId: string | null
  hotelName: string | null
  createdAt: string | null
}

type UserRow = {
  id: string
  email: string
  name: string
  createdAt: string | null
  role: string | null
  isActive: boolean | string | null
  hotelId: string | null
  hotelName: string | null
  password: string | null
}

function fromRow(row: UserRow): SafeUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ''),
    role: normalizeRole(row.role),
    active: parseActive(row.isActive ?? true),
    hotelId: row.hotelId ? String(row.hotelId) : null,
    hotelName: row.hotelName ? String(row.hotelName) : null,
    createdAt: row.createdAt ? String(row.createdAt) : null,
  }
}

const USER_SELECT = `
  SELECT u.id, u.email, u.name, u."createdAt",
         r.role, r."isActive", r."hotelId", h.name as "hotelName", a.password
  FROM "user" u
  LEFT JOIN "AdminRole" r ON r."userId" = u.id
  LEFT JOIN "Hotel" h ON h.id = r."hotelId"
  LEFT JOIN LATERAL (
    SELECT password FROM account
    WHERE "userId" = u.id AND "providerId" = 'credential'
    ORDER BY "updatedAt" DESC
    LIMIT 1
  ) a ON true
`

export async function findUserByEmail(email: string) {
  await ensureSchema()
  const row = await queryOne<UserRow>(
    `${USER_SELECT} WHERE lower(u.email) = lower($1) LIMIT 1`,
    [email],
  )
  if (!row) return null
  return { user: fromRow(row), password: String(row.password ?? '') }
}

export async function findUserById(id: string) {
  await ensureSchema()
  const row = await queryOne<UserRow>(`${USER_SELECT} WHERE u.id = $1 LIMIT 1`, [id])
  return row ? fromRow(row) : null
}

export async function updateUserPassword(id: string, hash: string) {
  await query(
    `UPDATE account SET password = $1, "updatedAt" = now()
     WHERE "userId" = $2 AND "providerId" = 'credential'`,
    [hash, id],
  )
}

export async function listSubAdmins(filters?: {
  name?: string
  email?: string
  hotelId?: string
  active?: 'all' | 'active' | 'inactive'
}) {
  await ensureSchema()
  const where = ['r.role = $1']
  const params: unknown[] = ['sub_admin']
  if (filters?.name) {
    params.push(`%${filters.name}%`)
    where.push(`u.name ILIKE $${params.length}`)
  }
  if (filters?.email) {
    params.push(`%${filters.email}%`)
    where.push(`u.email ILIKE $${params.length}`)
  }
  if (filters?.hotelId) {
    params.push(filters.hotelId)
    where.push(`r."hotelId" = $${params.length}`)
  }
  if (filters?.active === 'active') where.push(`r."isActive" = true`)
  if (filters?.active === 'inactive') where.push(`r."isActive" = false`)
  const rows = await query<UserRow>(
    `${USER_SELECT} WHERE ${where.join(' AND ')} ORDER BY u."createdAt" DESC`,
    params,
  )
  return rows.map(fromRow)
}

export async function createSubAdmin(input: {
  name: string
  email: string
  password: string
  active: boolean
  hotelId: string
}) {
  await ensureSchema()
  const existing = await findUserByEmail(input.email)
  if (existing) throw new ConflictError('An account with this email already exists')
  const hotel = await queryOne(`SELECT id FROM "Hotel" WHERE id = $1`, [input.hotelId])
  if (!hotel) throw new NotFoundError('Hotel not found')
  const user = await insertCredentialUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: 'sub_admin',
    active: input.active,
    hotelId: input.hotelId,
  })
  return user
}

export async function updateSubAdmin(input: {
  id: string
  name: string
  email: string
  active: boolean
  hotelId: string
  password?: string
}) {
  await ensureSchema()
  const current = await findUserById(input.id)
  if (!current) throw new NotFoundError('Sub-admin not found')
  if (current.role !== 'sub_admin') {
    throw new ConflictError('Cannot edit this account from staff')
  }
  const other = await findUserByEmail(input.email)
  if (other && other.user.id !== input.id) {
    throw new ConflictError('An account with this email already exists')
  }
  const hotel = await queryOne(`SELECT id FROM "Hotel" WHERE id = $1`, [input.hotelId])
  if (!hotel) throw new NotFoundError('Hotel not found')
  await query(
    `UPDATE "user" SET name = $1, email = $2, "updatedAt" = now() WHERE id = $3`,
    [input.name, input.email, input.id],
  )
  await query(
    `UPDATE "AdminRole" SET "isActive" = $1, "hotelId" = $2 WHERE "userId" = $3`,
    [input.active, input.hotelId, input.id],
  )
  if (input.password) {
    await updateUserPassword(input.id, await hashPassword(input.password))
  }
  return findUserById(input.id)
}

export async function deleteSubAdmin(id: string) {
  await ensureSchema()
  const current = await findUserById(id)
  if (!current) throw new NotFoundError('Sub-admin not found')
  if (current.role !== 'sub_admin') {
    throw new ConflictError('Cannot delete this account from staff')
  }
  await query(`DELETE FROM "AdminRole" WHERE "userId" = $1`, [id])
  await query(`DELETE FROM account WHERE "userId" = $1`, [id])
  await query(`DELETE FROM session WHERE "userId" = $1`, [id])
  await query(`DELETE FROM "user" WHERE id = $1`, [id])
}

export async function authenticateAdmin(email: string, password: string) {
  const found = await findUserByEmail(email)
  if (!found) return null
  if (!isAdminRole(found.user.role)) return null
  if (!found.user.active) return null
  const check = await verifyPassword(password, found.password)
  if (!check.ok) return null
  if (check.needsRehash) {
    await updateUserPassword(found.user.id, await hashPassword(password))
  }
  return found.user as SafeUser & { role: AdminRole }
}

export async function ensureBootstrapSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  if (!email || !password) return
  await ensureSchema()
  const hash = await hashPassword(password)
  const existing = await findUserByEmail(email)
  if (existing) {
    await query(
      `INSERT INTO "AdminRole" ("userId", role, "isActive", "hotelId")
       VALUES ($1, 'super_admin', true, NULL)
       ON CONFLICT ("userId") DO UPDATE SET role = 'super_admin', "isActive" = true, "hotelId" = NULL`,
      [existing.user.id],
    )
    const account = await queryOne(
      `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [existing.user.id],
    )
    if (account) {
      await updateUserPassword(existing.user.id, hash)
    } else {
      await insertCredentialAccount(existing.user.id, hash)
    }
    return
  }
  await insertCredentialUser({
    name: 'Stayora Super Admin',
    email,
    password,
    role: 'super_admin',
    active: true,
  })
}

async function insertCredentialUser(input: {
  name: string
  email: string
  password: string
  role: AdminRole
  active: boolean
  hotelId?: string | null
}) {
  const id = createId()
  const hash = await hashPassword(input.password)
  await query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, now(), now())`,
    [id, input.name, input.email],
  )
  await insertCredentialAccount(id, hash)
  await query(
    `INSERT INTO "AdminRole" ("userId", role, "isActive", "hotelId") VALUES ($1, $2, $3, $4)`,
    [id, input.role, input.active, input.role === 'sub_admin' ? (input.hotelId ?? null) : null],
  )
  const created = await findUserById(id)
  if (!created) throw new Error('Failed to create admin user')
  return created
}

async function insertCredentialAccount(userId: string, hash: string) {
  await query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, $3, now(), now())`,
    [createId(), userId, hash],
  )
}
