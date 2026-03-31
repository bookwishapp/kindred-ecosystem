# Passportr — Participant Profile Page + Find My Passport

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Tasks A, B, and C can run in parallel.

---

## Task A — Participant Profile Page

Read `services/passportr/app/[userId]/page.jsx` if it exists. If it does not exist, create it.

Create or replace `services/passportr/app/[userId]/page.jsx` with:

```jsx
export const runtime = 'nodejs';

import { cookies } = from 'next/headers';
const jwt = require('jsonwebtoken');
const db = require('../../lib/db');

export default async function ParticipantProfile({ params }) {
  const { userId } = params;

  // Verify cookie matches this userId
  const cookieStore = cookies();
  const token = cookieStore.get('passportr_token')?.value;

  let authenticatedUserId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      authenticatedUserId = decoded.sub;
    } catch {
      // invalid token
    }
  }

  const isOwner = authenticatedUserId === userId;

  if (!isOwner) {
    return (
      <div className="container" style={{ paddingTop: '80px', maxWidth: '500px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Your Passports</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Sign in to view your hop passports.
          </p>
          <SignInForm userId={userId} />
        </div>
      </div>
    );
  }

  // Fetch all participant records for this user
  const result = await db.query(
    `SELECT
      p.*,
      h.name as hop_name,
      h.slug as hop_slug,
      h.start_date,
      h.end_date,
      h.stamp_cutoff_date,
      h.redeem_cutoff_date,
      h.status as hop_status,
      h.banner_url,
      h.logo_url,
      (SELECT COUNT(*) FROM stamps WHERE participant_id = p.id) as stamp_count,
      (SELECT COUNT(*) FROM venues WHERE hop_id = h.id) as venue_count,
      (SELECT COUNT(*) FROM redemptions WHERE participant_id = p.id AND redeemed_at IS NOT NULL) as redemption_count
     FROM participants p
     JOIN hops h ON h.id = p.hop_id
     WHERE p.user_id = $1
     ORDER BY
       CASE WHEN h.redeem_cutoff_date >= CURRENT_DATE THEN 0 ELSE 1 END,
       h.start_date DESC`,
    [userId]
  );

  const participations = result.rows;

  if (participations.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '80px', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>No passports yet</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Scan a QR code at a participating venue to get started.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Your Passports</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {participations.length} hop{participations.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        {participations.map(p => {
          const isActive = p.stamp_cutoff_date >= today && p.hop_status === 'active';
          const isRedeemable = p.redeem_cutoff_date >= today && p.completed_at;
          const isPast = p.redeem_cutoff_date < today;

          return (
            <a
              key={p.id}
              href={`/${userId}/${p.hop_slug}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                cursor: 'pointer',
                opacity: isPast ? 0.7 : 1,
                borderLeft: isActive ? '4px solid var(--accent-teal)' : isPast ? '4px solid #ddd' : '4px solid #f0c040'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {p.logo_url && (
                    <img
                      src={p.logo_url}
                      alt={p.hop_name}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '18px' }}>{p.hop_name}</h2>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? '#E8F7F4' : isRedeemable ? '#fff3cd' : '#f5f5f5',
                        color: isActive ? 'var(--accent-teal)' : isRedeemable ? '#856404' : '#999',
                        fontWeight: '500',
                        flexShrink: 0,
                        marginLeft: '8px'
                      }}>
                        {isActive ? 'Stamping' : isRedeemable ? 'Redeem Rewards' : 'Ended'}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                    </p>

                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      <span style={{ color: p.stamp_count > 0 ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                        {p.stamp_count} of {p.venue_count} stamped
                      </span>
                      {p.completed_at && (
                        <span style={{ color: 'var(--accent-teal)', fontWeight: '500' }}>
                          ✓ Completed
                        </span>
                      )}
                      {p.redemption_count > 0 && (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {p.redemption_count} redeemed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
```

Note: `SignInForm` is referenced above but defined in Task B below. It must be in a separate client component file since this page is a server component.

---

## Task B — Sign In Form Client Component

Create `services/passportr/app/[userId]/SignInForm.jsx`:

```jsx
'use client';

import { useState } from 'react';

export default function SignInForm({ userId }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const returnTo = `/${userId}`;
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_uri: `${window.location.origin}/api/auth/callback?return_to=${encodeURIComponent(returnTo)}`,
          app_name: 'Passportr',
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Failed to send link. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <p style={{ color: 'var(--accent-teal)', fontWeight: '500' }}>
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        style={{ marginBottom: '12px', width: '100%' }}
      />
      {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
      <button type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'Sending...' : 'Send Sign-In Link'}
      </button>
    </form>
  );
}
```

Update the import in `app/[userId]/page.jsx` to use this component:

```js
import SignInForm from './SignInForm';
```

---

## Task C — Find My Passport on Hop Landing Page

Read `services/passportr/app/hop/[hopSlug]/page.jsx`.

**Change 1:** Add cookie-based auto-redirect at the top of the component, before the hop query. If the user already has a valid cookie and has a participant record for this hop, redirect them directly to their passport:

Add after the existing imports/runtime declaration and before the hop query:

```js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const jwt = require('jsonwebtoken');
```

Add this block as the first thing inside the component function, before the hop query:

```js
// If user has a valid cookie and is already a participant, redirect to their passport
const cookieStore = cookies();
const authToken = cookieStore.get('passportr_token')?.value;
if (authToken) {
  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const existingParticipant = await db.query(
      `SELECT p.user_id FROM participants p
       JOIN hops h ON h.id = p.hop_id
       WHERE h.slug = $1 AND p.user_id = $2`,
      [hopSlug, decoded.sub]
    );
    if (existingParticipant.rows.length > 0) {
      redirect(`/${decoded.sub}/${hopSlug}`);
    }
  } catch {
    // invalid token, continue rendering normally
  }
}
```

**Change 2:** Add "Find My Passport" section to the JSX. Add this block after the "Join the Hop" card and before the map:

```jsx
<FindMyPassportForm hopSlug={hopSlug} />
```

**Change 3:** Create `services/passportr/app/hop/[hopSlug]/FindMyPassportForm.jsx`:

```jsx
'use client';

import { useState } from 'react';

export default function FindMyPassportForm({ hopSlug }) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const returnTo = `/hop/${hopSlug}/passport`;
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_uri: `${window.location.origin}/api/auth/callback?return_to=${encodeURIComponent(returnTo)}`,
          app_name: 'Passportr',
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError('Failed to send link. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ color: 'var(--accent-teal)', fontWeight: '500' }}>
          Check your email for a link to your passport.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
      {!show ? (
        <button
          onClick={() => setShow(true)}
          style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', padding: '0', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Already participating? Find your passport →
        </button>
      ) : (
        <div className="card" style={{ maxWidth: '400px', margin: '0 auto', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Find Your Passport</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Enter the email you used when you first stamped your passport.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ marginBottom: '12px', width: '100%' }}
            />
            {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Sending...' : 'Send Link'}
              </button>
              <button
                type="button"
                onClick={() => setShow(false)}
                style={{ backgroundColor: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

---

## Task D — Passport Redirect Route

Create `services/passportr/app/hop/[hopSlug]/passport/route.js`:

```js
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const jwt = require('jsonwebtoken');
const db = require('../../../../lib/db');

export async function GET(req, { params }) {
  const { hopSlug } = params;

  const cookieStore = cookies();
  const token = cookieStore.get('passportr_token')?.value;

  if (!token) {
    return redirect(`/hop/${hopSlug}`);
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.sub;
  } catch {
    return redirect(`/hop/${hopSlug}`);
  }

  // Look up participant record for this user + hop
  const result = await db.query(
    `SELECT p.user_id FROM participants p
     JOIN hops h ON h.id = p.hop_id
     WHERE h.slug = $1 AND p.user_id = $2`,
    [hopSlug, userId]
  );

  if (result.rows.length === 0) {
    // Authenticated but not a participant in this hop
    return redirect(`/hop/${hopSlug}?not_found=1`);
  }

  return redirect(`/${userId}/${hopSlug}`);
}
```

---

## Verification Checklist

- [ ] `app/[userId]/page.jsx` — server component, verifies cookie matches userId, shows all hops with stamp/completion/redemption counts, active hops first
- [ ] `app/[userId]/SignInForm.jsx` — client component, sends magic link with `return_to=/{userId}`
- [ ] `app/hop/[hopSlug]/page.jsx` — auto-redirects to passport if valid cookie + participant record exists
- [ ] `app/hop/[hopSlug]/FindMyPassportForm.jsx` — client component, quiet underline link expands to email form
- [ ] `app/hop/[hopSlug]/passport/route.js` — reads cookie after auth callback, looks up participant, redirects to passport or back to hop landing if not found
- [ ] No other files modified
