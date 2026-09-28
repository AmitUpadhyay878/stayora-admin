import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, looksLikeBcrypt } from '../src/lib/password'

describe('password', () => {
  it('hashes with bcrypt', async () => {
    const hash = await hashPassword('secret12')
    expect(looksLikeBcrypt(hash)).toBe(true)
  })

  it('verifies bcrypt', async () => {
    const hash = await hashPassword('secret12')
    const r = await verifyPassword('secret12', hash)
    expect(r).toEqual({ ok: true, needsRehash: false })
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret12')
    const r = await verifyPassword('nope', hash)
    expect(r.ok).toBe(false)
  })

  it('accepts plaintext then flags rehash', async () => {
    const r = await verifyPassword('legacy', 'legacy')
    expect(r).toEqual({ ok: true, needsRehash: true })
  })
})
