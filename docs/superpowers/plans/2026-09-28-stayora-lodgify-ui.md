# Stayora Lodgify-Style UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Stayora Admin to the approved mint/lime Lodgify look, keep Stayora branding, and add hotel-scoped Housekeeping, Messages, Inventory, Calendar, Financials, and Concierge with real Neon data.

**Architecture:** Keep TanStack Start server functions and hotel-scope helpers. New ops tables are created in `ensureSchema`. Dashboard returns one widget payload for both roles. Tokens live in `src/styles/app.css`; components use semantic classes only.

**Tech Stack:** TanStack Start, TanStack Query, RHF, Zod, Tailwind v4, Lucide, Neon HTTP, vitest. No new chart library — SVG/CSS.

## Global Constraints

- Product name stays Stayora; do not rebrand to Lodgify
- Navy/gold tokens and Playfair Display must be removed
- Primary CTA is lime `#C5E86A` on charcoal `#1C2B24`
- Sub-admin remains hotel-scoped; Super-admin-only Hotels + Sub-admins
- POST list server fns + Zod coerce; no silent filter drops
- Vite `server.allowedHosts` includes `.monkeycode-ai.live`; port 3000
- No payment gateway, email, OAuth, public booking site
- Do not invent booking-by-platform percentages
- No code comments unless needed for a non-obvious why
- `npx tsc --noEmit` and `npx vitest run` must pass before claiming done

---

## File structure

```text
src/styles/app.css                          # mint/lime tokens
src/lib/auth-roles.ts                       # new ModuleName values
src/lib/schema-adapter.ts                   # new tables + indexes
src/lib/validators.ts                       # new list/create schemas
src/lib/dashboard-stats.ts                  # pure KPI/chart aggregators
src/lib/ops-scope.ts                        # shared hotel WHERE helper
src/server/dashboard.ts                     # widget payload
src/server/housekeeping.ts
src/server/messages.ts
src/server/inventory.ts
src/server/expenses.ts
src/server/concierge.ts
src/server/calendar.ts
src/components/layout/app-shell.tsx
src/components/layout/sidebar.tsx
src/components/layout/topbar.tsx
src/components/charts/bar-chart.tsx
src/components/charts/area-chart.tsx
src/components/charts/donut-chart.tsx
src/routes/login.tsx
src/routes/_authenticated/index.tsx
src/routes/_authenticated/housekeeping.tsx
src/routes/_authenticated/messages.tsx
src/routes/_authenticated/inventory.tsx
src/routes/_authenticated/calendar.tsx
src/routes/_authenticated/financials.tsx
src/routes/_authenticated/concierge.tsx
src/routes/_authenticated/payments.tsx      # redirect to financials
tests/role-guards.test.ts
tests/dashboard-stats.test.ts
tests/ops-scope.test.ts
```

---

### Task 1: Design tokens and primitives

**Files:**
- Modify: `src/styles/app.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/shared/status-badge.tsx`
- Modify: `src/components/shared/page-header.tsx`
- Modify: `src/components/shared/filter-bar.tsx`
- Test: visual via class tokens; `npx tsc --noEmit`

**Produces:** Semantic colors `primary=#C5E86A`, `background=#EEF3EC`, `foreground=#1C2B24`, `sidebar` light. Button default is lime on charcoal. Table header mint wash. Page titles sans-serif.

- [ ] **Step 1: Replace `@theme` and fonts in `src/styles/app.css`**

Use Plus Jakarta Sans. Tokens from the spec. Drop Playfair and navy.

- [ ] **Step 2: Restyle primitives**

Button `default`: `bg-primary text-foreground hover:bg-[#9CC74A]`. Badge success uses mint wash + `#3F7A3A`. Card radius `rounded-2xl` + soft shadow. Table header `bg-[#E8F5D4]`, row hover `hover:bg-[#F7FBF4]`. Input radius `rounded-xl`. PageHeader: `text-2xl font-semibold` (no `font-display`). Filter submit stays `variant="secondary"` mapped to mint, or add `variant="primary"` lime.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add src/styles/app.css src/components
git commit -m "feat(ui): switch Stayora tokens to mint lime Lodgify look"
```

---

### Task 2: App shell and login

**Files:**
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/routes/login.tsx`
- Modify: `src/lib/auth-roles.ts`
- Modify: `tests/role-guards.test.ts`

**Produces:** Light sidebar, lime active pill, Stayora wordmark, promo footer, mint canvas + white stage. Nav includes new module routes (pages may 404 until later tasks). `ModuleName` adds `messages | housekeeping | inventory | calendar | financials | concierge`. Sub-admin can access those; still cannot access `staff`.

- [ ] **Step 1: Extend role guards (failing test first)**

In `tests/role-guards.test.ts` assert `canAccessModule('sub_admin', 'housekeeping') === true` and same for messages, inventory, calendar, financials, concierge; staff still false.

- [ ] **Step 2: Update `auth-roles.ts` ModuleName + SUB_ADMIN_MODULES**

- [ ] **Step 3: Rebuild sidebar/topbar/shell/login**

AppShell: outer `bg-background p-3 md:p-4`, inner `flex min-h-[calc(100dvh-2rem)] overflow-hidden rounded-[1.5rem] bg-card shadow-lg`. Sidebar width 240px, white, active Link `bg-primary text-foreground font-semibold rounded-full`. Topbar: no bottom navy border; user avatar circle with initial. Login: `bg-background`, white card, lime button.

MobileNav: Dashboard, Reservation (`/bookings`), Rooms, Housekeeping, and a More link to `/reviews` is not enough — use Dashboard, Reservation, Rooms, Housekeeping, Financials as the five.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/role-guards.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): restyle Stayora shell to light lime sidebar"
```

---

### Task 3: Schema, validators, scoped list helper

**Files:**
- Modify: `src/lib/schema-adapter.ts`
- Modify: `src/lib/validators.ts`
- Create: `src/lib/ops-scope.ts`
- Test: `tests/ops-scope.test.ts`

**Produces:**

```ts
export function hotelClause(scope: HotelScope, alias = ''): { sql: string; params: unknown[] }
```

Tables (IF NOT EXISTS) with `hotelId` indexes:

- `HousekeepingTask` (id, hotelId, roomId, title, dueAt, status, createdAt)
- `MessageThread` (id, hotelId, guestEmail, guestName, subject, updatedAt)
- `Message` (id, threadId, author, body, createdAt)
- `InventoryItem` (id, hotelId, name, sku, quantity, location, updatedAt)
- `Expense` (id, hotelId, title, category, quantity, amount, expenseDate, status, createdAt)
- `ConciergeRequest` (id, hotelId, guestName, guestEmail, requestType, notes, status, createdAt)

Validators: `housekeepingListSchema`, `housekeepingCreateSchema`, `messageListSchema`, `messageCreateSchema`, `messageReplySchema`, `inventoryListSchema`, `inventoryCreateSchema`, `expenseListSchema`, `expenseCreateSchema`, `conciergeListSchema`, `conciergeCreateSchema`, `calendarQuerySchema`.

- [ ] **Step 1: Write `tests/ops-scope.test.ts` for all/one/none SQL fragments**
- [ ] **Step 2: Implement helper + schema + validators**
- [ ] **Step 3: `npx vitest run tests/ops-scope.test.ts` PASS && `npx tsc --noEmit`**
- [ ] **Step 4: Commit** `feat(db): add hotel-scoped ops tables for Lodgify modules`

---

### Task 4: Dashboard widgets

**Files:**
- Create: `src/lib/dashboard-stats.ts`
- Create: `src/components/charts/bar-chart.tsx`
- Create: `src/components/charts/area-chart.tsx`
- Modify: `src/server/dashboard.ts`
- Modify: `src/routes/_authenticated/index.tsx`
- Test: `tests/dashboard-stats.test.ts`

**Produces:** Pure functions:

```ts
export function occupiedCount(bookings: { status: string }[]): number
export function monthRevenue(bookings: { status: string; total: number; checkIn: string }[], month: Date): number
export function bookedVsCancelled(days: Array<{ booked: number; cancelled: number }>): { booked: number; cancelled: number }
export function availabilityCounts(rooms: { status: string }[], inHouse: number): { available: number; occupied: number; booked: number; notReady: number }
```

`dashboardFn` returns one shape for both roles: `{ kpis, availability, revenueSeries, reservationSeries, rating, tasks, recentBookings, activities }`. Hide platform pie. Charts are SVG, `aria-label` with totals, no animation if `prefers-reduced-motion` (already global).

KPI definitions:

- occupied = bookings `checked_in`
- booked = bookings `confirmed` overlapping today
- checkouts = `checkOut::date = CURRENT_DATE` and status in confirmed/checked_in/completed
- earnings = sum `totalPrice` (fallback nights * hotel pricePerNight if total missing) for non-cancelled with check-in this month

- [ ] **Step 1: Failing unit tests for aggregators**
- [ ] **Step 2: Implement aggregators + server payload + dashboard UI**
- [ ] **Step 3: Tests + tsc**
- [ ] **Step 4: Commit** `feat(dashboard): add Lodgify-style KPI and chart widgets`

---

### Task 5: Housekeeping

**Files:**
- Create: `src/server/housekeeping.ts`
- Create: `src/routes/_authenticated/housekeeping.tsx`

**Produces:** POST `listHousekeepingFn`, `createHousekeepingFn`, `updateHousekeepingFn` (status). List columns: room, title, due, status. Filter room/status. Completing a task does not change `RoomCategory.adminStatus`. Scoped via `forceHotelId` / `assertHotelAccess`.

- [ ] Implement server + page with FilterBar
- [ ] `npx tsc --noEmit`
- [ ] Commit `feat(housekeeping): add hotel-scoped task list`

---

### Task 6: Messages

**Files:**
- Create: `src/server/messages.ts`
- Create: `src/routes/_authenticated/messages.tsx`

**Produces:** Thread list, conversation, new thread + reply. No email. Guest summary from thread fields. Right column hidden below `lg`.

- [ ] Implement + tsc
- [ ] Commit `feat(messages): add hotel-scoped staff guest threads`

---

### Task 7: Inventory

**Files:**
- Create: `src/server/inventory.ts`
- Create: `src/routes/_authenticated/inventory.tsx`

**Produces:** Item CRUD, quantity, location filters.

- [ ] Implement + tsc
- [ ] Commit `feat(inventory): add hotel-scoped stock list`

---

### Task 8: Calendar

**Files:**
- Create: `src/server/calendar.ts`
- Create: `src/routes/_authenticated/calendar.tsx`

**Produces:** Month grid from `BookingRequest` check-in/out. Query `{ year, month }`. Click booking name -> `/bookings/$bookingId`.

- [ ] Implement + tsc
- [ ] Commit `feat(calendar): show scoped bookings on a month grid`

---

### Task 9: Financials and Concierge

**Files:**
- Create: `src/server/expenses.ts`
- Create: `src/server/concierge.ts`
- Create: `src/routes/_authenticated/financials.tsx`
- Create: `src/routes/_authenticated/concierge.tsx`
- Modify: `src/routes/_authenticated/payments.tsx` to redirect `/financials?tab=payments`

**Produces:** Expense KPIs (balance = income from dashboard earnings − expenses, total income, total expenses), monthly grouped bars (booking income vs expense sums), category donut from expenses, transactions table. Payments tab keeps empty state copy. Concierge request table + mark done.

Income for a month = same earnings rule as dashboard. Do not fake payment rows.

- [ ] Implement + tsc
- [ ] Commit `feat(financials): add expenses, payments tab, concierge requests`

---

### Task 10: Restyle remaining pages

**Files:**
- Modify listing/detail routes: hotels, rooms, bookings, guests, reviews, staff, booking/guest/room/hotel details
- Rooms: card grid using `r.image` when present, else mint placeholder; keep table below or as fallback
- Guest profile: two-column cards
- Bookings nav label is Reservation in sidebar only; page title can stay Bookings or Reservation — use **Reservation** to match mockup

- [ ] Restyle without changing server contracts
- [ ] tsc + vitest full
- [ ] Commit `feat(ui): restyle listing and detail pages to mint cards`

---

### Task 11: Verify and preview

- [ ] `npx tsc --noEmit`
- [ ] `npx vitest run` (all existing + new tests)
- [ ] Confirm no remaining `#1E3A8A`, `Playfair`, `bg-sidebar` dark, `font-display` in UI chrome
- [ ] `/deploy-website` skill to start port 3000

---

## Spec coverage

| Spec section | Task |
|---|---|
| Visual tokens, type, pills | 1 |
| Shell, login, nav map, mobile 5 | 2 |
| New tables, indexes, validators | 3 |
| Dashboard widgets, hide platform pie | 4 |
| Housekeeping | 5 |
| Messages | 6 |
| Inventory | 7 |
| Calendar | 8 |
| Financials, payments redirect, Concierge | 9 |
| Existing pages restyle, rooms cards, guest profile | 10 |
| tsc, vitest, preview | 11 |
| Hotel scope / Super-admin hotels+staff | 2, 3, 5–9 (unchanged helpers) |
| Stayora name | 2 |
