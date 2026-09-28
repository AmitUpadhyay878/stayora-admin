# Stayora Admin Panel Design

Date: 2026-09-21
Status: approved for planning

## Problem

Stayora is a hotel-booking product. Operators need a dedicated admin panel to run hotel operations: hotels, rooms, bookings, guests, payments, reviews, and staff. The public booking site is out of scope. This workspace currently has no application code, so the admin panel is a new standalone app.

## Goals

- Super-admin can manage the full hotel operation and create, edit, update, and delete Sub-admins.
- Sub-admins have a different layout and can only work on bookings and guests.
- Sign-in uses email and password against the existing Postgres `user` table.
- Stack is fixed: TanStack Start, TanStack Query, React Hook Form, Tailwind CSS, shadcn/ui.

## Non-goals

- Public Stayora booking website
- Payment gateway / card capture
- Email sending, magic links, OAuth
- Multi-tenant hotel chains beyond a single Stayora catalog
- Mobile native apps

## Roles

Two staff roles only.

| Role | Who | Layout | Capabilities |
|---|---|---|---|
| `super_admin` | One primary operator | Full sidebar | Dashboard KPIs, Hotels, Rooms, Bookings, Guests, Payments, Reviews, Sub-admins CRUD |
| `sub_admin` | Staff created by Super-admin | Restricted sidebar | Limited dashboard, Bookings (view + status update), Guests (view + contact update) |

Guest / customer accounts in `user` (if any) cannot sign into the admin panel.

## Architecture

Standalone TanStack Start application at the workspace root.

```text
Browser (admin UI)
  -> TanStack Start routes (SSR + client)
  -> server functions (auth + CRUD)
  -> Neon Postgres (DATABASE_URL)
```

- UI: Tailwind + shadcn/ui
- Forms: React Hook Form + Zod
- Client data: TanStack Query calling Start server functions
- Auth: HTTP-only signed session cookie
- No separate public REST API in v1
- Vite `server.allowedHosts` includes `.monkeycode-ai.live`
- Single exposed port is the Start dev server

### Route map

Public:

- `/login`

Authenticated, both roles:

- `/` dashboard (content differs by role)
- `/bookings`
- `/bookings/$bookingId`
- `/guests`
- `/guests/$guestId`

Super-admin only:

- `/hotels`
- `/hotels/new`
- `/hotels/$hotelId`
- `/hotels/$hotelId/edit`
- `/rooms`
- `/rooms/new`
- `/rooms/$roomId`
- `/rooms/$roomId/edit`
- `/payments`
- `/reviews`
- `/staff` (Sub-admins)

Guards:

- No session -> `/login`
- Session present on `/login` -> `/`
- Sub-admin hitting Super-admin routes -> `/` with a toast "Not allowed"

## Auth

### Source of truth

Existing Neon table `user`. Login is email + password.

Because this environment cannot open Postgres port 5432, implementation must:

1. Try `DATABASE_URL` introspection at startup / first request.
2. If reachable, map actual column names through a thin adapter.
3. If unreachable during local preview, still ship the adapter against the expected Stayora-shaped schema below so the app runs once the URL is reachable.

### Expected `user` mapping

Adapter looks for, in order, then uses the first match:

- id: `id` | `user_id`
- email: `email`
- password: `password` | `password_hash` | `hashed_password`
- name: `name` | `full_name` | `username`
- role: `role` | `user_role` | `type`
- active: `is_active` | `active` | `status`
- timestamps: `created_at` / `updated_at` if present

If no role column exists, add `role` as `text` with default `guest` so customer rows are unchanged. Admin values: `super_admin`, `sub_admin`.

If no active flag exists, treat all rows as active.

### Password handling

- Never return password hashes to the client.
- Never store plaintext.
- Login: if stored value looks like bcrypt (`$2a$` / `$2b$` / `$2y$`), verify with bcrypt. Otherwise, if it looks like a known hash, verify with that scheme. If historical rows are plaintext, verify once then re-hash with bcrypt on successful login.
- Super-admin creating/updating a Sub-admin password always writes bcrypt.

### Session

- After successful login, set HTTP-only, `SameSite=Lax`, `Path=/` cookie `stayora_admin_session`.
- Cookie payload: signed `{ userId, role, email, name }`.
- Logout clears the cookie.
- `beforeLoad` on authenticated layouts reads the cookie and injects `context.auth`.

### Sub-admin lifecycle

Only Super-admin can:

- Create Sub-admin: name, email, password, active
- Edit: name, email, active, optional new password
- Delete: hard delete of that `user` row only if `role = sub_admin` (never delete Super-admin this way)

Email must be unique. Creating a Sub-admin with an email that already exists as a guest or Super-admin fails with a form error.

## Domain model

Stayora-shaped tables. Adapter maps real names if they differ.

### hotel

- id, name, slug, city, country, address, description
- star_rating, thumbnail_url, status (`active` | `inactive`)
- created_at, updated_at

### room

- id, hotel_id, name, room_type, capacity, price_per_night
- currency (default `USD`), status (`available` | `unavailable`)
- description, created_at, updated_at

### guest

A guest is a person attached to bookings. Prefer a dedicated `guest` table. If guests live only in `user`, the adapter treats non-admin `user` rows as guests and never exposes admin passwords.

- id, name, email, phone, created_at

### booking

- id, hotel_id, room_id, guest_id
- check_in, check_out, guests_count
- status: `pending` | `confirmed` | `checked_in` | `completed` | `cancelled`
- total_amount, currency, notes
- created_at, updated_at

### payment

- id, booking_id, amount, currency
- status: `pending` | `paid` | `refunded` | `failed`
- method: `card` | `cash` | `transfer` | `other`
- paid_at, created_at

### review

- id, hotel_id, guest_id, booking_id (nullable)
- rating (1-5), comment, visibility (`visible` | `hidden`)
- created_at

If a table is missing at runtime, the corresponding module shows an empty state plus an admin-only "schema missing" notice. Do not invent silent fake production data in the Super-admin path. Seed data is allowed only when tables exist and are empty, behind an explicit seed server function used in development.

## Screens

### Login

Centered card. Email + password (RHF + Zod). Invalid credentials show a single form error. Success redirects to `/`.

### Shell

Left sidebar + top bar.

Top bar: product name Stayora Admin, current user name, role badge, logout.

Super-admin sidebar: Dashboard, Hotels, Rooms, Bookings, Guests, Payments, Reviews, Sub-admins.

Sub-admin sidebar: Dashboard, Bookings, Guests.

### Super-admin dashboard

KPI cards: hotel count, room count, booking count (today / this month), revenue this month (sum of paid payments), occupancy approximation (booked room-nights / available room-nights this month).

Recent bookings table (10 rows) linking to booking detail.

### Sub-admin dashboard

KPI cards: pending bookings, arrivals today, in-house (`checked_in`), guests count.

Recent bookings assigned to the catalog (same data, no revenue/hotel inventory cards).

### Hotels (Super-admin)

List: search by name/city, filter by status, pagination.

Create / edit form (RHF): name, city, country, address, description, star rating, thumbnail URL, status.

Delete: confirm dialog. Block delete if the hotel has future `confirmed` or `checked_in` bookings; show the reason.

### Rooms (Super-admin)

List: filter by hotel and status. Columns: hotel, name, type, capacity, price, status.

Create / edit: hotel, name, type, capacity, price per night, currency, description, status.

### Bookings (both)

List: search guest name/email, filter status, date range on check-in.

Detail: hotel, room, guest, dates, amount, payment summary, status timeline.

Super-admin: create booking, edit dates/room/guest, cancel, delete cancelled/pending only.

Sub-admin: cannot create or delete. Can change status along this path only:

- `pending` -> `confirmed` or `cancelled`
- `confirmed` -> `checked_in` or `cancelled`
- `checked_in` -> `completed`

Invalid transitions return 403 from the server function even if the UI hides the action.

### Guests (both)

List: search name/email/phone.

Detail: contact + booking history.

Super-admin: edit all contact fields, delete guest only if they have no active (`pending` | `confirmed` | `checked_in`) bookings.

Sub-admin: update email/phone only.

### Payments (Super-admin)

List: filter status/method, link to booking.

Actions: mark `paid`, mark `refunded` (only from `paid`). No card data.

### Reviews (Super-admin)

List: filter by hotel, rating, visibility.

Actions: hide, show, delete. No public reply in v1.

### Sub-admins (Super-admin)

Table: name, email, active, created_at.

Create / edit dialog. Delete confirm.

Cannot change own Super-admin row from this screen. Cannot promote a Sub-admin to Super-admin in v1.

## Component conventions

Use shadcn: Button, Input, Textarea, Select, Checkbox, Label, Form, Table, Dialog, AlertDialog, DropdownMenu, Badge, Card, Tabs, Separator, Sheet, Sidebar, Sonner, Skeleton.

Patterns:

- List pages: page header + primary action + filters + table + pagination
- Empty state copy per resource
- Mutations: disable submit while pending, toast on success/failure, invalidate matching query keys
- Query keys: `['hotels', filters]`, `['hotel', id]`, same pattern for other resources, plus `['auth']` and `['dashboard', role]`

## Error handling

- Zod on every form; field-level messages
- Server function failures: toast + thrown error mapped to user-safe message
- 401: redirect `/login`
- 403: stay on page, toast "You do not have access"
- Network/DB down: banner "Cannot reach database. Check DATABASE_URL."

## Configuration

Environment variables (placeholders only, never commit secrets):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
SESSION_SECRET=replace-with-long-random-string
```

`.env.example` documents both. Application code reads `process.env.DATABASE_URL` and `process.env.SESSION_SECRET` only.

## Security

- Server functions check session + role on every mutation, not only in the UI
- Parameterized SQL only (postgres.js or equivalent)
- No password hashes, session secrets, or raw DATABASE_URL in client bundles
- Sub-admin cannot enumerate `/staff` data

## Testing

- Unit: password verify/rehash, booking status transition matrix, role guards
- Route tests: unauthenticated redirect, Sub-admin blocked from Super-admin routes
- Form tests: hotel create validation, Sub-admin create unique email

Manual verification for v1 preview: login as Super-admin, CRUD a Sub-admin, confirm the Sub-admin layout hides hotel/payment/review/staff, update a booking status.

## File layout

```text
app/
  routes/
    __root.tsx
    login.tsx
    _authenticated.tsx          # session guard + shell switch
    _authenticated/index.tsx
    _authenticated/bookings.tsx
    _authenticated/bookings.$bookingId.tsx
    _authenticated/guests.tsx
    _authenticated/guests.$guestId.tsx
    _authenticated/hotels.tsx
    _authenticated/hotels.new.tsx
    _authenticated/hotels.$hotelId.tsx
    _authenticated/hotels.$hotelId.edit.tsx
    _authenticated/rooms.tsx
    _authenticated/rooms.new.tsx
    _authenticated/rooms.$roomId.tsx
    _authenticated/rooms.$roomId.edit.tsx
    _authenticated/payments.tsx
    _authenticated/reviews.tsx
    _authenticated/staff.tsx
  components/
    ui/                         # shadcn
    layout/sidebar.tsx
    layout/topbar.tsx
    hotels/
    rooms/
    bookings/
    guests/
    payments/
    reviews/
    staff/
  lib/
    db.ts                       # postgres client
    schema-adapter.ts
    auth.ts                     # cookie, password, requireRole
    validators.ts               # zod
  server/
    auth.ts
    hotels.ts
    rooms.ts
    bookings.ts
    guests.ts
    payments.ts
    reviews.ts
    staff.ts
    dashboard.ts
```

## Implementation order

1. Scaffold TanStack Start + Tailwind + shadcn + Query + RHF
2. DB client, schema adapter, auth (login/logout/session/guards)
3. Role-aware shell
4. Super-admin Sub-admins CRUD
5. Hotels + Rooms
6. Guests + Bookings
7. Payments + Reviews
8. Dashboards
9. Preview deploy of the Start app

## Success criteria

- Super-admin can sign in, manage hotels/rooms/bookings/guests/payments/reviews, and fully CRUD Sub-admins
- Sub-admin signs in to a different layout and can only view/update bookings and guests as specified
- Unauthenticated users never see admin data
- Passwords are hashed; hashes never appear in API responses
- App talks to Neon through `DATABASE_URL` without a separate API service
