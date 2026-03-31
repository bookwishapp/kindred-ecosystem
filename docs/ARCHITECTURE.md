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
    auth/             → Central authentication service (Node/Express) — auth.terryheath.com
    web/              → terryheath.com — blog, newsletter, ecosystem admin (Next.js)
    kindred/          → Kindred API backend (Node/Express) — api.fromkindred.com
    kindred-web/      → fromkindred.com — profile pages, marketing, App Store redirect (Next.js)
    passportr/        → passportr.io — digital event passports (Next.js) — in development
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
- Issues JWTs (30 day access token, 30 day refresh token)
- Single identity works across all apps
- JWT contains: `sub` (user UUID — permanent, never changes), `email`
- No username in JWT — username lives in each app's own profiles table
- Node/Express, Postgres on Railway

#### /services/web — terryheath.com
The hub. Does three things:
1. **Newsletter/blog** — Small Things, Terry's weekly letter
2. **Public website** — terryheath.com
3. **Ecosystem admin** — terryheath.com/admin is the one and only admin interface for the entire system

Next.js, Postgres on Railway.

#### /services/kindred — api.fromkindred.com
The Kindred API backend.
- All Kindred app data: profiles, kin records, dates, wishlist links
- JWT verification via shared JWT_SECRET with auth service
- Presigned S3 URLs for photo uploads
- Node/Express, Postgres on Railway

#### /services/kindred-web — fromkindred.com
The public face of Kindred.
- Profile landing pages at `/{username}` — shown when someone shares their Kindred profile
- Accepts both UUID and username — `fromkindred.com/{uuid}` and `fromkindred.com/{username}` both resolve
- Deep link redirect to app (`kindred://profile/{username}`)
- App Store redirect when app not installed

Next.js, no database, separate Railway service.

#### /services/passportr — passportr.io
Digital event passport platform. Replaces paper passports with QR-based digital ones.
- Organizers create hops (multi-venue events)
- Participants scan QR codes at venues to collect stamps
- Complete enough venues → earn rewards and/or enter a drawing
- No app required for participants — fully web-based
- Next.js 14 (App Router), single service handles everything
- Postgres on Railway (dedicated database)
- Railway service name: `outstanding-dedication`

Key concepts:
- **Hop** — a multi-venue event with a completion rule and reward structure
- **Venue** — a participating location with stamp and redeem QR codes
- **Stamp** — collected by participant scanning venue's stamp QR
- **Passport** — a participant's record for a specific hop (`/{user.sub}/{hop-slug}`)
- **Participant** — identified by `user.sub` (UUID) permanently — never by username

Auth pattern:
- Organizers: authenticated via `passportr_token` cookie (JWT from central auth)
- Participants: same cookie, set after magic link via `/api/auth/callback`
- Venues: access via `stamp_token` URL — no login required
- Venue self-service: authenticated via `X-Venue-Token` header (stamp_token value)
- `requireOrganizer()` is async, queries `organizer_profiles` table, returns `{ user, profile }`

Organizer roles:
- Organizer role lives in Passportr's `organizer_profiles` table — NOT in auth service
- Subscription managed via Stripe — plans are tier-based (venue count) × frequency (hop count)
- Nonprofit verified flag set manually by Terry via terryheath.com/admin

---

## Satellite Products

### North Star Postal (northstarpostal.com)
Custom letters to children from beloved characters (Santa, Easter Bunny, Tooth Fairy, etc.). Will eventually surface in terryheath.com/admin and integrate with Kindred.

### Sinclair Inlet Book Co.
Physical bookstore in Port Orchard, WA. 501c3 nonprofit. Source of raw material for the Small Things newsletter. Home of Paper Street Thrift.

### Gone Goat
Card game. No technical component currently. When it does, it lives in terryheath.com.

---

## Admin Strategy

**terryheath.com/admin is the one and only admin interface.**

Tab structure:
```
terryheath.com/admin
  /admin/overview              → ecosystem-wide stats dashboard
  /admin/small-things/...      → newsletter posts, subscribers, sends
  /admin/passportr/...         → organizers, hop participants, notifications
  /admin/kindred/...           → when Kindred opt-in is live
  /admin/users/...             → auth service user management (future)
```

Each service exposes an admin API that terryheath.com proxies to. terryheath.com never stores cross-service data — it reads and triggers via API calls only.

Do not build separate admin interfaces for individual apps or services.

---

## Admin API Contract

Every service that surfaces in terryheath.com/admin exposes these endpoints, secured with a shared secret (`x-admin-secret` header):

```
GET  /api/admin/stats          → overview numbers for the ecosystem dashboard
GET  /api/admin/subscribers    → paginated opt-in list with filters
POST /api/admin/send           → trigger a notification send to a segment
GET  /api/admin/sends          → send history
```

Additional service-specific endpoints are allowed but must follow the same auth pattern.

The shared secret is stored as `{SERVICE}_ADMIN_SECRET` in both the service's Railway env vars and in terryheath.com's Railway env vars. terryheath.com sends it as `x-admin-secret` on every proxied request.

---

## Authentication Flow

1. User requests magic link → hits `POST auth.terryheath.com/auth/request` (never called directly from browser — proxy through each service's `/api/auth/request`)
2. SES sends email with link containing `redirect_uri`
3. User clicks link → `GET auth.terryheath.com/auth/verify?token=TOKEN&redirect_uri=...`
4. Auth service verifies token, redirects to `redirect_uri?access_token=TOKEN`
5. Web services: callback route sets cookie, redirects to `return_to`
6. Flutter apps: deep link (`kindred://`) intercepted by OS, app handles token
7. Flutter stores JWT in Flutter Secure Storage
8. Every API request sends `Authorization: Bearer <token>`
9. On 401, ApiClient calls auth service refresh endpoint automatically

Local-only Kindred users (no profile, no account) do not need auth.

---

## Database Strategy

- Each app has its own Railway Postgres database
- Auth service has its own Railway Postgres database
- terryheath.com has its own Railway Postgres database
- No shared databases
- No cross-service queries
- Cross-service data access happens only via admin API calls from terryheath.com

---

## Infrastructure

- **Hosting:** Railway (all services)
- **Email:** AWS SES — one account, one verified domain (terryheath.com)
  - Auth service: magic links from noreply@terryheath.com
  - terryheath.com: newsletter from terry@terryheath.com
  - Passportr: invitations and notifications from noreply@terryheath.com (passportr.io pending SES verification)
  - All services share the same SES SMTP credentials via env vars: `SES_SMTP_HOST`, `SES_SMTP_PORT`, `SES_SMTP_USERNAME`, `SES_SMTP_PASSWORD`, `SES_FROM_EMAIL`
  - SMTP: port 587, STARTTLS, host email-smtp.us-east-1.amazonaws.com
- **Storage:** AWS S3 (per-app buckets)
  - `kindred-uploads` — Kindred profile photos
  - `analoglist-assets` — AnalogList media
  - `passportr-images` — hop banners, logos, venue logos (public-read)
  - All buckets use presigned URLs — never upload through the server
- **Payments:** Stripe (one account, ecosystem-wide)
  - Passportr: subscription billing via Stripe Billing
  - RevenueCat for Flutter in-app purchases (future)
- **DNS:** Cloudflare
- **Domains:** terryheath.com, auth.terryheath.com, api.fromkindred.com, fromkindred.com, passportr.io

---

## Build Order

1. ✅ Auth service (services/auth)
2. ✅ terryheath.com (services/web)
3. ✅ Monorepo scaffold + ui_kit + core (packages/)
4. 🔄 Kindred Flutter app (apps/kindred) — Sessions 1–4 complete, ongoing
5. 🔄 Passportr (services/passportr) — core features complete, monetization in progress
6. ⬜ AnalogList rebuild (apps/analoglist)
7. ⬜ North Star Postal integration (TBD)

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
- Each service exposes an admin API; terryheath.com proxies to it

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
- Do not add RevenueCat until the first app is otherwise complete
- Monetization is voluntary — no paywalls, no feature gating

**Stripe** handles web subscription billing.
- Passportr organizer subscriptions via Stripe Billing
- One Stripe account, ecosystem-wide

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
- Call auth service directly from the browser — always proxy through the service's own `/api/auth/request`
- Store username in JWT or use it as a permanent identifier — use `user.sub` (UUID)
- Build organizer role logic into the auth service — each app owns its own roles
