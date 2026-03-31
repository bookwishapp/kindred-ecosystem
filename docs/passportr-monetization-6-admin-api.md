# Passportr — Monetization: Prompt 6 of 7
# Passportr Admin API

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Prerequisite

Prompts 1–5 must be fully deployed before this prompt runs.

---

## Task — Create Passportr Admin API

This API is called by terryheath.com/admin. It is secured by a shared secret (`PASSPORTR_ADMIN_SECRET` env var). It is never called from the browser — only server-to-server.

### A — Create `services/passportr/app/api/admin/organizers/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');

function verifyAdminSecret(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req) {
  try {
    verifyAdminSecret(req);

    const result = await db.query(
      `SELECT
        op.*,
        (SELECT COUNT(*) FROM hops WHERE organizer_user_id = op.user_id) as total_hops,
        (SELECT COUNT(*) FROM hops WHERE organizer_user_id = op.user_id AND status = 'active') as active_hops
       FROM organizer_profiles op
       ORDER BY op.created_at DESC`
    );

    return Response.json({ organizers: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin get organizers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### B — Create `services/passportr/app/api/admin/organizers/[userId]/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../../lib/db');

function verifyAdminSecret(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req, { params }) {
  try {
    verifyAdminSecret(req);
    const { userId } = params;

    const profileResult = await db.query(
      'SELECT * FROM organizer_profiles WHERE user_id = $1',
      [userId]
    );
    if (profileResult.rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const hopsResult = await db.query(
      `SELECT h.*, COUNT(v.id) as venue_count, COUNT(p.id) as participant_count
       FROM hops h
       LEFT JOIN venues v ON v.hop_id = h.id
       LEFT JOIN participants p ON p.hop_id = h.id
       WHERE h.organizer_user_id = $1
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [userId]
    );

    return Response.json({
      organizer: profileResult.rows[0],
      hops: hopsResult.rows,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin get organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    verifyAdminSecret(req);
    const { userId } = params;
    const { nonprofit_verified, nonprofit_pending, status, plan, tier } = await req.json();

    const result = await db.query(
      `UPDATE organizer_profiles
       SET nonprofit_verified = COALESCE($1, nonprofit_verified),
           nonprofit_pending = COALESCE($2, nonprofit_pending),
           status = COALESCE($3, status),
           plan = COALESCE($4, plan),
           tier = COALESCE($5, tier),
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING *`,
      [nonprofit_verified, nonprofit_pending, status, plan, tier, userId]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ organizer: result.rows[0] });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin update organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### C — Create `services/passportr/app/api/admin/stats/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');

function verifyAdminSecret(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${process.env.PASSPORTR_ADMIN_SECRET}`) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req) {
  try {
    verifyAdminSecret(req);

    const [organizers, hops, participants, stamps, redemptions] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM organizer_profiles WHERE status = $1', ['active']),
      db.query('SELECT COUNT(*) as count FROM hops'),
      db.query('SELECT COUNT(*) as count FROM participants'),
      db.query('SELECT COUNT(*) as count FROM stamps'),
      db.query('SELECT COUNT(*) as count FROM redemptions WHERE redeemed_at IS NOT NULL'),
    ]);

    const nonprofit = await db.query(
      'SELECT COUNT(*) as count FROM organizer_profiles WHERE nonprofit_pending = true AND nonprofit_verified = false'
    );

    return Response.json({
      active_organizers: parseInt(organizers.rows[0].count),
      total_hops: parseInt(hops.rows[0].count),
      total_participants: parseInt(participants.rows[0].count),
      total_stamps: parseInt(stamps.rows[0].count),
      total_redemptions: parseInt(redemptions.rows[0].count),
      pending_nonprofit_verifications: parseInt(nonprofit.rows[0].count),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Verification Checklist

- [ ] `api/admin/organizers/route.js` — GET returns all organizers with hop counts, secured by admin secret
- [ ] `api/admin/organizers/[userId]/route.js` — GET returns organizer detail + hops, PUT updates nonprofit_verified, status, plan, tier
- [ ] `api/admin/stats/route.js` — GET returns platform-wide counts including pending nonprofit verifications
- [ ] All three routes return 401 for missing or incorrect admin secret
- [ ] No other files modified
