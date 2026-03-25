# Claude Rules — Kindred Ecosystem

Claude MUST follow these rules when generating code or plans for this repository.

---

## Repository Awareness

This is a monorepo at `kindred-ecosystem/` containing:
- `/apps` — Flutter apps (kindred, analoglist)
- `/packages` — Shared Flutter packages (ui_kit, core)
- `/services` — Backend services (auth, web)
- `/docs` — Architecture docs, guidelines, prompts

---

## Before Writing Any Code

1. Read the relevant existing files first
2. Show what you found
3. Wait for confirmation before proceeding
4. State what you are about to change before changing it

This is non-negotiable. Do not generate code speculatively.

---

## Core Rules

### 1. Apps are independent
Claude MUST NOT:
- Import from one app into another
- Share domain models between apps
- Suggest merging app backends or databases

### 2. Use shared packages correctly
Claude SHOULD use:
- `packages/ui_kit` for all UI components and theme
- `packages/core` for HTTP client and date utilities

Claude MUST NOT:
- Put business logic in shared packages
- Add domain models to core or ui_kit
- Add app-specific code to shared packages

### 3. One admin
All admin functionality belongs in `services/web` at terryheath.com/admin.
Claude MUST NOT suggest building separate admin interfaces for individual apps or features.

### 4. Auth is central
All authenticated requests go through `services/auth` at auth.terryheath.com.
Claude MUST NOT suggest building app-specific auth systems.

---

## Logs Before Fixes

When something is broken, Claude MUST:
1. Read the Railway logs first (`railway logs --tail 100`)
2. Show the actual error
3. Diagnose from the real error
4. State the fix before applying it
5. Show changed files before pushing

Claude MUST NOT:
- Guess at causes without reading logs
- Push fixes without showing the changes first
- Declare something fixed without verifying

---

## Flutter Rules

### Theme and styling
- Always use `ui_kit` for colors, typography, spacing, border radius
- Never hardcode colors or font sizes
- Visual language: warm off-white backgrounds, turquoise (#2AB8A0) accent, Inter font

### State management
- Provider pattern (matches AnalogList)
- Keep providers focused and small

### Navigation
- GoRouter (matches AnalogList)
- Shell routes for bottom navigation

### HTTP
- Use `ApiClient` from `packages/core`
- Never use raw Dio directly in app code
- Token storage: Flutter Secure Storage only

### Dependencies
Allowed without asking:
- go_router, provider, dio, flutter_secure_storage
- cached_network_image, shimmer, google_fonts
- share_plus, url_launcher, intl
- flutter_native_splash, flutter_launcher_icons

Require explicit decision:
- Any Firebase package
- Any analytics package
- Any push notification package
- RevenueCat or any subscription package
- Any package not already in the ecosystem

---

## Kindred App Rules (Non-Negotiable)

Kindred is a care app. It is NOT a task manager, CRM, or social network.

### Screen names (non-negotiable)
- **Kindred** — the avatar grid screen. The main/home screen. The app is named after this screen.
- **Kin** — an individual person page (opened via bottom sheet from Kindred)
- **Your Kin** — collective term for all the people in your grid
- **Show Up** — your own profile screen
- **Keep** — the action of adding someone from their shared profile

These names appear in code (route names, widget names, file names) and in UI copy. Do not rename them.

### Language rules
Claude MUST NOT use:
- Task language: due, overdue, complete, to-do, task, reminder, alert
- Urgency language: don't forget, you haven't, it's been X days
- Social language: follow, followers, feed, likes, broadcast, share count

Claude MUST use:
- Keep (adding someone to your Kin)
- Show Up (creating your profile)
- Kindred (the avatar grid / home screen)
- Kin (an individual person and their bottom sheet page)
- Your Kin (everyone in your grid)

### Signal system
- Rings around avatars are the ONLY signal system
- No push notifications — ever, in any version
- No badge counts
- No red indicators
- Ring glow: teal, intensity reflects date proximity
- Manually held avatars: warm amber glow, distinct from date-triggered teal

### Person page rules
Every person has two strictly separate layers:
1. **Their profile** — what they shared (birthday, wishlist links, interests)
2. **Your notes** — private observations, custom dates, private wishlists

Claude MUST NOT:
- Mix these layers
- Make private notes visible to the person they describe
- Suggest syncing or sharing private notes

### "let go" 
When a person has a manual position override (`positionOverride != null`), the Kin sheet shows a small quiet "let go" option at the bottom. Tapping it releases the override and returns the person to date-driven positioning. Only visible when override is active.

### Home screen (Your Kin)
- Full-screen avatar grid
- No names displayed on the grid
- Two forces act on position: date proximity (automatic) and manual drag (intentional)
- Avatar physics: gentle buoyancy, soft floating motion, nothing jerky
- Tapping an avatar opens a bottom sheet — never navigates away from the grid
- The grid is always visible behind the bottom sheet

---

## Next.js / services/web Rules

### terryheath.com/admin
- Protected by ADMIN_PASSWORD env var
- Single admin user (Terry)
- This is the admin for the ENTIRE ecosystem — build all admin here

### Runtime
- All routes using `pg` MUST have `export const runtime = 'nodejs'`
- Middleware runs in Edge Runtime — MUST NOT import pg or Node.js-only modules
- Middleware checks cookie existence only — full validation happens in route handlers

### Email
- All email via AWS SES SMTP
- Port 587, secure: false, STARTTLS
- Newsletter sends: terry@terryheath.com
- Transactional (magic links): noreply@terryheath.com

---

## Node.js / services/auth Rules

- No ORM — use `pg` directly
- No TypeScript — plain JavaScript
- CORS applies to `/auth/*` routes only — never to `/admin/*` routes
- Magic links: single-use, 15 minute expiry
- JWTs: 15 minute access token, 30 day refresh token

---

## Code Generation Rules

Claude MUST:
- Write simple, readable code
- Avoid unnecessary abstraction
- Prefer duplication over premature sharing
- Follow existing patterns in the repo
- Show changes before pushing

Claude MUST NOT:
- Introduce complex architecture without explicit need
- Add infrastructure layers (Redis, queues, gateways) without explicit decision
- Refactor working code without being asked
- Push code without showing the diff first

---

## Railway Deployment

- Deploy command for Node/Express services: `node migrate.js && node src/index.js`
- Deploy command for Next.js: `node migrate.js && next build && next start`
- Migrations run automatically on deploy via `migrate.js`
- Never suggest running raw SQL manually — always use migrations

---

## Red Flags (DO NOT DO)

- "Let's unify all app data"
- "We should create a shared database"
- "This should be a platform layer"
- "Let's future-proof this"
- "We could add a notification for that"
- "Should we show the user's name here?" (on Kindred grid)
- "Let's add a social feed"
- "I'll fix that and push it" (without showing the change first)
- "The fix has been deployed" (without verifying it worked)

---

## Guiding Principle

Build only what is needed now.

Keep apps independent.

Keep infrastructure minimal.

Read before writing. Verify before declaring done.

The apps should feel like they're on your side — quiet, present, unhurried.
