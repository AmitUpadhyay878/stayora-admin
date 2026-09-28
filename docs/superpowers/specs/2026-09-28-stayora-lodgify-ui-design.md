# Stayora Admin Lodgify-Style UI Design

Date: 2026-09-28
Status: approved for planning

## Problem

Stayora Admin is a working hotel-ops panel (TanStack Start, Neon, hotel-scoped Sub-admins, listing filters). The visual language is navy/gold with a dark sidebar and sparse KPI cards. The operator provided a Lodgify-style hospitality admin mockup and asked to update the whole admin look, including modules the mockup shows that Stayora does not yet have.

## Goals

- Keep the product name **Stayora**. Do not rebrand to Lodgify.
- Restyle the entire admin (shell, login, tables, forms, badges, empty states, dashboard) to match the mockup: mint canvas, white rounded cards, lime accents, light sidebar.
- Approach **C**: visual clone plus real data where Stayora already has it; new ops modules get working CRUD and hotel scope, not wallpaper.
- Preserve existing auth, hotel scope, booking status flow, and listing filters.

## Non-goals

- Public booking website
- Payment gateway / card capture
- Email sending, magic links, OAuth
- Native mobile apps
- Replacing Neon / Prisma catalog tables (`Hotel`, `RoomCategory`, `BookingRequest`, `Review`)
- Fake “booking by platform” pie if we have no source field (hide or show Direct only)
- Dark mode in this pass (mockup is light-only)

## Visual system

Soft UI Evolution, dense dashboard, light mode only.

| Token | Value | Use |
|---|---|---|
| Background / canvas | `#EEF3EC` | Page chrome around the white stage |
| Stage / card | `#FFFFFF` | Content surface, tables, widgets |
| Foreground | `#1C2B24` | Primary text |
| Muted text | `#6B7C74` | Labels, secondary |
| Border | `#E3EBE4` | Card and table hairlines |
| Lime / CTA / active | `#C5E86A` | Primary buttons, active nav pill, positive KPI chips |
| Lime deep | `#9CC74A` | Hover on lime, chart fills |
| Mint wash | `#E8F5D4` | KPI icon wells, table header, confirmed pills |
| Amber | `#F5C84C` | Pending / warning |
| Danger | `#E85D5D` | Cancelled / delete |
| Success text | `#3F7A3A` | Positive deltas |
| Radius | 16–20px cards, 999px pills | |
| Shadow | `0 1px 2px rgb(28 43 36 / 0.04), 0 8px 24px rgb(28 43 36 / 0.06)` | Cards only |

Typography:

- UI: `Plus Jakarta Sans` (400/500/600/700)
- Tabular numbers: same family with `font-variant-numeric: tabular-nums`
- Drop `Playfair Display` and navy/gold tokens
- Body 14–16px, page titles 24–28px semibold (not serif display)

Icons: Lucide outline, 20px in nav, 18px in tables. No emoji icons.

Status pills (text + color, never color alone):

| Status | Background | Text |
|---|---|---|
| Confirmed / Active / Available / Completed | mint wash | `#3F7A3A` |
| Pending | amber/10 | `#8A6400` |
| Cancelled / Inactive / Failed | rose/10 | `#B42318` |
| Checked in | lime/20 | `#1C2B24` |
| Super-admin | lime | `#1C2B24` |

Primary CTA is lime on charcoal text (not white on navy). Destructive stays red and spatially separate.

## Shell

App chrome matches the mockup, Stayora branded.

- Outer page is mint canvas. Inner stage is a white rounded-2xl panel holding sidebar + main.
- **Sidebar** (light, ~240px): Stayora wordmark + small grid-mark logo. Nav items are icon + label. Active item is a full-width lime pill. Inactive is charcoal at 70% opacity. Footer: compact “Elevate Hospitality Standards” promo card (static copy, no external link required) and a copyright line.
- **Top bar**: page title on the left; rounded search on listings that already have search/filter; user chip (avatar initial + name + role) and logout on the right. No navy top strip.
- **Mobile**: sidebar collapses; existing bottom nav stays, restyled to mint/lime, max 5 items (Dashboard, Reservation, Rooms, Housekeeping, More overflow to the remaining modules).
- Login: same mint canvas + centered white card, Stayora wordmark, lime submit. No navy gradient.

### Navigation map

Shared (both roles, hotel-scoped for Sub-admin):

| Label | Route | Source |
|---|---|---|
| Dashboard | `/` | Existing, restyled + widgets |
| Reservation | `/bookings` | Existing bookings (rename label only) |
| Rooms | `/rooms` | Existing rooms, card/list like mockup |
| Messages | `/messages` | New |
| Housekeeping | `/housekeeping` | New |
| Inventory | `/inventory` | New |
| Calendar | `/calendar` | Bookings month grid |
| Financials | `/financials` | New expenses + existing payments as a tab |
| Reviews | `/reviews` | Existing |
| Concierge | `/concierge` | New |

Super-admin only (keep current capability; not in the Lodgify screenshot but required):

| Label | Route |
|---|---|
| Hotels | `/hotels` |
| Sub-admins | `/staff` |

Guests remain at `/guests` and are reachable from Reservation / Guest Profile, not as a primary sidebar item (matches mockup). Deep links stay.

Payments list moves under Financials as a tab; `/payments` redirects to `/financials?tab=payments`.

## Roles and scope

Unchanged rules:

- `super_admin`: all hotels, Hotels CRUD (create/delete super-only), Sub-admin CRUD.
- `sub_admin`: exactly one `AdminRole.hotelId`. All list/get/mutate calls use `getScopeHotelId` / `assertHotelAccess` / `forceHotelId`.
- Guest customer accounts cannot sign in.
- New modules are in `SUB_ADMIN_MODULES` except `hotels` create/delete and `staff`.

If a Sub-admin has no hotel assigned, scoped pages show the existing empty assigned-hotel state.

## Data

### Existing (keep, query only)

- `Hotel`, `City`, `Brand`, `RoomCategory` (+ `adminStatus`)
- `BookingRequest` (+ statuses pending / confirmed / cancelled / checked_in / completed)
- `Review`
- `user` + `account` + `AdminRole`
- Guests remain derived from `BookingRequest` emails
- Payments catalog table still does not exist; payments tab stays empty with the current explanation

### New tables (created in `ensureSchema`, hotel-scoped)

`HousekeepingTask`

- `id`, `hotelId`, `roomId` (nullable, `RoomCategory.id`), `title`, `dueAt`, `status` (`todo` / `doing` / `done`), `createdAt`
- List filters: room, status, due date
- Completing a task does not auto-change `RoomCategory.adminStatus` unless the operator also sets room status

`MessageThread` + `Message`

- Thread: `id`, `hotelId`, `guestEmail`, `guestName`, `subject`, `updatedAt`
- Message: `id`, `threadId`, `author` (`guest` / `staff`), `body`, `createdAt`
- Staff can create a thread and reply. No email delivery.

`InventoryItem`

- `id`, `hotelId`, `name`, `sku`, `quantity` (int), `location`, `updatedAt`
- List filters: name, location; quantity editable inline or via edit dialog

`Expense`

- `id`, `hotelId`, `title`, `category` (`supplies` / `utilities` / `maintenance` / `salaries` / `marketing` / `other`), `quantity`, `amount` (numeric), `expenseDate`, `status` (`pending` / `completed`), `createdAt`
- This is the Financials default tab (Expense screen in the mockup)

`ConciergeRequest`

- `id`, `hotelId`, `guestName`, `guestEmail`, `requestType`, `notes`, `status` (`open` / `done`), `createdAt`

Indexes: `hotelId` on every new table; `(hotelId, status)` where filtered; `updatedAt` / `dueAt` / `expenseDate` as used by lists.

Calendar has no table: it reads `BookingRequest.checkIn` / `checkOut` for the visible month.

## Dashboard

One layout for both roles; numbers are scoped. Super-admin sees all hotels; Sub-admin sees one.

Widgets, all real:

1. **KPI row**: occupied rooms (checked_in), booked (confirmed + checked_in overlapping today), check-outs today, earnings this month (`totalPrice` of non-cancelled bookings with check-in in month). Each tile has a lime/mint icon well and a period hint.
2. **Room availability**: counts of available / occupied / booked / not-ready from `RoomCategory.adminStatus` plus in-house bookings. Simple stacked or four-number block, not a fake donut.
3. **Revenue**: last 6 months, sum of `BookingRequest.totalPrice` for non-cancelled rows grouped by month. Area/line chart.
4. **Reservations**: last 7 days booked vs cancelled counts. Grouped bars.
5. **Overall rating**: avg + count from `Review`; five category rows only if review extras exist, otherwise overall + count.
6. **Tasks**: next 5 open housekeeping tasks by `dueAt`.
7. **Booking list**: recent bookings table (id, guest, room/type, dates, status) with status filter chips.
8. **Recent activities**: derived feed from latest bookings + housekeeping completions (no separate activity table in v1).

Hide “Booking by platform” unless a `source` column exists on `BookingRequest`. If missing, do not invent percentages.

Charts: lightweight SVG or CSS (no new chart library unless already in `package.json`). Colors lime / mint / amber. Respect `prefers-reduced-motion`. Provide a text summary on each chart (`aria-label` or adjacent sentence). Empty widgets use `EmptyState`, not blank axes.

## Page restyle (existing)

Every existing page keeps behavior (filters, pagination, RHF dialogs, status transitions) and adopts:

- `PageHeader` sans-serif title, optional lime primary action
- `FilterBar` in a mint-tinted rounded bar; Filter = lime, Clear = ghost
- Tables: mint header row, 48px rows, pill badges, row hover `#F7FBF4`
- Cards: 16–20px radius, soft shadow, no heavy border
- Forms/dialogs: same fields, restyled inputs (11px height, 12px radius)
- Rooms: add a card grid option matching the mockup (photo if `RoomCategory` has image URL, else mint placeholder; type, occupancy, price). Keep the current table as an alternate if images are absent.
- Guest profile (`/guests/$guestId`) and booking detail: two-column cards like the mockup (profile + booking info, history table)
- Hotels and Staff: same Lodgify chrome so Super-admin pages do not look like the old navy app

## New pages

All use `requireAccess(module)`, POST list server functions, Zod list schemas, `FilterBar`, hotel scope.

- `/housekeeping` — task list + add/complete; room checkboxes like the mockup if a room has an open task
- `/messages` — thread list left, conversation center, guest/profile summary right (right column collapses on small screens)
- `/inventory` — item table, quantity, location
- `/calendar` — month grid; day cell lists booking last names; click through to booking detail
- `/financials` — Expense KPIs + category donut + monthly income vs expense bars + transactions table; Payments tab empty-state
- `/concierge` — request table, mark done

Create/update/delete are Super-admin and Sub-admin for these modules (scoped). No extra role.

## Architecture

Unchanged stack: TanStack Start, Query, RHF, Zod, Tailwind, existing shadcn-like primitives.

```text
Browser
  -> Start routes
  -> server functions (auth + CRUD + dashboard aggregates)
  -> Neon (existing catalog + new ops tables via ensureSchema)
```

- Vite `server.allowedHosts` includes `.monkeycode-ai.live`
- Single exposed port 3000
- Tokens live in `src/styles/app.css` `@theme`; components use semantic classes (`bg-background`, `bg-primary`, `bg-card`), not raw hex
- New server files: `src/server/{housekeeping,messages,inventory,expenses,concierge,calendar}.ts`
- Extend `ModuleName` and sidebar items
- Dashboard server fn returns one widget payload for both roles

## Error handling

- Existing `toUserMessage` + sonner toasts
- Scoped 403 still redirects with `?denied=`
- Schema/ensure failures keep `DatabaseUnavailableError` banner
- Empty filter results: “No matching …” vs true empty (same pattern as Staff)

## Testing

Keep existing vitest suites. Add:

- Hotel-scope tests for each new list/mutate (Sub-admin cannot read/write another hotel)
- Role-guard tests for new modules (Sub-admin allowed; staff still Super-admin only)
- Dashboard aggregation unit tests with fixture rows (occupied, month revenue, 7-day booked vs cancelled)
- Visual/token smoke: primary class is lime, not `#1E3A8A` (grep or a small CSS token test if practical)

`npx tsc --noEmit` and `npx vitest run` must pass before calling the work done.

## Success criteria

- Login and every authenticated page use the mint/lime shell; no navy sidebar or gold CTA remains
- Stayora name is visible in sidebar and login
- Existing CRUD, filters, and hotel scope still work
- New modules list/create/update for the scoped hotel and persist in Neon
- Dashboard widgets show real scoped numbers and empty states when zero
- Preview on port 3000 with `allowedHosts` `.monkeycode-ai.live`
