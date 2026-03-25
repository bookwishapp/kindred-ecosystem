# Architecture — Kindred Ecosystem

## The Philosophy

Kindred is both an app and the idea behind everything here. The ecosystem is built around one principle: helping people take care of the small things in their lives — what they keep, what they remember, what they let go, and who they show up for.

The ecosystem is Terry Heath's — the apps, the newsletter, the bookstore, the card games all orbit the same center of gravity.

---

## Repository

**GitHub:** kindred-ecosystem
**Local:** `/Developer/kindred-ecosystem/`

```
kindred-ecosystem/
  apps/
    kindred/          → People + care (Flutter) — in development
    analoglist/       → Collector wishlists (Flutter) — rebuild in progress
  packages/
    ui_kit/           → Shared Flutter theme and components
    core/             → Shared Flutter utilities (HTTP client, date helpers)
  services/
    auth/             → Central authentication service (Node/Express)
    web/              → terryheath.com — blog, newsletter, ecosystem admin (Next.js)
  docs/               → Architecture, guidelines, prompts
  melos.yaml
```

---

## The Layers

### 1. Apps (Flutter, in /apps)

Each app is a standalone product. They share ui_kit and core packages but own their own backend services and databases.

#### Kindred
- People and care — your Kin
- Avatar grid with ring system for upcoming dates
- Two-layer person model: their profile (shared/live) + your notes (private)
- Show Up (your profile), Keep (add someone), Your Kin (the grid)
- No push notifications — rings are the entire signal system
- Backend: dedicated Railway service + Postgres

#### AnalogList
- Collector wishlists — books, records, games, anything
- Being rebuilt clean inside the monorepo
- Visual language reference for the entire ecosystem
- Backend: dedicated Railway service + Postgres

### 2. Shared Packages (Flutter, in /packages)

#### /packages/ui_kit
Shared Flutter theme and UI components.
- Colors, typography, spacing, border radius
- Warm off-white backgrounds, turquoise (#2AB8A0) accent
- Inter font via Google Fonts
- Material 3

Components are added here only when genuinely shared between two or more apps. Do not add app-specific components.

#### /packages/core
Minimal shared utilities only.
- `ApiClient` — thin Dio wrapper with Bearer token auth
- `DateUtils` — formatting and proximity helpers
- No domain models
- No business logic

### 3. Services (in /services)

#### /services/auth — auth.terryheath.com
Central authentication for the entire ecosystem.
- Magic link only (no passwords)
- Issues JWTs (15 min access token, 30 day refresh token)
- Single identity works across all apps
- Node/Express, Postgres on Railway
- Admin at auth.terryheath.com/admin

#### /services/web — terryheath.com
The hub. Does three things:
1. **Newsletter/blog** — Small Things, Terry's weekly letter
2. **Public website** — terryheath.com
3. **Ecosystem admin** — terryheath.com/admin is the one and only admin interface for the entire system

Next.js, Postgres on Railway.

Current status: deployed, admin working, newsletter send requires SES SMTP credential verification, subscribers tab and cron job pending fixes.

---

## Satellite Products

These are connected thematically, not technically — for now.

### North Star Postal (northstarpostal.com)
Custom letters to children from beloved characters (Santa, Easter Bunny, Tooth Fairy, etc.). Currently marketed on Etsy. Will eventually be brought into the ecosystem technically — likely as a section of terryheath.com/admin and a natural touchpoint inside Kindred (child's birthday → letter suggestion).

### Sinclair Inlet Book Co.
Physical bookstore in Port Orchard, WA. 501c3 nonprofit. Source of raw material for the Small Things newsletter. Home of Paper Street Thrift (weekly Saturday swap events).

### Gone Goat
Card game (originally developed as Graze Expectations). No technical component currently. When it does have one, it lives in terryheath.com, not in a separate service.

---

## Admin Strategy

**terryheath.com/admin is the one and only admin interface.**

This is where Terry manages:
- Newsletter posts and sends
- Subscriber list and suppressions
- Auth service users and sessions (via auth.terryheath.com/admin for now, eventually unified)
- Future: North Star Postal orders and templates
- Future: Any other backend needs across the ecosystem

Do not build separate admin interfaces for individual apps. Anything that needs admin attention surfaces in terryheath.com/admin.

---

## Authentication Flow

1. User requests magic link → hits `POST auth.terryheath.com/auth/request`
2. SES sends email with link
3. User clicks link → `GET auth.terryheath.com/auth/verify?token=TOKEN`
4. Auth service returns JWT access token + sets refresh token cookie
5. Flutter apps store JWT in Flutter Secure Storage
6. Every API request sends `Authorization: Bearer <token>`
7. On 401, ApiClient calls auth service refresh endpoint automatically

Local-only Kindred users (no profile, no account) do not need auth.

---

## Database Strategy

- Each app has its own Railway Postgres database
- Auth service has its own Railway Postgres database
- terryheath.com has its own Railway Postgres database
- No shared databases
- No cross-service queries

---

## Infrastructure

- **Hosting:** Railway (all services)
- **Email:** AWS SES (transactional + newsletter)
- **Storage:** AWS S3 (per-app buckets: kindred-uploads, analoglist-assets)
- **DNS:** Cloudflare
- **Domains:** terryheath.com, auth.terryheath.com

---

## Build Order

1. ✅ Auth service (services/auth)
2. ✅ terryheath.com (services/web)
3. ✅ Monorepo scaffold + ui_kit + core (packages/)
4. 🔄 Kindred Flutter app (apps/kindred) — Sessions 1 & 2 complete
5. ⬜ AnalogList rebuild (apps/analoglist)
6. ⬜ North Star Postal integration (TBD)

---

## Core Rules

### Apps are independent
- Apps do not import from each other
- Apps do not share domain logic
- Apps do not share databases

### Shared packages are minimal
- ui_kit: visual components only
- core: utilities only, no domain models
- If it belongs to one app, it stays in that app

### One admin
- terryheath.com/admin handles everything
- Do not build secondary admin interfaces

### No over-engineering
- No Redis, no message queues, no API gateways
- Postgres handles everything at this scale
- Add infrastructure only when a specific problem demands it

### Lightweight by default
- Prefer duplication over premature abstraction
- Simple REST endpoints
- No shared databases
- No cross-service syncing

---

## Entitlements

**RevenueCat** handles in-app purchases across the ecosystem.

- One RevenueCat project for the entire ecosystem
- AnalogList and Kindred both offer a one-time power-user purchase (non-consumable)
- Entitlement checking logic lives in `packages/core` as a thin RevenueCat wrapper
- Both apps share the same entitlement check — one purchase unlocks both apps (TBD on exact product structure)
- North Star Postal: if it becomes a Flutter app, it joins the same RevenueCat project
- Do not add RevenueCat until the first app is otherwise complete
- Monetization is voluntary — no paywalls, no feature gating, quiet support option in Show Up screen

---

## Anti-Patterns

Do NOT:
- Merge app backends
- Create shared databases
- Build cross-app syncing
- Add push notifications (Kindred especially)
- Use urgency or task language in Kindred
- Build separate admin UIs for individual features
- Add Firebase, RevenueCat, or other heavy SDKs without explicit decision
- "Future-proof" anything prematurely
