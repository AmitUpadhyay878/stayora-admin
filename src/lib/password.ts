import bcrypt from 'bcryptjs'
import { promisify } from 'node:util'
import { scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const scrypt = promisify(scryptCallback)
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/
const SCRYPT_RE = /^[a-f0-9]{32}:[a-f0-9]{128}$/i

export function looksLikeBcrypt(value: string) {
  return BCRYPT_RE.test(value)
}

function looksLikeBetterAuthScrypt(value: string) {
  return SCRYPT_RE.test(value)
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

async function verifyBetterAuthScrypt(plain: string, stored: string) {
  const [salt, keyHex] = stored.split(':')
  const derived = (await scrypt(
    plain.normalize('NFKC'),
    salt,
    64,
  )) as Buffer
  const key = Buffer.from(keyHex, 'hex')
  if (key.length !== derived.length) return false
  return timingSafeEqual(derived, key)
}

export async function verifyPassword(plain: string, stored: string) {
  if (!stored) return { ok: false, needsRehash: false }
  if (looksLikeBcrypt(stored)) {
    const ok = await bcrypt.compare(plain, stored)
    return { ok, needsRehash: false }
  }
  if (looksLikeBetterAuthScrypt(stored)) {
    const ok = await verifyBetterAuthScrypt(plain, stored)
    return { ok, needsRehash: ok }
  }
  if (plain === stored) {
    return { ok: true, needsRehash: true }
  }
  return { ok: false, needsRehash: false }
}
