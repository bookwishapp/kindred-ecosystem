# Admin Restructure + Passportr Opt-In

## Context

Read `docs/ARCHITECTURE.md` and `docs/CLAUDE.md` before starting. This prompt touches two services: `services/web` (terryheath.com) and `services/passportr`. Both must be deployed together once complete.

## Ground Rules

- Read every file before touching it
- No scope creep — only change what is specified
- Verify after changes before declaring done
- No other files modified outside this list

## Dependency Order

```
Tasks A, E run first (independently, can be parallel)
Tasks B, C, D depend on A
Tasks F, G depend on E
Task H depends on G
Task I depends on B, D, H
```

---

## Task A — terryheath.com: Restructure admin layout and nav

Read `services/web/app/admin/layout.jsx`.

Replace entirely with:

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return children;
  }

  const isActive = (path) => pathname.startsWith(path);

  return (
    <>
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin</h1>
          <nav className="admin-nav">
            <Link href="/admin/overview" className={isActive('/admin/overview') ? 'active' : ''}>
              Overview
            </Link>
            <Link href="/admin/small-things/posts" className={isActive('/admin/small-things') ? 'active' : ''}>
              Small Things
            </Link>
            <Link href="/admin/passportr/organizers" className={isActive('/admin/passportr') ? 'active' : ''}>
              Passportr
            </Link>
            <Link href="/admin/kindred" className={isActive('/admin/kindred') ? 'active' : ''}>
              Kindred
            </Link>
            <form action="/api/admin/logout" method="POST" style={{ display: 'inline' }}>
              <button type="submit" className="logout-btn">Logout</button>
            </form>
          </nav>
        </div>
      </div>
      <div className="container-wide">{children}</div>
    </>
  );
}
```

Update `services/web/app/admin/page.jsx` — change redirect from `/admin/posts` to `/admin/overview`:

```jsx
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function AdminPage() {
  redirect('/admin/overview');
}
```

---

## Task B — terryheath.com: Move Small Things pages

Read all files in `services/web/app/admin/posts/`, `services/web/app/admin/subscribers/`, and `services/web/app/admin/sends/` before starting.

**B1:** Create `services/web/app/admin/small-things/layout.jsx` — sub-nav for Small Things section:

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SmallThingsLayout({ children }) {
  const pathname = usePathname();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <div>
      <div style={{ borderBottom: '1px solid #eee', marginBottom: '32px', paddingBottom: '0' }}>
        <nav style={{ display: 'flex', gap: '0' }}>
          {[
            { href: '/admin/small-things/posts', label: 'Posts' },
            { href: '/admin/small-things/subscribers', label: 'Subscribers' },
            { href: '/admin/small-things/sends', label: 'Sends' },
          ].map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                borderBottom: isActive(tab.href) ? '2px solid #1A1A1A' : '2px solid transparent',
                color: isActive(tab.href) ? '#1A1A1A' : '#666',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
```

**B2:** Create `services/web/app/admin/small-things/posts/page.jsx` — copy the content of `services/web/app/admin/posts/page.jsx` exactly. Update any internal links that reference `/admin/posts/` to reference `/admin/small-things/posts/`.

**B3:** Copy all sub-routes of posts (new, [id]/edit, etc.) into `services/web/app/admin/small-things/posts/`. Read the full directory structure of `services/web/app/admin/posts/` first and replicate it exactly under `small-things/posts/`, updating any internal links.

**B4:** Create `services/web/app/admin/small-things/subscribers/page.jsx` — copy content of `services/web/app/admin/subscribers/page.jsx` with two changes:
- Remove the delete button and its associated server action entirely
- The table is read-only — no actions column needed. Remove the Actions `<th>` and `<td>` from the table.

**B5:** Create `services/web/app/admin/small-things/sends/page.jsx` — copy content of `services/web/app/admin/sends/page.jsx` exactly.

**B6:** Create redirect stubs at the old paths so any bookmarks still work:

`services/web/app/admin/posts/page.jsx`:
```jsx
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldPostsRedirect() { redirect('/admin/small-things/posts'); }
```

`services/web/app/admin/subscribers/page.jsx`:
```jsx
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldSubscribersRedirect() { redirect('/admin/small-things/subscribers'); }
```

`services/web/app/admin/sends/page.jsx`:
```jsx
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function OldSendsRedirect() { redirect('/admin/small-things/sends'); }
```

**B7:** Delete `services/web/app/admin/suppressions/` directory entirely — remove the page and any route files.

---

## Task C — terryheath.com: Overview page

Read `services/web/lib/db.js` to confirm the db import pattern.

Create `services/web/app/admin/overview/page.jsx`:

```jsx
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import db from '../../../lib/db';

async function getSmallThingsStats() {
  const [subscribers, sends, posts] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active FROM subscribers`),
    db.query(`SELECT COUNT(*) as total, MAX(completed_at) as last_send FROM newsletter_sends`),
    db.query(`SELECT COUNT(*) as total FROM posts WHERE status = 'published' AND is_page = false`),
  ]);
  return {
    total_subscribers: parseInt(subscribers.rows[0].total),
    active_subscribers: parseInt(subscribers.rows[0].active),
    total_sends: parseInt(sends.rows[0].total),
    last_send: sends.rows[0].last_send,
    published_posts: parseInt(posts.rows[0].total),
  };
}

async function getPassportrStats() {
  try {
    const res = await fetch(
      `${process.env.PASSPORTR_BASE_URL}/api/admin/stats`,
      { headers: { 'x-admin-secret': process.env.PASSPORTR_ADMIN_SECRET }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function OverviewPage() {
  const [smallThings, passportr] = await Promise.all([
    getSmallThingsStats(),
    getPassportrStats(),
  ]);

  const sections = [
    {
      title: 'Small Things',
      href: '/admin/small-things/posts',
      stats: smallThings ? [
        { label: 'Active Subscribers', value: smallThings.active_subscribers },
        { label: 'Total Sends', value: smallThings.total_sends },
        { label: 'Published Posts', value: smallThings.published_posts },
        { label: 'Last Send', value: smallThings.last_send ? new Date(smallThings.last_send).toLocaleDateString() : 'Never' },
      ] : null,
    },
    {
      title: 'Passportr',
      href: '/admin/passportr/organizers',
      alert: passportr?.pending_nonprofit_verifications > 0
        ? `${passportr.pending_nonprofit_verifications} nonprofit verification${passportr.pending_nonprofit_verifications > 1 ? 's' : ''} pending`
        : null,
      stats: passportr ? [
        { label: 'Active Organizers', value: passportr.active_organizers },
        { label: 'Total Hops', value: passportr.total_hops },
        { label: 'Participants', value: passportr.total_participants },
        { label: 'Opt-Ins', value: passportr.total_optins ?? '—' },
      ] : null,
    },
    {
      title: 'Kindred',
      href: '/admin/kindred',
      stats: null,
      placeholder: 'Coming soon',
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '40px' }}>Ecosystem Overview</h1>

      <div style={{ display: 'grid', gap: '24px' }}>
        {sections.map(section => (
          <div
            key={section.title}
            style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: section.alert ? '2px solid #f59e0b' : '1px solid #eee',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <a href={section.href} style={{ fontSize: '18px', fontWeight: '600', textDecoration: 'none', color: '#1A1A1A' }}>
                {section.title} →
              </a>
              {section.alert && (
                <span style={{ fontSize: '13px', color: '#92400e', backgroundColor: '#fef3c7', padding: '4px 10px', borderRadius: '6px' }}>
                  ⚠ {section.alert}
                </span>
              )}
            </div>

            {section.stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {section.stats.map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', fontSize: '14px' }}>{section.placeholder || 'No data available'}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Task D — terryheath.com: Passportr sub-tabs

**D1:** Create `services/web/app/admin/passportr/layout.jsx` — sub-nav for Passportr section:

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PassportrAdminLayout({ children }) {
  const pathname = usePathname();
  const isActive = (path) => pathname.startsWith(path);

  return (
    <div>
      <div style={{ borderBottom: '1px solid #eee', marginBottom: '32px' }}>
        <nav style={{ display: 'flex', gap: '0' }}>
          {[
            { href: '/admin/passportr/organizers', label: 'Organizers' },
            { href: '/admin/passportr/subscribers', label: 'Subscribers' },
            { href: '/admin/passportr/send', label: 'Send' },
          ].map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'none',
                borderBottom: isActive(tab.href) ? '2px solid #1A1A1A' : '2px solid transparent',
                color: isActive(tab.href) ? '#1A1A1A' : '#666',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
```

**D2:** Move the existing Passportr organizers page. Read `services/web/app/admin/passportr/page.jsx`. Create `services/web/app/admin/passportr/organizers/page.jsx` with identical content. Then replace `services/web/app/admin/passportr/page.jsx` with a redirect:

```jsx
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';
export default function PassportrRedirect() { redirect('/admin/passportr/organizers'); }
```

**D3:** Create `services/web/app/admin/passportr/subscribers/page.jsx`:

```jsx
'use client';

import { useEffect, useState } from 'react';

export default function PassportrSubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ location: '', hop: '' });

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    try {
      const params = new URLSearchParams();
      if (filter.location) params.set('location', filter.location);
      if (filter.hop) params.set('hop', filter.hop);

      const res = await fetch(`/admin/passportr/api/subscribers?${params}`, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setSubscribers(d.subscribers || []);
        setTotal(d.total || 0);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: '40px' }}><p>Loading...</p></div>;

  return (
    <div style={{ padding: '40px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Passportr Subscribers</h1>
        <span style={{ fontSize: '14px', color: '#666' }}>{total} total opt-ins</span>
      </div>

      {subscribers.length === 0 ? (
        <p style={{ color: '#666' }}>No subscribers yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Location</th>
              <th>Hop</th>
              <th>Opted In</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map(s => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{s.zip_code || '—'}</td>
                <td style={{ fontSize: '12px', color: '#666' }}>{s.hop_name || '—'}</td>
                <td>{new Date(s.opted_in_at).toLocaleDateString()}</td>
                <td>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    backgroundColor: s.unsubscribed_at ? '#f5f5f5' : '#E8F7F4',
                    color: s.unsubscribed_at ? '#999' : '#2AB8A0',
                    fontWeight: '500',
                  }}>
                    {s.unsubscribed_at ? 'Unsubscribed' : 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

**D4:** Create `services/web/app/admin/passportr/send/page.jsx`:

```jsx
'use client';

import { useState } from 'react';

export default function PassportrSendPage() {
  const [form, setForm] = useState({
    subject: '',
    body: '',
    audience: 'all',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    if (!confirm(`Send to ${form.audience === 'all' ? 'all subscribers' : form.audience}? This cannot be undone.`)) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/admin/passportr/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) setResult(d);
      else setError(d.error || 'Send failed');
    } catch { setError('Network error'); }
    setSending(false);
  }

  return (
    <div style={{ padding: '40px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Send Notification</h1>

      <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
        <form onSubmit={handleSend}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Audience</label>
            <select
              value={form.audience}
              onChange={e => setForm({ ...form, audience: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="all">All active subscribers</option>
            </select>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Location and interest filtering coming soon.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Message</label>
            <textarea
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              required
              rows="8"
              style={{ width: '100%' }}
              placeholder="Plain text. An unsubscribe link will be added automatically."
            />
          </div>

          {error && <p style={{ color: '#e55', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}
          {result && (
            <p style={{ color: '#2AB8A0', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}>
              ✓ Sent to {result.sent} subscriber{result.sent !== 1 ? 's' : ''}.
            </p>
          )}

          <button type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**D5:** Create proxy routes for the new Passportr admin endpoints:

`services/web/app/admin/passportr/api/subscribers/route.js`:
```js
import passportrAdmin from '../../../../../../lib/passportr-admin';
import adminAuth from '../../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    adminAuth.requireAdminAuth(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const res = await passportrAdmin.passportrAdminRequest(`/api/admin/subscribers${query ? '?' + query : ''}`);
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr subscribers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

`services/web/app/admin/passportr/api/send/route.js`:
```js
import passportrAdmin from '../../../../../../lib/passportr-admin';
import adminAuth from '../../../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    adminAuth.requireAdminAuth(req);
    const body = await req.json();
    const res = await passportrAdmin.passportrAdminRequest('/api/admin/send', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr send error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**D6:** Create Kindred placeholder page:

`services/web/app/admin/kindred/page.jsx`:
```jsx
export const runtime = 'nodejs';

export default function KindredAdminPage() {
  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Kindred</h1>
      <p style={{ color: '#666' }}>Kindred subscriber management coming soon.</p>
    </div>
  );
}
```

---

## Task E — Passportr: Migration

Read all existing files in `services/passportr/migrations/` to confirm the next migration number.

Create `services/passportr/migrations/007_participant_preferences.sql`:

```sql
CREATE TABLE IF NOT EXISTS participant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  zip_code VARCHAR(10),
  opt_in BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_in_hop_id UUID REFERENCES hops(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token VARCHAR(40) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS participant_preferences_user_id_idx ON participant_preferences(user_id);
CREATE INDEX IF NOT EXISTS participant_preferences_unsubscribe_token_idx ON participant_preferences(unsubscribe_token);
```

---

## Task F — Passportr: Opt-in interstitial on passport page

**Depends on Task E.**

Read `services/passportr/app/[userId]/[hopSlug]/page.jsx`.

**F1:** Create `services/passportr/app/[userId]/[hopSlug]/OptInOverlay.jsx` — client component:

```jsx
'use client';

import { useState } from 'react';

export default function OptInOverlay({ userId, hopId, onDismiss }) {
  const [zipCode, setZipCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleOptIn(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/participant/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hop_id: hopId, zip_code: zipCode }),
      });
    } catch { /* silent fail — opt-in is best effort */ }
    setDone(true);
    setTimeout(onDismiss, 1200);
  }

  async function handleDecline() {
    try {
      await fetch('/api/participant/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hop_id: hopId, opt_in: false }),
      });
    } catch { /* silent fail */ }
    onDismiss();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-warm, #F0EDE6)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        {done ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <p style={{ fontSize: '16px', color: 'var(--accent-teal, #2AB8A0)', fontWeight: '500' }}>You're in!</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗺️</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Hear about future hops?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #6B6B6B)', marginBottom: '24px', lineHeight: '1.5' }}>
              Get notified when new hops are coming to your area. No spam — just hops.
            </p>
            <form onSubmit={handleOptIn}>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="Your zip code (optional)"
                maxLength={10}
                style={{ marginBottom: '12px', textAlign: 'center' }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {submitting ? 'Saving...' : 'Yes, notify me'}
              </button>
            </form>
            <button
              onClick={handleDecline}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #6B6B6B)',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

**F2:** The passport page is a server component. The opt-in overlay must be client-side. Create a wrapper client component `services/passportr/app/[userId]/[hopSlug]/PassportWithOptIn.jsx`:

```jsx
'use client';

import { useState, useEffect } from 'react';
import OptInOverlay from './OptInOverlay';

export default function PassportWithOptIn({ children, userId, hopId, isFirstStamp }) {
  const [showOptIn, setShowOptIn] = useState(false);

  useEffect(() => {
    if (isFirstStamp) {
      // Small delay so passport renders first
      const timer = setTimeout(() => setShowOptIn(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isFirstStamp]);

  return (
    <>
      {children}
      {showOptIn && (
        <OptInOverlay
          userId={userId}
          hopId={hopId}
          onDismiss={() => setShowOptIn(false)}
        />
      )}
    </>
  );
}
```

**F3:** Update `services/passportr/app/[userId]/[hopSlug]/page.jsx`.

Add opt-in check query after the existing redemptions query. This detects whether this is the participant's first visit (stamp count === 1 and no existing preference record):

```js
import PassportWithOptIn from './PassportWithOptIn';

// Add after redeemedVenueIds query:
const prefResult = await db.query(
  'SELECT id FROM participant_preferences WHERE user_id = $1',
  [userId]
);
const hasOptInDecision = prefResult.rows.length > 0;
const isFirstStamp = stampedVenueIds.length === 1 && !hasOptInDecision;
```

Wrap the entire returned JSX in `PassportWithOptIn`:

```jsx
return (
  <PassportWithOptIn userId={userId} hopId={hop.id} isFirstStamp={isFirstStamp}>
    <div className="container" style={{ maxWidth: '600px', paddingTop: '40px' }}>
      {/* ... existing JSX unchanged ... */}
    </div>
  </PassportWithOptIn>
);
```

---

## Task G — Passportr: Admin API endpoints + opt-in route

**Depends on Task E.**

**G1:** Create `services/passportr/app/api/participant/opt-in/route.js`:

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');
const { randomBytes } = require('crypto');

export async function POST(req) {
  try {
    const user = requireAuth(req);
    const { hop_id, zip_code, opt_in = true } = await req.json();

    const unsubscribeToken = randomBytes(20).toString('hex');

    await db.query(
      `INSERT INTO participant_preferences (user_id, email, zip_code, opt_in, opted_in_hop_id, unsubscribe_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET opt_in = EXCLUDED.opt_in,
           zip_code = COALESCE(EXCLUDED.zip_code, participant_preferences.zip_code),
           opted_in_hop_id = COALESCE(EXCLUDED.opted_in_hop_id, participant_preferences.opted_in_hop_id)`,
      [user.sub, user.email, zip_code || null, opt_in, hop_id || null, unsubscribeToken]
    );

    return Response.json({ success: true });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Opt-in error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**G2:** Create `services/passportr/app/unsubscribe/route.js`:

```js
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
const db = require('../../lib/db');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  try {
    const result = await db.query(
      `UPDATE participant_preferences
       SET opt_in = false, unsubscribed_at = NOW()
       WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
       RETURNING email`,
      [token]
    );

    if (result.rows.length === 0) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>Already unsubscribed</h2>
          <p>This email address is not subscribed to Passportr notifications.</p>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new NextResponse(
      `<html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>Unsubscribed</h2>
        <p>You've been removed from Passportr hop notifications.</p>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse('Something went wrong.', { status: 500 });
  }
}
```

**G3:** Create `services/passportr/app/api/admin/subscribers/route.js`:

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');

function requireAdminSecret(req) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.PASSPORTR_ADMIN_SECRET) {
    throw new Error('Unauthorized');
  }
}

export async function GET(req) {
  try {
    requireAdminSecret(req);
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const hopSlug = searchParams.get('hop');

    let query = `
      SELECT pp.*, h.name as hop_name
      FROM participant_preferences pp
      LEFT JOIN hops h ON h.id = pp.opted_in_hop_id
      WHERE pp.opt_in = true
    `;
    const params = [];

    if (location) {
      params.push(location);
      query += ` AND pp.zip_code = $${params.length}`;
    }
    if (hopSlug) {
      params.push(hopSlug);
      query += ` AND h.slug = $${params.length}`;
    }

    query += ' ORDER BY pp.opted_in_at DESC';

    const result = await db.query(query, params);
    const totalResult = await db.query(
      'SELECT COUNT(*) as count FROM participant_preferences WHERE opt_in = true'
    );

    return Response.json({
      subscribers: result.rows,
      total: parseInt(totalResult.rows[0].count),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin subscribers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**G4:** Create `services/passportr/app/api/admin/send/route.js`:

```js
export const runtime = 'nodejs';

const db = require('../../../../lib/db');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

function requireAdminSecret(req) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.PASSPORTR_ADMIN_SECRET) {
    throw new Error('Unauthorized');
  }
}

export async function POST(req) {
  try {
    requireAdminSecret(req);
    const { subject, body, audience } = await req.json();

    if (!subject || !body) {
      return Response.json({ error: 'subject and body required' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT user_id, email, unsubscribe_token
       FROM participant_preferences
       WHERE opt_in = true AND unsubscribed_at IS NULL`
    );

    const subscribers = result.rows;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';
    let sent = 0;

    for (const sub of subscribers) {
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${sub.unsubscribe_token}`;
      try {
        await transporter.sendMail({
          from: process.env.SES_FROM_EMAIL,
          to: sub.email,
          subject,
          text: `${body}\n\n---\nTo stop receiving these emails: ${unsubscribeUrl}`,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err.message);
      }
    }

    return Response.json({ sent, total: subscribers.length });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Admin send error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**G5:** Update `services/passportr/app/api/admin/stats/route.js` to include opt-in count.

Read the file first. Find the existing stats query and add total opt-ins:

```js
const optinsResult = await db.query(
  'SELECT COUNT(*) as count FROM participant_preferences WHERE opt_in = true'
);
```

Add `total_optins: parseInt(optinsResult.rows[0].count)` to the returned stats object.

---

## Task H — terryheath.com: Update passportr-admin lib

**Depends on Task G.**

Read `services/web/lib/passportr-admin.js`.

No changes needed if it already uses `PASSPORTR_BASE_URL` and passes `x-admin-secret`. Confirm it does. If `x-admin-secret` is not being passed, add it to the headers in `passportrAdminRequest`.

---

## Task I — Final wiring check

**Depends on Tasks B, D, H.**

Verify the following routes exist and are correctly wired:

**terryheath.com:**
- [ ] `GET /admin/overview` — ecosystem stats dashboard
- [ ] `GET /admin/small-things/posts` — posts list (Small Things)
- [ ] `GET /admin/small-things/subscribers` — read-only, no delete button
- [ ] `GET /admin/small-things/sends` — sends history
- [ ] `GET /admin/passportr/organizers` — organizer management
- [ ] `GET /admin/passportr/subscribers` — Passportr opt-ins
- [ ] `GET /admin/passportr/send` — send notification form
- [ ] `GET /admin/kindred` — placeholder
- [ ] Old routes `/admin/posts`, `/admin/subscribers`, `/admin/sends` redirect to new paths
- [ ] `/admin/suppressions` is deleted

**Passportr:**
- [ ] `POST /api/participant/opt-in` — records opt-in decision
- [ ] `GET /unsubscribe?token=...` — unsubscribes and shows confirmation page
- [ ] `GET /api/admin/subscribers` — secured with x-admin-secret
- [ ] `POST /api/admin/send` — secured with x-admin-secret, sends emails with unsubscribe links
- [ ] `GET /api/admin/stats` — includes `total_optins`
- [ ] Opt-in overlay appears on passport page when `isFirstStamp === true`

---

## Verification Checklist

- [ ] Both services build without errors
- [ ] Admin nav shows: Overview, Small Things, Passportr, Kindred
- [ ] Sub-tabs work within Small Things and Passportr sections
- [ ] Overview page loads stats from both terryheath.com db and Passportr admin API
- [ ] Passportr admin API endpoints reject requests without correct `x-admin-secret`
- [ ] Opt-in overlay appears after first stamp, dismisses on yes or no, does not reappear
- [ ] Unsubscribe link in notification emails resolves and shows confirmation page
- [ ] No files modified outside this list
