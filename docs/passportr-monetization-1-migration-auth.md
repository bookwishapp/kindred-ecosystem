# Passportr Monetization — Prompt 1: Migration + Auth Update

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Tasks A and B can run in parallel. Task C depends on A.

---

## Task A — Migration: organizer_profiles table

Read all existing files in `services/passportr/migrations/` to confirm the next migration number.

Create `services/passportr/migrations/005_organizer_profiles.sql`:

```sql
CREATE TABLE IF NOT EXISTS organizer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  website TEXT,

  -- Plan
  -- Values: 'single_tier1', 'single_tier2', 'occasional_tier1', 'occasional_tier2',
  --         'regular_tier1', 'regular_tier2', 'unlimited_tier1', 'unlimited_tier2'
  plan VARCHAR(30),
  tier INTEGER DEFAULT 1,
  max_hops INTEGER,
  hops_used_this_period INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status VARCHAR(20) DEFAULT 'inactive',

  -- Single hop credit
  single_hop_credit INTEGER DEFAULT 0,
  single_hop_purchased_at TIMESTAMPTZ,
  single_hop_expires_at TIMESTAMPTZ,

  -- Nonprofit
  nonprofit_verified BOOLEAN DEFAULT false,
  nonprofit_pending BOOLEAN DEFAULT false,
  nonprofit_ein TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizer_profiles_user_id_idx ON organizer_profiles(user_id);
CREATE INDEX IF NOT EXISTS organizer_profiles_stripe_customer_idx ON organizer_profiles(stripe_customer_id);
```

`subscription_status` values: `'inactive'`, `'active'`, `'past_due'`, `'canceled'`, `'single'`

---

## Task B — Environment Variables

Add the following env vars to the `outstanding-dedication` Railway service:

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_TIER1_SINGLE=
STRIPE_PRICE_TIER1_OCCASIONAL=
STRIPE_PRICE_TIER1_REGULAR=
STRIPE_PRICE_TIER1_UNLIMITED=
STRIPE_PRICE_TIER2_SINGLE=
STRIPE_PRICE_TIER2_OCCASIONAL=
STRIPE_PRICE_TIER2_REGULAR=
STRIPE_PRICE_TIER2_UNLIMITED=
PASSPORTR_ADMIN_SECRET=
```

`PASSPORTR_ADMIN_SECRET` should be a long random string. Generate one with:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Also add `PASSPORTR_ADMIN_SECRET` to the `terryheath.com` Railway service with the same value — it will be used in a later prompt to authenticate admin API calls.

---

## Task C — Update `lib/auth.js`

**Depends on Task A (migration must have run before deploying this change).**

Read `services/passportr/lib/auth.js`.

**Change 1:** Add db import at the top of the file:

```js
const db = require('./db');
```

**Change 2:** Replace `isOrganizer` and `requireOrganizer` entirely.

Find:
```js
function isOrganizer(user) {
  if (!user || !user.email) return false;
  const organizerEmails = process.env.ORGANIZER_EMAILS || '';
  const allowedEmails = organizerEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
  return allowedEmails.includes(user.email.toLowerCase());
}

function requireOrganizer(req) {
  const user = requireAuth(req);
  if (!isOrganizer(user)) {
    throw new Error('Forbidden');
  }
  return user;
}
```

Replace with:

```js
async function getOrganizerProfile(userId) {
  const result = await db.query(
    `SELECT * FROM organizer_profiles
     WHERE user_id = $1
     AND (
       subscription_status = 'active'
       OR subscription_status = 'past_due'
       OR (
         subscription_status = 'single'
         AND single_hop_expires_at > NOW()
       )
       OR nonprofit_verified = true
     )`,
    [userId]
  );
  return result.rows[0] || null;
}

async function requireOrganizer(req) {
  const user = requireAuth(req);
  const profile = await getOrganizerProfile(user.sub);
  if (!profile) {
    throw new Error('Forbidden');
  }
  return { user, profile };
}
```

**Change 3:** Update exports:

Find:
```js
module.exports = { verifyToken, getAuthUser, requireAuth, isOrganizer, requireOrganizer };
```

Replace with:
```js
module.exports = { verifyToken, getAuthUser, requireAuth, getOrganizerProfile, requireOrganizer };
```

---

## Task D — Update all routes that call requireOrganizer

**Depends on Task C.**

`requireOrganizer` is now async and returns `{ user, profile }` instead of just `user`. Read and update each of these files:

- `services/passportr/app/api/hops/route.js`
- `services/passportr/app/api/hops/[hopSlug]/route.js`
- `services/passportr/app/api/hops/[hopSlug]/venues/route.js`
- `services/passportr/app/api/hops/[hopSlug]/venues/[venueId]/route.js`
- `services/passportr/app/api/hops/[hopSlug]/invitations/route.js`
- `services/passportr/app/api/hops/[hopSlug]/invitations/import/route.js`
- `services/passportr/app/api/hops/[hopSlug]/invitations/[invitationId]/route.js`
- `services/passportr/app/api/hops/[hopSlug]/participants/route.js`
- `services/passportr/app/api/hops/[hopSlug]/participants/[participantId]/route.js`
- `services/passportr/app/api/hops/[hopSlug]/qr-codes/route.js`

In every file, make exactly these changes and no others:

1. Find every `requireOrganizer(req)` call
2. Add `await` and destructure: `const { user, profile } = await requireOrganizer(req);`
3. All existing `user.sub` references remain unchanged
4. Catch blocks remain unchanged — `requireOrganizer` still throws `'Unauthorized'` and `'Forbidden'`

The `profile` variable is now available in each route but not yet used — that comes in a later prompt. Do not add any hop/venue limit logic here.

---

## Verification Checklist

- [ ] `migrations/005_organizer_profiles.sql` exists with correct schema
- [ ] All 11 env vars added to `outstanding-dedication` Railway service
- [ ] `PASSPORTR_ADMIN_SECRET` added to terryheath.com Railway service
- [ ] `lib/auth.js` imports db
- [ ] `lib/auth.js` `requireOrganizer` is async, queries database, returns `{ user, profile }`
- [ ] `lib/auth.js` no reference to `ORGANIZER_EMAILS` remains
- [ ] All 10 route files updated to `await requireOrganizer` and destructure `{ user, profile }`
- [ ] No other files modified
