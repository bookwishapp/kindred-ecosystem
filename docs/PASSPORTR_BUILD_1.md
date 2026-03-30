# Claude Code Prompt — Passportr: Build Session 1

## Context

Read these files before starting:
- `docs/ARCHITECTURE.md`
- `docs/CLAUDE.md`
- `services/web/` — reference for Next.js patterns, styling, and auth integration

This session builds `services/passportr/` — a new Next.js service in the monorepo. It replaces paper event passports with digital ones. Participants scan QR codes at venues to collect stamps, complete hops, and redeem rewards.

Summarize in three bullet points what this session builds. Wait for confirmation before proceeding.

---

## Repository location

```
kindred-ecosystem/
  services/
    passportr/    ← build this
```

Standard Railway setup:
- Root directory: `services/passportr`
- Watch paths: `services/passportr/**`
- Start command: `node migrate.js && next build && next start`
- Port: Railway assigns via `PORT` env var

---

## Part 1 — Scaffold

Create `services/passportr/` as a standard Next.js 14 app (App Router).

```
services/passportr/
  app/
    layout.jsx
    page.jsx                          → redirect to /organize or marketing stub
    hop/[hopSlug]/page.jsx            → public hop landing page
    [username]/page.jsx               → participant passport history
    [username]/[hopSlug]/page.jsx     → participant passport for one hop
    stamp/[token]/page.jsx            → QR scan → stamp action
    redeem/[token]/page.jsx           → QR scan → redemption action
    organize/page.jsx                 → organizer dashboard
    organize/[hopSlug]/page.jsx       → manage a specific hop
    venue/[token]/page.jsx            → venue page (QR codes + redemption count)
    api/
      stamp/route.js                  → POST: record a stamp
      redeem/route.js                 → POST: generate or retrieve coupon
      hops/route.js                   → GET/POST: list or create hops
      hops/[hopSlug]/route.js         → GET/PUT: hop details
      hops/[hopSlug]/venues/route.js  → GET/POST: venues for a hop
      participants/route.js           → GET: participant lookup
  lib/
    db.js                             → pg pool
    auth.js                           → JWT verification (shared secret with auth service)
  migrate.js
  migrations/
    001_initial.sql
  public/
  package.json
  next.config.js
  .env.example
```

---

## Part 2 — Database migrations

Create `migrations/001_initial.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE hops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  completion_rule JSONB NOT NULL DEFAULT '{"type": "all"}',
  stamp_cutoff_date DATE NOT NULL,
  redeem_cutoff_date DATE NOT NULL,
  coupon_expiry_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  reward_description TEXT,
  stamp_token VARCHAR(20) UNIQUE NOT NULL,
  redeem_token VARCHAR(20) UNIQUE NOT NULL,
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(hop_id, user_id)
);

CREATE TABLE stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stamped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, venue_id)
);

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) UNIQUE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  UNIQUE(participant_id, venue_id)
);
```

---

## Part 3 — Auth middleware

In `lib/auth.js`, verify JWTs from the central auth service:

```javascript
const jwt = require('jsonwebtoken');

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

function requireAuth(req) {
  const user = getAuthUser(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

module.exports = { verifyToken, getAuthUser, requireAuth };
```

Participants authenticate via cookie — after magic link flow, store JWT in a cookie named `passportr_token`. Read it on stamp/redeem pages to identify the participant.

---

## Part 4 — Token generation

Venue tokens are 8-character alphanumeric strings (uppercase, no ambiguous chars like 0/O/1/I):

```javascript
const { randomBytes } = require('crypto');
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateToken() {
  const bytes = randomBytes(8);
  return Array.from(bytes).map(b => CHARS[b % CHARS.length]).join('');
}
```

---

## Part 5 — Core API routes

### POST /api/stamp
```javascript
// body: { stamp_token }
// cookie: passportr_token (JWT)
// 1. Look up venue by stamp_token
// 2. Get hop from venue
// 3. Verify hop is active (today between start_date and stamp_cutoff_date)
// 4. For redemptions, verify today is before redeem_cutoff_date
// 4. Get or create participant record
// 5. Insert stamp (ignore if already stamped — idempotent)
// 6. Check completion rule — if met, set participants.completed_at
// 7. Return { stamped: true, passport_url: "/{username}/{hop-slug}" }
```

### POST /api/redeem
```javascript
// body: { redeem_token }
// cookie: passportr_token (JWT)
// 1. Look up venue by redeem_token
// 2. Verify participant has completed the hop
// 3. Check if coupon already exists for this participant+venue
// 4. If not, generate coupon code, set expires_at = NOW() + 30 minutes
// 5. Return { coupon_code, expires_at, reward_description, venue_name }
```

### Completion check logic
```javascript
function checkCompletion(rule, stampedVenueIds, allVenues) {
  if (rule.type === 'all') {
    return allVenues.every(v => stampedVenueIds.includes(v.id));
  }
  if (rule.type === 'percentage') {
    const required = Math.ceil(allVenues.length * (rule.percent / 100));
    return stampedVenueIds.length >= required;
  }
  if (rule.type === 'minimum') {
    return stampedVenueIds.length >= rule.count;
  }
  if (rule.type === 'required_plus') {
    const requiredStamped = rule.required.every(id => stampedVenueIds.includes(id));
    const optionalCount = stampedVenueIds.filter(id => !rule.required.includes(id)).length;
    return requiredStamped && optionalCount >= (rule.minimum_optional || 0);
  }
  return false;
}
```

---

## Part 6 — Pages

### Styling
Match the ecosystem visual language:
- Font: Poppins (headings, UI) + Lora (body text) via Google Fonts
- Background: `#F0EDE6` (warm off-white)
- Accent: `#2AB8A0` (teal)
- Text: `#1A1A1A` primary, `#6B6B6B` secondary
- Border radius: 12px for cards, 8px for inputs
- No harsh shadows — subtle `0 1px 3px rgba(0,0,0,0.08)`

Import fonts in `app/layout.jsx`.

### Passport page (`[username]/[hopSlug]/page.jsx`)
- Hop name and date range at top
- Progress: "X of Y venues stamped" with a visual row of stamp circles
- Venue list: each venue shows name, address, stamp status (✓ teal if stamped, empty circle if not)
- If completed: "You've completed the hop!" + redemption section listing each venue's reward with a "Redeem" button
- If not completed: quiet message showing what's needed
- Clean, warm, analog passport aesthetic — not a dashboard

### Stamp landing (`stamp/[token]/page.jsx`)
- Brief "Stamping your passport..." loading state
- If not authenticated: show email input → "We'll send you a link to your passport"
- After auth: record stamp, redirect to passport page
- If already stamped: redirect to passport with no error

### Redemption landing (`redeem/[token]/page.jsx`)
- If not completed: "Complete the hop first"
- If completed: generate coupon, show it large on screen
  - Venue name
  - Reward description
  - Coupon code (large, monospace)
  - Countdown timer to expiry
  - "Show this screen to the staff"
- Redirect back to passport after 30 seconds or on tap

### Organizer dashboard (`organize/page.jsx`)
- List of organizer's hops with status badges
- "Create a new hop" button
- Per hop: venue count, participant count, completion count

### Hop management (`organize/[hopSlug]/page.jsx`)
- Edit hop details: name, start date, end date, stamp cutoff date, redemption cutoff date, completion rule, description
- Venue list with add/edit/remove
- Per venue: name, address, reward description, required toggle
- "Download QR codes" button — generates printable page with both QR codes per venue
- Participant stats: stamps per venue, completion rate

### Venue page (`venue/[token]/page.jsx`)
- No auth required
- Venue name and hop name
- Large stamp QR code (for printing)
- Large redemption QR code (for printing)
- Today's redemption count
- "Print this page" button

### Public hop landing (`hop/[hopSlug]/page.jsx`)
- Hop name, dates, description
- Venue list with names and addresses
- "Join the hop" → email input if not authenticated, redirect to passport if they are

---

## Part 7 — QR code generation

Use the `qrcode` npm package to generate QR codes as SVG or PNG.

```javascript
const QRCode = require('qrcode');

// Stamp QR points to: https://passportr.io/stamp/{stamp_token}
// Redeem QR points to: https://passportr.io/redeem/{redeem_token}

const stampUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/stamp/${venue.stamp_token}`;
const qrDataUrl = await QRCode.toDataURL(stampUrl, { width: 300, margin: 2 });
```

For the printable QR page, generate both QR codes side by side with venue name above each.

---

## Part 8 — Environment variables

`.env.example`:
```
DATABASE_URL=postgresql://...
JWT_SECRET=                    # same as auth service
NEXT_PUBLIC_BASE_URL=https://passportr.io
AUTH_BASE_URL=https://auth.terryheath.com
NODE_ENV=production
PORT=3000
```

---

## Part 9 — migrate.js

Same pattern as other services in the monorepo — reads SQL files from `migrations/` in order, tracks applied migrations in a `_migrations` table.

---

## Rules

- Read docs first, three bullet summary, wait for confirmation
- Styling must match the ecosystem: Poppins, Lora, #F0EDE6, #2AB8A0
- Date pickers must use Cupertino-style (for future app compatibility) — on web use a clean native date input styled to match
- Single Next.js service — no separate API service
- Auth via central auth.terryheath.com — no separate auth system
- No app-specific admin — organizer dashboard lives at passportr.io/organize
- `passportr.io/organize` is for any organizer, not just Terry
- QR codes must be large and printable
- Passport page must work without JavaScript (progressive enhancement)
- Deploy to Railway, domain passportr.io once propagated
- No mock data — real database from day one
