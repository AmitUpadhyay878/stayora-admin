export function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? ''
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? ''
  if (secret.length >= 32) return secret
  const fallback = 'stayora-admin-dev-session-secret-key-32'
  return (secret + fallback).slice(0, 48)
}
