# Stayora Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Stayora hotel-ops admin (TanStack Start) with Super-admin vs Sub-admin layouts, email/password auth against the existing Neon `user` table, and full CRUD for hotels, rooms, bookings, guests, payments, reviews, and staff.

**Architecture:** Browser UI calls TanStack Start server functions. Server functions talk to Neon Postgres via `DATABASE_URL` using the `@neondatabase/serverless` HTTP driver (port 443) so preview environments that block 5432 still work. Auth is an HTTP-only signed session cookie. Role-aware layout switches sidebar and route guards. A schema adapter maps real column names; missing tables show empty states plus a Super-admin notice.

**Tech Stack:** TanStack Start, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui, `@neondatabase/serverless`, bcryptjs, iron-session or HMAC-signed cookies.

## Global Constraints

- Stack is fixed: TanStack Start, TanStack Query, React Hook Form, Tailwind CSS, shadcn/ui
- Auth source is the existing Postgres `user` table; login is email + password
- Roles: `super_admin` (full ops + Sub-admin CRUD) and `sub_admin` (bookings + guests only)
- Guest/customer `user` rows cannot sign into admin
- Passwords never stored plaintext; hashes never returned to the client
- Session cookie name: `stayora_admin_session`; HTTP-only, SameSite=Lax, Path=/
- Vite `server.allowedHosts` includes `.monkeycode-ai.live`
- Single exposed port is the Start dev server; proxy `/api` if a backend port is used
- No public booking site, payment gateway, email, OAuth, or magic links
- Do not invent silent fake production data; empty/missing-schema states are required
- Environment: `DATABASE_URL`, `SESSION_SECRET` via `.env` (gitignored); `.env.example` uses placeholders only
- Never commit secrets; never print DATABASE_URL credentials in UI or logs
- Do not add code comments unless needed for a non-obvious why
- Product name in chrome: Stayora Admin

---

## File structure

```text
.env.example
.gitignore
package.json
vite.config.ts
tsconfig.json
components.json
index.html
src/styles/app.css
src/router.tsx
src/routeTree.gen.ts
src/start.ts
src/lib/utils.ts
src/lib/env.ts
src/lib/db.ts
src/lib/schema-adapter.ts
src/lib/password.ts
src/lib/session.ts
src/lib/auth.ts
src/lib/validators.ts
src/lib/query-client.ts
src/lib/errors.ts
src/server/auth.ts
src/server/dashboard.ts
src/server/hotels.ts
src/server/rooms.ts
src/server/bookings.ts
src/server/guests.ts
src/server/payments.ts
src/server/reviews.ts
src/server/staff.ts
src/components/ui/*                  # shadcn
src/components/layout/app-shell.tsx
src/components/layout/sidebar.tsx
src/components/layout/topbar.tsx
src/components/layout/page-header.tsx
src/components/shared/data-table.tsx
src/components/shared/empty-state.tsx
src/components/shared/confirm-dialog.tsx
src/components/shared/status-badge.tsx
src/routes/__root.tsx
src/routes/login.tsx
src/routes/_authenticated.tsx
src/routes/_authenticated/index.tsx
src/routes/_authenticated/bookings.tsx
src/routes/_authenticated/bookings.$bookingId.tsx
src/routes/_authenticated/bookings.new.tsx
src/routes/_authenticated/guests.tsx
src/routes/_authenticated/guests.$guestId.tsx
src/routes/_authenticated/hotels.tsx
src/routes/_authenticated/hotels.new.tsx
src/routes/_authenticated/hotels.$hotelId.tsx
src/routes/_authenticated/hotels.$hotelId.edit.tsx
src/routes/_authenticated/rooms.tsx
src/routes/_authenticated/rooms.new.tsx
src/routes/_authenticated/rooms.$roomId.tsx
src/routes/_authenticated/rooms.$roomId.edit.tsx
src/routes/_authenticated/payments.tsx
src/routes/_authenticated/reviews.tsx
src/routes/_authenticated/staff.tsx
tests/password.test.ts
tests/booking-transitions.test.ts
tests/role-guards.test.ts
```

---

### Task 1: Scaffold TanStack Start + Tailwind + shadcn + Query + RHF

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `components.json`, `index.html`, `src/styles/app.css`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `.gitignore`, `.env.example`

**Interfaces:**
- Consumes: none
- Produces: runnable `npm run dev` Start app with Tailwind, Query provider, Toaster, `cn()` helper, `allowedHosts: ['.monkeycode-ai.live']`

- [ ] **Step 1: Scaffold the Start app**

Use current TanStack Start Vite template (`@tanstack/react-start`). Dependencies:

```text
@tanstack/react-start @tanstack/react-router @tanstack/react-query
react react-dom react-hook-form @hookform/resolvers zod
tailwindcss @tailwindcss/vite lucide-react class-variance-authority clsx tailwind-merge
@radix-ui/* (via shadcn) sonner bcryptjs @neondatabase/serverless
```

Dev: `vite typescript @types/react @types/react-dom @types/bcryptjs vitest`

- [ ] **Step 2: Vite config**

```ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['.monkeycode-ai.live'],
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})
```

- [ ] **Step 3: Verify `npm run dev` starts without errors**

Expected: Vite ready on port 3000.

- [ ] **Step 4: Add `.env.example` (placeholders only) and gitignore `.env`**

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
SESSION_SECRET=replace-with-long-random-string
```

---

### Task 2: Password helpers (TDD)

**Files:**
- Create: `src/lib/password.ts`
- Test: `tests/password.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `hashPassword(plain: string): Promise<string>`
  - `verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; needsRehash: boolean }>`
  - `looksLikeBcrypt(value: string): boolean`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Implement `src/lib/password.ts` with bcryptjs (cost 10)**

- [ ] **Step 3: `npx vitest run tests/password.test.ts` — all pass**

---

### Task 3: Booking status transitions (TDD)

**Files:**
- Create: `src/lib/booking-status.ts`
- Test: `tests/booking-transitions.test.ts`

**Interfaces:**
- Produces:
  - `BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'`
  - `allowedTransitions: Record<BookingStatus, BookingStatus[]>`
  - `assertTransition(from: BookingStatus, to: BookingStatus, role: 'super_admin' | 'sub_admin'): void` throws `ForbiddenError` if illegal
  - Super-admin may also cancel from pending/confirmed and delete only cancelled/pending (delete is a separate function, not a status)

Sub-admin path only:
- pending -> confirmed | cancelled
- confirmed -> checked_in | cancelled
- checked_in -> completed

- [ ] **Step 1: Tests covering every legal and illegal pair for both roles**
- [ ] **Step 2: Implement and `npx vitest run tests/booking-transitions.test.ts`**

---

### Task 4: Role guards (TDD)

**Files:**
- Create: `src/lib/auth-roles.ts`
- Test: `tests/role-guards.test.ts`

**Interfaces:**
- Produces:
  - `AdminRole = 'super_admin' | 'sub_admin'`
  - `isAdminRole(role: string): role is AdminRole`
  - `canAccessModule(role: AdminRole, module: ModuleName): boolean`
  - `ModuleName = 'dashboard' | 'hotels' | 'rooms' | 'bookings' | 'guests' | 'payments' | 'reviews' | 'staff'`
  - Super-admin: all true. Sub-admin: dashboard, bookings, guests only.

---

### Task 5: DB client + schema adapter

**Files:**
- Create: `src/lib/env.ts`, `src/lib/db.ts`, `src/lib/schema-adapter.ts`, `src/lib/errors.ts`

**Interfaces:**
- `getDb(): neon sql tagged template`
- `ensureSchema(): Promise<AdapterMap>` introspects `information_schema.columns`, maps:
  - user: id `id|user_id`, email `email`, password `password|password_hash|hashed_password`, name `name|full_name|username`, role `role|user_role|type`, active `is_active|active|status`
  - If role column missing: `ALTER TABLE "user" ADD COLUMN role text DEFAULT 'guest'`
  - If table missing for hotel/room/booking/guest/payment/review: record `missingTables: string[]` — do not auto-create production tables silently; Super-admin UI shows schema-missing notice
  - If `user` table missing entirely: create it (admin cannot function without it) with id, email, password, name, role, is_active, created_at
- `AppError` with `status: 400 | 401 | 403 | 404 | 409 | 503` and `message`
- `ForbiddenError`, `UnauthorizedError`, `NotFoundError`, `ConflictError`, `DatabaseUnavailableError`

Use `@neondatabase/serverless` (`neon` HTTP) so preview can reach Neon on 443.

If DATABASE_URL is missing or connection fails, throw `DatabaseUnavailableError`.

---

### Task 6: Session + auth server functions

**Files:**
- Create: `src/lib/session.ts`, `src/lib/auth.ts`, `src/server/auth.ts`

**Interfaces:**
- Session payload: `{ userId: string, role: AdminRole, email: string, name: string }`
- Cookie `stayora_admin_session` HMAC-signed with `SESSION_SECRET`
- `getSession(): Promise<Session | null>`
- `requireSession(): Promise<Session>` -> 401
- `requireRole(...roles: AdminRole[]): Promise<Session>` -> 403
- Server functions:
  - `login({ email, password })` — only `super_admin` | `sub_admin`; inactive users rejected; rehash plaintext on success; set cookie; return `{ userId, role, email, name }` (never password)
  - `logout()`
  - `me()` — current session or null

Login Zod: email, password min 8.

---

### Task 7: Login page + root providers

**Files:**
- Modify: `src/routes/__root.tsx`, `src/routes/login.tsx`
- Remove placeholder `src/routes/index.tsx` if it conflicts with `_authenticated/index.tsx`

Login: centered card, Stayora Admin, RHF + Zod, single form error on invalid credentials, redirect `/` on success. If already session, redirect `/`.

Root: QueryClientProvider, Toaster (sonner), CSS import, luxury hospitality theme (deep navy + warm gold, Inter/Playfair).

---

### Task 8: Authenticated shell (two layouts)

**Files:**
- Create: `src/routes/_authenticated.tsx`, `src/components/layout/*`

`beforeLoad`: no session -> `/login`. Inject `context.auth`.

Sidebar Super-admin: Dashboard, Hotels, Rooms, Bookings, Guests, Payments, Reviews, Sub-admins.

Sidebar Sub-admin: Dashboard, Bookings, Guests.

Top bar: Stayora Admin, name, role badge, logout.

Super-admin-only routes use `beforeLoad` that redirects Sub-admin to `/` and the page toasts "Not allowed".

---

### Task 9: Staff (Sub-admins) CRUD — Super-admin

**Files:** `src/server/staff.ts`, `src/routes/_authenticated/staff.tsx`, `src/lib/validators.ts` (staff schemas)

- listSubAdmins
- createSubAdmin({ name, email, password, active }) — unique email, bcrypt, role=sub_admin
- updateSubAdmin({ id, name, email, active, password? }) — cannot edit super_admin rows
- deleteSubAdmin({ id }) — only if role=sub_admin

UI: table name/email/active/created_at; create-edit dialog; delete confirm.

---

### Task 10: Hotels CRUD — Super-admin

Server: list (search name/city, status, page), get, create, update, delete.

Delete blocked if hotel has future `confirmed` or `checked_in` bookings — return 409 with reason.

Form: name, city, country, address, description, star_rating, thumbnail_url, status. Slug generated from name.

---

### Task 11: Rooms CRUD — Super-admin

Filter by hotel + status. Fields: hotel_id, name, room_type, capacity, price_per_night, currency default USD, description, status available|unavailable.

---

### Task 12: Guests — both roles

List search name/email/phone. Detail + booking history.

Super-admin: edit all contact fields; delete only if no active pending|confirmed|checked_in bookings.

Sub-admin: update email/phone only (server-enforced).

If no `guest` table, adapter uses non-admin `user` rows as guests and never selects password.

---

### Task 13: Bookings — both roles

List: search guest name/email, status, check-in date range.

Detail: hotel, room, guest, dates, amount, payment summary, status.

Super-admin: create, edit dates/room/guest, cancel, delete cancelled/pending only.

Sub-admin: status transitions only via `assertTransition`. Invalid -> 403.

---

### Task 14: Payments + Reviews — Super-admin

Payments: list filter status/method; mark paid; mark refunded only from paid. No card data.

Reviews: list filter hotel/rating/visibility; hide/show/delete. No replies.

---

### Task 15: Dashboards

Super-admin KPIs: hotel count, room count, bookings today / this month, revenue this month (sum paid payments), occupancy (booked room-nights / available room-nights this month), recent 10 bookings.

Sub-admin KPIs: pending bookings, arrivals today, in-house checked_in, guests count, recent bookings. No revenue/inventory cards.

---

### Task 16: Missing-schema empty states + DB banner

If `ensureSchema()` reports missing tables, Super-admin module pages show EmptyState + "schema missing" notice.

If DB unreachable, app banner: "Cannot reach database. Check DATABASE_URL."

---

### Task 17: Verify

- `npx vitest run`
- Typecheck
- Manual: login Super-admin, CRUD Sub-admin, Sub-admin layout hides hotels/payments/reviews/staff, booking status path works
- Start preview via deploy-website skill

---

## Spec coverage

| Spec item | Task |
|---|---|
| Scaffold + stack + allowedHosts | 1 |
| Password bcrypt / plaintext rehash | 2 |
| Booking transition matrix | 3 |
| Role modules | 4 |
| Neon adapter + user mapping | 5 |
| Session cookie + login/logout | 6-7 |
| Two shells + guards | 8 |
| Sub-admin CRUD | 9 |
| Hotels / Rooms | 10-11 |
| Guests / Bookings | 12-13 |
| Payments / Reviews | 14 |
| Dashboards | 15 |
| Missing schema / DB banner | 16 |
| Tests + preview | 17 |
