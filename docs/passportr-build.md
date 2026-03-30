# Passportr — Build Prompt

## Ground Rules

- Read every file before touching it. No exceptions.
- No TODOs, no placeholders. Everything must work.
- No scope creep. Only change what is specified.
- Use `export const runtime = 'nodejs'` on all API routes that use pg.
- No TypeScript. No ORM. Use pg directly.
- Never hardcode URLs — use `process.env.NEXT_PUBLIC_BASE_URL`.
- Never call the auth service directly from the browser — proxy through `/api/auth/request`.
- JWT user ID field is `user.sub`.
- S3 uploads use presigned URLs — never upload through the server.

## Dependency Order

Tasks A, B, C, D can run in parallel.  
Task E depends on A (needs the venue CRUD routes).  
Task F depends on nothing but should read the existing manage hop page first.  
Run the SQL migration (Task C, Part 1) before deploying any code that references `venue_invitations`, `banner_url`, or `logo_url`.

---

## Task A — Bug Fixes (3 files)

### A1 — `services/passportr/app/stamp/[token]/page.jsx`

In the `auth_required` form's `onSubmit`, find the fetch that calls the auth service directly from the browser. Replace it with a call to the internal proxy with correct parameter names.

**Find:**
```js
const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'https://auth.terryheath.com'}/auth/request`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    redirect_url: `${window.location.origin}/stamp/${token}`
  })
});
```

**Replace with:**
```js
const response = await fetch('/api/auth/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    redirect_uri: `${window.location.origin}/stamp/${token}`,
    app_name: 'Passportr'
  })
});
```

---

### A2 — `services/passportr/app/[username]/[hopSlug]/page.jsx`

**Change 1:** After the `const isCompleted` and `const stampedCount` lines, add:

```js
function getCompletionText(rule, totalVenues) {
  if (rule.type === 'all') {
    return `Visit all ${totalVenues} venues and earn rewards at each one.`;
  }
  if (rule.type === 'percentage' || rule.type === 'minimum') {
    const required = rule.type === 'percentage'
      ? Math.ceil(totalVenues * (rule.percent / 100))
      : rule.count;
    return `Visit ${required} of ${totalVenues} venues to earn rewards at each visited.`;
  }
}
const completionRule = hop.completion_rule || { type: 'all' };
const completionText = getCompletionText(completionRule, venues.length);
```

**Change 2:** In the not-completed card at the bottom, replace the hardcoded text:

**Find:**
```jsx
<p style={{ color: 'var(--text-secondary)' }}>
  Visit all {venues.length} venues to complete the hop and unlock rewards.
</p>
```
**Replace with:**
```jsx
<p style={{ color: 'var(--text-secondary)' }}>
  {completionText}
</p>
```

**Change 3:** In the completed card's venue list, change `venues.map(...)` to filter to stamped venues only:

**Find:**
```jsx
{venues.map(venue => (
  venue.reward_description && (
```
**Replace with:**
```jsx
{venues.filter(venue => stampedVenueIds.includes(venue.id)).map(venue => (
  venue.reward_description && (
```

---

### A3 — `services/passportr/app/api/redeem/route.js`

**Change 1:** In the new-coupon INSERT, add `redeemed_at = NOW()`:

**Find:**
```js
const insertResult = await db.query(
  'INSERT INTO redemptions (participant_id, venue_id, coupon_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
  [participant.id, venue.id, couponCode, expiresAt]
);
redemption = insertResult.rows[0];
```
**Replace with:**
```js
const insertResult = await db.query(
  'INSERT INTO redemptions (participant_id, venue_id, coupon_code, expires_at, redeemed_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
  [participant.id, venue.id, couponCode, expiresAt]
);
redemption = insertResult.rows[0];
```

**Change 2:** Replace the existing `else` block (existing coupon found) with:

```js
} else {
  redemption = redemptionResult.rows[0];
  if (redemption.redeemed_at) {
    return Response.json({ error: 'Already redeemed' }, { status: 409 });
  }
  // Edge case: coupon exists but redeemed_at was never set — mark it now
  const updateResult = await db.query(
    'UPDATE redemptions SET redeemed_at = NOW() WHERE id = $1 RETURNING *',
    [redemption.id]
  );
  redemption = updateResult.rows[0];
}
```

---

## Task B — S3 Presigned URL API

### B1 — Create `services/passportr/app/api/upload/presign/route.js`

```js
export const runtime = 'nodejs';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getAuthUser } = require('../../../../lib/auth');
const { randomBytes } = require('crypto');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    const venueToken = req.headers.get('x-venue-token');
    if (!user && !venueToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_type, folder } = await req.json();

    if (!content_type || !content_type.startsWith('image/')) {
      return Response.json({ error: 'content_type must be an image' }, { status: 400 });
    }

    const ext = content_type.split('/')[1].replace('jpeg', 'jpg');
    const key = `${folder || 'uploads'}/${randomBytes(16).toString('hex')}.${ext}`;
    const bucket = process.env.AWS_S3_BUCKET || 'passportr-images';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: content_type,
    });

    const presigned_url = await getSignedUrl(s3, command, { expiresIn: 300 });
    const public_url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return Response.json({ presigned_url, public_url, key });
  } catch (error) {
    console.error('Presign error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### B2 — Dependencies

From `services/passportr/`, run:
```
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-ses
```

If these are already in `package.json`, skip.

---

## Task C — Venue CRUD API + Migration

### C1 — Create `services/passportr/migrations/002_venue_invitations.sql`

```sql
ALTER TABLE venues ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hops ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE hops ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE TABLE IF NOT EXISTS venue_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  token VARCHAR(40) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);
```

After creating this file, run it against the database using the existing `migrate.js` script or manually via `psql $DATABASE_URL -f migrations/002_venue_invitations.sql`.

---

### C2 — Add DELETE to `services/passportr/app/api/hops/[hopSlug]/route.js`

Read the file first. Append after the PUT export:

```js
export async function DELETE(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) {
      return Response.json({ error: 'Hop not found' }, { status: 404 });
    }

    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query('DELETE FROM hops WHERE id = $1', [hop.id]);
    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Delete hop error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### C3 — Create `services/passportr/app/api/hops/[hopSlug]/venues/[venueId]/route.js`

This is a new file. Venue edits can come from an organizer (authenticated via JWT cookie) OR from a venue self-service request (authenticated via `X-Venue-Token` header matching `stamp_token`). Both paths must work.

```js
export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');

async function verifyVenueAccess(req, hopSlug, venueId) {
  // Try organizer auth first
  try {
    const user = requireOrganizer(req);
    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return { error: 'Hop not found', status: 404 };
    if (hopResult.rows[0].organizer_user_id !== user.sub) return { error: 'Forbidden', status: 403 };

    const venueResult = await db.query(
      'SELECT * FROM venues WHERE id = $1 AND hop_id = $2',
      [venueId, hopResult.rows[0].id]
    );
    if (venueResult.rows.length === 0) return { error: 'Venue not found', status: 404 };
    return { venue: venueResult.rows[0] };
  } catch (e) {
    if (e.message !== 'Unauthorized' && e.message !== 'Forbidden') throw e;
  }

  // Fall back to venue self-service token
  const venueToken = req.headers.get('x-venue-token');
  if (!venueToken) return { error: 'Unauthorized', status: 401 };

  const venueResult = await db.query(
    'SELECT * FROM venues WHERE id = $1 AND stamp_token = $2',
    [venueId, venueToken]
  );
  if (venueResult.rows.length === 0) return { error: 'Forbidden', status: 403 };
  return { venue: venueResult.rows[0] };
}

export async function PUT(req, { params }) {
  try {
    const { hopSlug, venueId } = params;
    const access = await verifyVenueAccess(req, hopSlug, venueId);
    if (access.error) return Response.json({ error: access.error }, { status: access.status });

    const { name, address, description, reward_description, required, sort_order, logo_url } = await req.json();

    const result = await db.query(
      `UPDATE venues
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           description = COALESCE($3, description),
           reward_description = COALESCE($4, reward_description),
           required = COALESCE($5, required),
           sort_order = COALESCE($6, sort_order),
           logo_url = COALESCE($7, logo_url)
       WHERE id = $8
       RETURNING *`,
      [name, address, description, reward_description, required, sort_order, logo_url, venueId]
    );

    return Response.json({ venue: result.rows[0] });
  } catch (error) {
    console.error('Update venue error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { hopSlug, venueId } = params;
    const access = await verifyVenueAccess(req, hopSlug, venueId);
    if (access.error) return Response.json({ error: access.error }, { status: access.status });

    await db.query('DELETE FROM venues WHERE id = $1', [venueId]);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete venue error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Task D — Venue Invitation System

### D1 — Create `services/passportr/app/api/hops/[hopSlug]/invitations/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../../lib/db');
const { requireOrganizer } = require('../../../../../lib/auth');
const { randomBytes } = require('crypto');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function GET(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const result = await db.query(
      'SELECT * FROM venue_invitations WHERE hop_id = $1 ORDER BY invited_at DESC',
      [hop.id]
    );

    return Response.json({ invitations: result.rows });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Get invitations error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = requireOrganizer(req);
    const { hopSlug } = params;
    const { email, venue_name } = await req.json();

    if (!email || !venue_name) {
      return Response.json({ error: 'email and venue_name required' }, { status: 400 });
    }

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const token = randomBytes(20).toString('hex');

    await db.query(
      `INSERT INTO venue_invitations (hop_id, email, venue_name, token)
       VALUES ($1, $2, $3, $4)`,
      [hop.id, email, venue_name, token]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const setupUrl = `${baseUrl}/venue/setup/${token}`;

    await ses.send(new SendEmailCommand({
      Source: 'noreply@passportr.io',
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `You're invited to join ${hop.name} on Passportr` },
        Body: {
          Text: {
            Data: `Hi,\n\nYou've been invited to participate in "${hop.name}" on Passportr as a venue.\n\nVenue name: ${venue_name}\n\nClick the link below to set up your venue:\n${setupUrl}\n\nThis link is unique to your venue — don't share it.\n\nPassportr`
          }
        }
      }
    }));

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Invitation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### D2 — Create `services/passportr/app/api/venue/setup/[token]/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../../lib/db');

export async function GET(req, { params }) {
  try {
    const { token } = params;
    const result = await db.query(
      `SELECT vi.*, h.name as hop_name
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       WHERE vi.token = $1 AND vi.status = 'pending'`,
      [token]
    );
    if (result.rows.length === 0) return Response.json({ error: 'Invalid' }, { status: 404 });
    return Response.json({ invitation: result.rows[0] });
  } catch (error) {
    console.error('Setup GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### D3 — Create `services/passportr/app/api/venue/setup/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { generateToken } = require('../../../../lib/tokens');

export async function POST(req) {
  try {
    const { token, name, address, description, reward_description } = await req.json();

    if (!token || !name) return Response.json({ error: 'token and name required' }, { status: 400 });

    const invResult = await db.query(
      `SELECT vi.*, h.id as hop_id
       FROM venue_invitations vi
       JOIN hops h ON h.id = vi.hop_id
       WHERE vi.token = $1 AND vi.status = 'pending'`,
      [token]
    );
    if (invResult.rows.length === 0) return Response.json({ error: 'Invalid or already used' }, { status: 400 });

    const invitation = invResult.rows[0];
    const stampToken = generateToken();
    const redeemToken = generateToken();

    const countResult = await db.query(
      'SELECT COUNT(*) as c FROM venues WHERE hop_id = $1',
      [invitation.hop_id]
    );
    const sortOrder = parseInt(countResult.rows[0].c);

    await db.query(
      `INSERT INTO venues (hop_id, name, address, description, reward_description, stamp_token, redeem_token, required, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)`,
      [invitation.hop_id, name, address, description, reward_description, stampToken, redeemToken, sortOrder]
    );

    await db.query(
      `UPDATE venue_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    return Response.json({ stamp_token: stampToken });
  } catch (error) {
    console.error('Venue setup POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### D4 — Create `services/passportr/app/venue/setup/[token]/page.jsx`

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VenueSetupPage({ params }) {
  const { token } = params;
  const router = useRouter();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', description: '', reward_description: '' });

  useEffect(() => {
    async function loadInvitation() {
      try {
        const res = await fetch(`/api/venue/setup/${token}`);
        if (!res.ok) { setInvalid(true); setLoading(false); return; }
        const data = await res.json();
        setInvitation(data.invitation);
        setForm(f => ({ ...f, name: data.invitation.venue_name }));
      } catch {
        setInvalid(true);
      }
      setLoading(false);
    }
    loadInvitation();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/venue/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create venue'); setSubmitting(false); return; }
      router.push(`/venue/${data.stamp_token}`);
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (invalid) return (
    <div className="container" style={{ paddingTop: '80px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Invalid or expired invitation</h1>
      <p style={{ color: 'var(--text-secondary)' }}>This setup link is not valid.</p>
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '60px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Set Up Your Venue</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        You've been invited to join <strong>{invitation.hop_name}</strong>. Fill in your venue details below.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Venue Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
            <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
            <input
              type="text"
              value={form.reward_description}
              onChange={e => setForm({ ...form, reward_description: e.target.value })}
              placeholder="e.g., 10% off your purchase"
            />
          </div>
          {error && <p style={{ color: 'red', marginBottom: '12px' }}>{error}</p>}
          <button type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating...' : 'Create My Venue'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Task E — Venue Self-Service Page Rewrite

**Depends on Task C (venue PUT route must exist).**

### E1 — Create `services/passportr/app/api/venue-self-service/[token]/route.js`

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const QRCode = require('qrcode');

export async function GET(req, { params }) {
  try {
    const { token } = params;

    const venueResult = await db.query(
      'SELECT * FROM venues WHERE stamp_token = $1',
      [token]
    );
    if (venueResult.rows.length === 0) {
      return Response.json({ error: 'Venue not found' }, { status: 404 });
    }

    const venue = venueResult.rows[0];
    const hopResult = await db.query('SELECT * FROM hops WHERE id = $1', [venue.hop_id]);
    const hop = hopResult.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const redemptionResult = await db.query(
      `SELECT COUNT(*) as count FROM redemptions
       WHERE venue_id = $1 AND DATE(generated_at) = $2 AND redeemed_at IS NOT NULL`,
      [venue.id, today]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    const stampQR = await QRCode.toDataURL(`${baseUrl}/stamp/${venue.stamp_token}`, { width: 300, margin: 2 });
    const redeemQR = await QRCode.toDataURL(`${baseUrl}/redeem/${venue.redeem_token}`, { width: 300, margin: 2 });

    return Response.json({
      venue,
      hop,
      redemption_count: parseInt(redemptionResult.rows[0].count),
      stamp_qr: stampQR,
      redeem_qr: redeemQR,
    });
  } catch (error) {
    console.error('Venue self-service GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### E2 — Replace `services/passportr/app/venue/[token]/page.jsx`

Read the existing file first. Replace entirely with:

```jsx
'use client';

import { useEffect, useState, useRef } from 'react';

export default function VenuePage({ params }) {
  const { token } = params;
  const [venue, setVenue] = useState(null);
  const [hop, setHop] = useState(null);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [stampQR, setStampQR] = useState(null);
  const [redeemQR, setRedeemQR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    loadVenue();
  }, [token]);

  async function loadVenue() {
    try {
      const res = await fetch(`/api/venue-self-service/${token}`);
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      const data = await res.json();
      setVenue(data.venue);
      setHop(data.hop);
      setRedemptionCount(data.redemption_count);
      setStampQR(data.stamp_qr);
      setRedeemQR(data.redeem_qr);
      setForm({
        name: data.venue.name,
        address: data.venue.address || '',
        description: data.venue.description || '',
        reward_description: data.venue.reward_description || '',
      });
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  async function saveVenue(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/hops/${hop.slug}/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error || 'Failed to save');
      } else {
        const d = await res.json();
        setVenue(d.venue);
        setEditing(false);
      }
    } catch {
      setSaveError('Network error');
    }
    setSaving(false);
  }

  async function uploadLogo(file) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify({ content_type: file.type, folder: 'venue-logos' }),
      });
      const { presigned_url, public_url } = await presignRes.json();

      await fetch(presigned_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const updateRes = await fetch(`/api/hops/${hop.slug}/venues/${venue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Venue-Token': token,
        },
        body: JSON.stringify({ logo_url: public_url }),
      });
      if (updateRes.ok) {
        const d = await updateRes.json();
        setVenue(d.venue);
      }
    } catch {
      alert('Logo upload failed');
    }
    setUploadingLogo(false);
  }

  function downloadQR(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (notFound) return <div className="container" style={{ paddingTop: '80px' }}><h1>Venue not found</h1></div>;

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{venue.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{hop.name}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Today's redemptions: <strong>{redemptionCount}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt="Venue logo"
              style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              ref={logoInputRef}
              style={{ display: 'none' }}
              onChange={e => uploadLogo(e.target.files[0])}
            />
            <button
              onClick={() => logoInputRef.current.click()}
              disabled={uploadingLogo}
              style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
            >
              {uploadingLogo ? 'Uploading...' : venue.logo_url ? 'Change Logo' : 'Upload Logo'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>Stamp QR Code</h2>
          {stampQR && <img src={stampQR} alt="Stamp QR" style={{ width: '100%', maxWidth: '250px' }} />}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', fontFamily: 'monospace' }}>
            {venue.stamp_token}
          </p>
          <button
            onClick={() => downloadQR(stampQR, `stamp-${venue.stamp_token}.png`)}
            style={{ marginTop: '12px', fontSize: '14px', padding: '8px 16px' }}
          >
            Download
          </button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--accent-teal)' }}>Redeem QR Code</h2>
          {redeemQR && <img src={redeemQR} alt="Redeem QR" style={{ width: '100%', maxWidth: '250px' }} />}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', fontFamily: 'monospace' }}>
            {venue.redeem_token}
          </p>
          <button
            onClick={() => downloadQR(redeemQR, `redeem-${venue.redeem_token}.png`)}
            style={{ marginTop: '12px', fontSize: '14px', padding: '8px 16px' }}
          >
            Download
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>Venue Details</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ fontSize: '14px', padding: '8px 16px' }}>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveVenue}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
              <input
                type="text"
                value={form.reward_description}
                onChange={e => setForm({ ...form, reward_description: e.target.value })}
              />
            </div>
            {saveError && <p style={{ color: 'red', marginBottom: '12px' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{ backgroundColor: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            {venue.address && <div><strong>Address:</strong> {venue.address}</div>}
            {venue.description && <div><strong>Description:</strong> {venue.description}</div>}
            {venue.reward_description && <div><strong>Reward:</strong> {venue.reward_description}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task F — Hop Landing Page: Google Map

Read `services/passportr/app/hop/[hopSlug]/page.jsx` before writing.

### F1 — Add map data generation

After `const completionText = getCompletionText(completionRule, venues.length);`, add:

```js
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
const venuesWithAddresses = venues.filter(v => v.address);
let mapUrl = null;
if (apiKey && venuesWithAddresses.length > 0) {
  const markers = venuesWithAddresses
    .map(v => `markers=color:0x2AB8A0|label:${venues.indexOf(v) + 1}|${encodeURIComponent(v.address)}`)
    .join('&');
  mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=700x350&${markers}&key=${apiKey}`;
}
```

### F2 — Add map to JSX

Between the "Join the Hop" card and the `<h2>Participating Venues</h2>` heading, add:

```jsx
{mapUrl && (
  <div style={{ marginBottom: '32px', borderRadius: '12px', overflow: 'hidden' }}>
    <img
      src={mapUrl}
      alt="Venue locations map"
      style={{ width: '100%', display: 'block' }}
    />
  </div>
)}
```

---

## Task G — Manage Hop Page Rewrite

**Read `services/passportr/app/organize/[hopSlug]/page.jsx` before writing.**

Replace the file entirely with:

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManageHop({ params }) {
  const { hopSlug } = params;
  const router = useRouter();
  const [hop, setHop] = useState(null);
  const [venues, setVenues] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editingHop, setEditingHop] = useState(false);
  const [hopForm, setHopForm] = useState({});
  const [savingHop, setSavingHop] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', venue_name: '' });
  const [inviting, setInviting] = useState(false);
  const [showDeleteHop, setShowDeleteHop] = useState(false);

  useEffect(() => {
    loadAll();
  }, [hopSlug]);

  async function loadAll() {
    try {
      const [hopRes, venuesRes] = await Promise.all([
        fetch(`/api/hops/${hopSlug}`, { credentials: 'include' }),
        fetch(`/api/hops/${hopSlug}/venues`, { credentials: 'include' }),
      ]);

      if (hopRes.status === 403) { setAccessDenied(true); setLoading(false); return; }
      if (hopRes.status === 401) { router.push('/organize/login'); return; }

      if (hopRes.ok) {
        const d = await hopRes.json();
        setHop(d.hop);
        setHopForm({
          name: d.hop.name,
          description: d.hop.description || '',
          start_date: d.hop.start_date?.split('T')[0],
          end_date: d.hop.end_date?.split('T')[0],
          stamp_cutoff_date: d.hop.stamp_cutoff_date?.split('T')[0],
          redeem_cutoff_date: d.hop.redeem_cutoff_date?.split('T')[0],
          coupon_expiry_minutes: d.hop.coupon_expiry_minutes,
          status: d.hop.status,
        });
      }
      if (venuesRes.ok) {
        const d = await venuesRes.json();
        setVenues(d.venues);
      }

      const invRes = await fetch(`/api/hops/${hopSlug}/invitations`, { credentials: 'include' });
      if (invRes.ok) {
        const d = await invRes.json();
        setInvitations(d.invitations);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  async function saveHop(e) {
    e.preventDefault();
    setSavingHop(true);
    try {
      const res = await fetch(`/api/hops/${hopSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(hopForm),
      });
      if (res.ok) {
        const d = await res.json();
        setHop(d.hop);
        setEditingHop(false);
        if (d.hop.slug !== hopSlug) router.push(`/organize/${d.hop.slug}`);
      } else {
        alert('Failed to save hop');
      }
    } catch { alert('Network error'); }
    setSavingHop(false);
  }

  async function deleteHop() {
    try {
      const res = await fetch(`/api/hops/${hopSlug}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) router.push('/organize');
      else alert('Failed to delete hop');
    } catch { alert('Network error'); }
  }

  async function addVenue(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fd.get('name'),
          address: fd.get('address'),
          description: fd.get('description'),
          reward_description: fd.get('reward_description'),
          required: fd.get('required') === 'on',
          sort_order: venues.length,
        }),
      });
      if (res.ok) { setShowAddVenue(false); e.target.reset(); loadAll(); }
      else alert('Failed to add venue');
    } catch { alert('Network error'); }
  }

  async function saveVenue(e) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues/${editingVenue}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(venueForm),
      });
      if (res.ok) { setEditingVenue(null); loadAll(); }
      else alert('Failed to save venue');
    } catch { alert('Network error'); }
  }

  async function deleteVenue(venueId) {
    if (!confirm('Delete this venue? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/hops/${hopSlug}/venues/${venueId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) loadAll();
      else alert('Failed to delete venue');
    } catch { alert('Network error'); }
  }

  async function sendInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      const res = await fetch(`/api/hops/${hopSlug}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({ email: '', venue_name: '' });
        loadAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to send invitation');
      }
    } catch { alert('Network error'); }
    setInviting(false);
  }

  if (loading) return <div className="container" style={{ paddingTop: '80px' }}><p>Loading...</p></div>;
  if (accessDenied) return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Organizer Access Required</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Contact support if you believe you should have access.</p>
      </div>
    </div>
  );
  if (!hop) return <div className="container" style={{ paddingTop: '80px' }}><h1>Hop not found</h1></div>;

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <a href="/organize" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>← Back to dashboard</a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>{hop.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {new Date(hop.start_date).toLocaleDateString()} – {new Date(hop.end_date).toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setEditingHop(!editingHop)} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {editingHop ? 'Cancel' : 'Edit Hop'}
          </button>
          <button
            onClick={() => setShowDeleteHop(true)}
            style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: '#e55' }}
          >
            Delete Hop
          </button>
        </div>
      </div>

      {showDeleteHop && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid #e55' }}>
          <h3 style={{ marginBottom: '12px', color: '#e55' }}>Delete "{hop.name}"?</h3>
          <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
            This will permanently delete the hop, all venues, participants, stamps, and redemptions. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={deleteHop} style={{ backgroundColor: '#e55' }}>Yes, Delete Everything</button>
            <button onClick={() => setShowDeleteHop(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )}

      {editingHop && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Edit Hop</h2>
          <form onSubmit={saveHop}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
              <input type="text" value={hopForm.name} onChange={e => setHopForm({ ...hopForm, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea rows="3" value={hopForm.description} onChange={e => setHopForm({ ...hopForm, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Start Date</label>
                <input type="date" value={hopForm.start_date} onChange={e => setHopForm({ ...hopForm, start_date: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>End Date</label>
                <input type="date" value={hopForm.end_date} onChange={e => setHopForm({ ...hopForm, end_date: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Stamp Cutoff</label>
                <input type="date" value={hopForm.stamp_cutoff_date} onChange={e => setHopForm({ ...hopForm, stamp_cutoff_date: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Redeem Cutoff</label>
                <input type="date" value={hopForm.redeem_cutoff_date} onChange={e => setHopForm({ ...hopForm, redeem_cutoff_date: e.target.value })} required />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Coupon Expiry (minutes)</label>
                <input
                  type="number"
                  value={hopForm.coupon_expiry_minutes}
                  onChange={e => setHopForm({ ...hopForm, coupon_expiry_minutes: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                <select value={hopForm.status} onChange={e => setHopForm({ ...hopForm, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={savingHop}>{savingHop ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditingHop(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {!editingHop && (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
            <div><strong>Status:</strong> {hop.status}</div>
            <div><strong>Public URL:</strong> <a href={`/hop/${hop.slug}`} target="_blank">/hop/{hop.slug}</a></div>
            <div><strong>Stamp Cutoff:</strong> {new Date(hop.stamp_cutoff_date).toLocaleDateString()}</div>
            <div><strong>Redeem Cutoff:</strong> {new Date(hop.redeem_cutoff_date).toLocaleDateString()}</div>
            <div><strong>Coupon Expiry:</strong> {hop.coupon_expiry_minutes} minutes</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px' }}>Venues ({venues.length})</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
          >
            Invite Venue
          </button>
          <button onClick={() => setShowAddVenue(!showAddVenue)} style={{ fontSize: '14px', padding: '8px 16px' }}>
            {showAddVenue ? 'Cancel' : 'Add Venue'}
          </button>
        </div>
      </div>

      {showInviteModal && (
        <div className="card" style={{ marginBottom: '24px', border: '2px solid var(--accent-teal)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Invite a Venue</h3>
          <form onSubmit={sendInvite}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Venue Name</label>
              <input type="text" value={inviteForm.venue_name} onChange={e => setInviteForm({ ...inviteForm, venue_name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Email Address</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" disabled={inviting}>{inviting ? 'Sending...' : 'Send Invitation'}</button>
              <button type="button" onClick={() => setShowInviteModal(false)} style={{ backgroundColor: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Invitations</h3>
          {invitations.map(inv => (
            <div
              key={inv.id}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #eee' }}
            >
              <span><strong>{inv.venue_name}</strong> — {inv.email}</span>
              <span style={{
                padding: '2px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                backgroundColor: inv.status === 'accepted' ? '#E8F7F4' : '#fff3cd',
                color: inv.status === 'accepted' ? 'var(--accent-teal)' : '#856404',
              }}>
                {inv.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showAddVenue && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Add Venue</h3>
          <form onSubmit={addVenue}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Venue Name</label>
              <input type="text" name="name" required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
              <input type="text" name="address" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
              <textarea name="description" rows="2" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
              <input type="text" name="reward_description" placeholder="e.g., Free appetizer" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="required" defaultChecked />
                <span style={{ fontSize: '14px' }}>Required venue</span>
              </label>
            </div>
            <button type="submit">Add Venue</button>
          </form>
        </div>
      )}

      {venues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No venues yet. Add one above or invite a venue by email.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {venues.map(venue => (
            <div key={venue.id} className="card">
              {editingVenue === venue.id ? (
                <form onSubmit={saveVenue}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Name</label>
                    <input type="text" value={venueForm.name} onChange={e => setVenueForm({ ...venueForm, name: e.target.value })} required />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Address</label>
                    <input type="text" value={venueForm.address || ''} onChange={e => setVenueForm({ ...venueForm, address: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Description</label>
                    <textarea rows="2" value={venueForm.description || ''} onChange={e => setVenueForm({ ...venueForm, description: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Reward Description</label>
                    <input type="text" value={venueForm.reward_description || ''} onChange={e => setVenueForm({ ...venueForm, reward_description: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="submit" style={{ fontSize: '14px', padding: '8px 16px' }}>Save</button>
                    <button
                      type="button"
                      onClick={() => setEditingVenue(null)}
                      style={{ fontSize: '14px', padding: '8px 16px', backgroundColor: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{venue.name}</h3>
                    {venue.address && (
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{venue.address}</p>
                    )}
                    {venue.reward_description && (
                      <p style={{ fontSize: '14px', marginBottom: '4px' }}><strong>Reward:</strong> {venue.reward_description}</p>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      <a href={`/venue/${venue.stamp_token}`} target="_blank" style={{ marginRight: '16px' }}>
                        View Venue Page ↗
                      </a>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingVenue(venue.id);
                        setVenueForm({
                          name: venue.name,
                          address: venue.address,
                          description: venue.description,
                          reward_description: venue.reward_description,
                        });
                      }}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteVenue(venue.id)}
                      style={{ fontSize: '13px', padding: '6px 12px', backgroundColor: '#e55' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Verification Checklist

After all tasks complete, confirm:

- [ ] `migrations/002_venue_invitations.sql` exists and has been run against the database
- [ ] `npm install` completed without errors for `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/client-ses`
- [ ] New files created: `api/upload/presign/route.js`, `api/hops/[hopSlug]/venues/[venueId]/route.js`, `api/hops/[hopSlug]/invitations/route.js`, `api/venue-self-service/[token]/route.js`, `api/venue/setup/[token]/route.js`, `api/venue/setup/route.js`, `venue/setup/[token]/page.jsx`
- [ ] Modified files saved: `stamp/[token]/page.jsx`, `[username]/[hopSlug]/page.jsx`, `api/redeem/route.js`, `api/hops/[hopSlug]/route.js`, `hop/[hopSlug]/page.jsx`, `organize/[hopSlug]/page.jsx`, `venue/[token]/page.jsx`
- [ ] No files modified outside this list
