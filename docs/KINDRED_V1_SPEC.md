# Kindred — v1 Specification

## The Idea

Kindred helps you take care of the people in your life — not by reminding you, but by keeping them present.

---

## Language (Non-Negotiable)

- The main/home screen = **Kindred** (the app is named after this screen)
- The avatar grid = **Your Kin**
- Adding someone from their shared profile = **Keep**
- Creating your own profile = **Show Up**
- Inviting a local person to create a profile = **Invite to Show Up**
- People in your grid = **your kin**
- The app never uses: follow, track, remind, due, overdue, alert, notification, feed, social

---

## Two Kinds of People in Your Kin

### Linked
- They have a Kindred profile
- Their profile data is live — changes sync to your view
- You still have your own private notes on them

### Local
- You created them manually (photo, name, dates you know)
- You own all the data
- Can be invited to Show Up later — converting to Linked without losing your notes

---

## Screens

### 1. Kindred (Home)

The avatar grid screen. The app is named after this screen.

- Full-screen grid of circular avatar photos
- No names displayed
- Two forces act on sort order:
  - **Dates** float people up automatically as events approach
  - **Intention** — any kin can be manually dragged up to hold them in mind
- Avatars with upcoming dates show a gently glowing ring
  - Ring intensity increases as the date approaches
  - Date-triggered glow: soft pulse
  - Manually held (dragged up): steady warm glow — visually distinct
- The feeling: avatars floating up toward you as they need your attention
- Avatar physics: gentle buoyancy, soft floating motion — like bubbles rising in water. Nothing jerky, nothing mechanical.
- Tapping an avatar opens a bottom sheet (the Kin page) — never navigates away from the grid
- Avatar vertical position driven by urgency: most urgent near top, least urgent near bottom
- Avatar size scales with urgency: 80px (bottom/no date) to 110px (top/imminent)
- Horizontal positions are organically random (seeded by person id — consistent, not random on every build)
- Drag up: moves avatar higher, grows it, increases amber ring intensity
- Drag down: moves avatar lower, shrinks it, fades amber ring
- Drag to very bottom (>95% screen): releases manual override, returns to date-driven position
- "let go" option in Kin sheet when manual override is active — releases override, returns to natural position
- No list view
- No names on grid
- No badge counts

### 2. Kin (Person Page)

Two distinct layers, always kept separate.

#### Their Profile (Linked or manually entered)
- Photo
- Name
- Birthday
- Wishlist links (URLs they've added themselves, or you've entered locally)
- Interests / what they collect
- Any other dates they've shared (anniversary, etc.)

#### Your Notes (private, never visible to them)
- Free text observations ("mentioned wanting X", "going through something")
- Custom dates you want to remember
- Private wishlist notes
- Nothing here ever syncs or shares

### 3. Your Profile (Show Up)

What you share when someone keeps you.

- Photo
- Name
- Birthday
- Wishlist links (your own Amazon list, Goodreads shelf, etc.)
- Interests / what you collect
- Custom dates you choose to share
- Shareable via deep link

### 4. Add to Kin

Two paths:

**Manual:** Enter name, add photo, add any dates and notes you know. Creates a Local person.

**From profile:** Open a shared deep link → see their profile → tap Keep → they join your Kin as Linked.

### 5. Invite to Show Up

From any Local person's page:
- Send an invite (via share sheet — text, email, etc.)
- If they show up, they convert from Local to Linked
- Your private notes are preserved through the conversion

---

## Ring System

- Rings appear around avatars on the Kindred screen
- Triggered by any entered date: birthday, anniversary, custom date
- Ring glow intensity = proximity to the date:
  - > 60 days: no ring
  - 31–60 days: barely visible (0.15 opacity)
  - 15–30 days: noticeably present (0.40 opacity)
  - 8–14 days: strong glow (0.65 opacity)
  - 4–7 days: very strong (0.85 opacity)
  - ≤ 3 days: fully glowing (1.0 opacity)
- Date-triggered ring: teal (#2AB8A0), pulsing animation
- Manually positioned avatars: amber (#E8A84C), steady (no pulse)
- Amber intensity scales with vertical position: full amber at top, none at bottom
- If both a date ring and manual position exist, teal takes priority
- No numbers, no badges, no text labels on the grid

---

## Auth

- Magic link via email (hits the central auth service at auth.terryheath.com)
- Required only for profile owners (Show Up)
- Local-only users (no profile) do not need an account
- JWT stored in Flutter Secure Storage
- Refresh token handled via auth service

---

## Data Model (High Level)

### Local (on device / user's own backend)
- `kin` — list of people in your grid
  - `id`, `name`, `photo`, `type` (linked | local), `position_override` (for manual drag)
  - `linked_profile_id` (nullable — set when Linked)
- `kin_dates` — dates attached to a kin person
  - `kin_id`, `label`, `date`, `recurs_annually`
- `kin_notes` — private notes
  - `kin_id`, `body`, `created_at`
- `kin_wishlist_links` — private or local wishlist entries
  - `kin_id`, `label`, `url`

### Profile (shared, lives on server)
- `profiles`
  - `user_id`, `name`, `photo_url`, `birthday`, `bio`
- `profile_wishlist_links`
  - `profile_id`, `label`, `url`
- `profile_dates`
  - `profile_id`, `label`, `date`, `recurs_annually`

---

## Tech Stack

- Flutter (iOS + Android)
- Auth: central auth service (auth.terryheath.com) — magic link, JWT. All apps share this. No app-specific auth.
- Backend: dedicated Railway service + Postgres (Kindred-specific, owns its own DB)
- Local storage: sqflite for private data (notes, private dates, private wishlist links, position overrides)
- Storage: S3 (kindred-uploads bucket)
- No push notifications in v1

---

## Data Architecture

### Server-side (Railway Postgres)
- **Profiles** — Show Up data. Plaintext, shared. name, photo_url, birthday, wishlist links, shared dates. Live — syncs to anyone who has Kept you.
- **Kin records** — Who you've added. Links your auth user_id to a profile_id (Linked) or local person data. Includes position_override.

### Device-side (sqflite)
- **Private notes** per kin person
- **Private dates** per kin person  
- **Private wishlist links** per kin person
- **Position overrides** (also backed up to server)

### Private data backup
Private notes never leave the device in readable form. They are encrypted and backed up to the Kindred backend tied to the user's auth id. Encryption key derives from the user's JWT. Server stores ciphertext only — never plaintext. On new device, encrypted backup restores after login.

---

## Build Sessions

### ✅ Session 1 — Project scaffold + navigation shell
Flutter app created, GoRouter, Provider, bottom nav (Kin / + / You), placeholder screens.

### ✅ Session 2 — Avatar grid
Stack-based positioning, ring system, drag positioning, float animations, size scaling, "let go".

### ✅ Session 3a — Backend service + profiles + kin records
Railway service deployed at kindred.terryheath.com. Postgres migrations, REST endpoints. Auth via central auth service JWT. Flutter app wired to real data.

### ✅ Session 3b — Private notes UI
Kin sheet full content built: notes, private dates, private wishlist links. Local sqflite storage. kin_people table for local persistence. CupertinoDatePicker throughout.

### ✅ Session 3c — Encrypted backup
Private data encrypted (AES-256-GCM, key derived from JWT) before sending to kindred backend. Restore runs on login. Server stores ciphertext only.

### ✅ Session 4 — Auth + Show Up + Overlay Navigation
Fully working in TestFlight. Magic link sends, deep link returns JWT to app. 30-day access tokens. Show Up sheet: photo, name, username, birthday, wishlist links, shared dates. AppBar avatar updates. Settings dropdown: email updates, settings, sign out, delete account. Profile stored in auth service (cross-app identity).

### ✅ Session 5 — Add Kin full flow
Local kin: name, photo (device only), birthday, dates. Persists in sqflite. Appears in grid immediately with correct ring/size/position. Photo displays in kin sheet. Can add photo to existing kin. Let go (delete) works.

### ⬜ Session 6 — Keep flow (linked profiles)
Universal Links (AASA file) so fromkindred.com links open app directly. Profile preview sheet when receiving kindred://profile/{username} deep link. Keep button adds linked kin. Invite to Show Up from local kin sheet.

---

## Visual Language

- Warm gray backgrounds, teal accents (follows AnalogList)
- Avatar rings: teal glow, varying intensity
- Manually held avatars: warm amber glow (distinct from teal)
- No sharp urgency colors (no red, no orange badges)
- The grid should feel like a quiet room, not a dashboard

---

## Navigation Pattern

The Kindred grid is ALWAYS the base layer. It is never replaced or pushed off screen. Every surface is a bottom sheet overlay.

### Navbar (persistent)
- **Kin (left):** `CupertinoIcons.person_2` — dismisses all open sheets, returns to grid. Does not navigate anywhere.
- **+ (center):** Dark rounded button — opens Add Kin as bottom sheet
- **Your avatar (right):** Shows initials before Rising Up, photo after. Tapping opens settings dropdown overlay.

### All overlays (bottom sheets)
- **Kin sheet** — person page, opens over grid
- **Add Kin sheet** — add a person manually
- **Rise Up sheet** — your own editable profile
- **Settings dropdown** — small overlay from avatar, contains: Rise Up, email updates toggle, support link, sign out

### Settings dropdown contains
- Rise Up (opens Rise Up sheet)
- Email updates toggle
- Support link (mailto:terry@terryheath.com)
- Sign out (only if authenticated)

The Kin icon always releases whatever is open and returns to the grid.

---

## Monetization

Voluntary, no pressure, no feature gating.

- A quiet "support this" option in the Show Up screen
- One-time purchase via RevenueCat (non-consumable)
- No paywall, no locked features, no upgrade prompts
- The language should fit the voice — not "upgrade" or "premium"
- Do not add until the app is otherwise complete

---

## What's Not in v1

These are not "future phases" — they are ideas that haven't been fully thought through yet:
- AnalogList wishlist integration (deep link connection between apps)
- Group kin (families, households)
- Any form of push notification

---

## Guiding Principle

The app should feel like it's on your side — quiet, present, unhurried.

It surfaces the people who need your attention without demanding anything.
