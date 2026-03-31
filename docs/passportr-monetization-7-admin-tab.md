# Passportr — Monetization: Prompt 7 of 7
# terryheath.com/admin Passportr Tab

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Prerequisite

Prompt 6 must be fully deployed before this prompt runs. The Passportr admin API must be live and reachable.

---

## Manual Prerequisite

Add to `services/web` Railway env vars:
```
PASSPORTR_API_URL=https://outstanding-dedication-production-13f3.up.railway.app
PASSPORTR_ADMIN_SECRET=<same value as in outstanding-dedication service>
```

---

## Task A — Passportr Admin API Client

Read the existing admin route structure in `services/web/app/admin/` to understand the current pattern before writing.

Create `services/web/lib/passportr-admin.js`:

```js
const PASSPORTR_API_URL = process.env.PASSPORTR_API_URL;
const PASSPORTR_ADMIN_SECRET = process.env.PASSPORTR_ADMIN_SECRET;

function adminHeaders() {
  return {
    'Authorization': `Bearer ${PASSPORTR_ADMIN_SECRET}`,
    'Content-Type': 'application/json',
  };
}

async function getStats() {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/stats`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch Passportr stats');
  return res.json();
}

async function getOrganizers() {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch organizers');
  return res.json();
}

async function getOrganizer(userId) {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers/${userId}`, {
    headers: adminHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch organizer');
  return res.json();
}

async function updateOrganizer(userId, data) {
  const res = await fetch(`${PASSPORTR_API_URL}/api/admin/organizers/${userId}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update organizer');
  return res.json();
}

module.exports = { getStats, getOrganizers, getOrganizer, updateOrganizer };
```

---

## Task B — Passportr Admin API Routes in terryheath.com

These are Next.js API routes that proxy admin actions from the terryheath.com browser to the Passportr admin API server-side, so the admin secret is never exposed to the browser.

Create `services/web/app/admin/passportr/api/stats/route.js`:

```js
export const runtime = 'nodejs';

const { getStats } = require('../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdmin(req);
    const stats = await getStats();
    return Response.json(stats);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr stats error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Create `services/web/app/admin/passportr/api/organizers/route.js`:

```js
export const runtime = 'nodejs';

const { getOrganizers } = require('../../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../../lib/admin-auth');

export async function GET(req) {
  try {
    requireAdmin(req);
    const data = await getOrganizers();
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr organizers error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Create `services/web/app/admin/passportr/api/organizers/[userId]/route.js`:

```js
export const runtime = 'nodejs';

const { updateOrganizer } = require('../../../../../../../lib/passportr-admin');
const { requireAdmin } = require('../../../../../../../lib/admin-auth');

export async function PUT(req, { params }) {
  try {
    requireAdmin(req);
    const { userId } = params;
    const body = await req.json();
    const data = await updateOrganizer(userId, body);
    return Response.json(data);
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Passportr update organizer error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Note: `requireAdmin` must match whatever pattern `services/web` uses to protect admin routes. Read `services/web/lib/` to find the existing admin auth helper before writing these files — use the same pattern.

---

## Task C — Passportr Admin Tab Page

Read the existing admin pages in `services/web/app/admin/` to understand the current layout and navigation pattern before writing.

Create `services/web/app/admin/passportr/page.jsx`:

```jsx
'use client';

import { useEffect, useState } from 'react';

const PLAN_LABELS = {
  single:     'Single Hop',
  occasional: 'Occasional',
  regular:    'Regular',
  unlimited:  'Unlimited',
};

const STATUS_COLORS = {
  active:    { bg: '#E8F7F4', color: '#2AB8A0' },
  past_due:  { bg: '#fff3cd', color: '#856404' },
  cancelled: { bg: '#f5f5f5', color: '#999' },
  inactive:  { bg: '#f5f5f5', color: '#999' },
};

export default function PassportrAdmin() {
  const [stats, setStats] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'nonprofit_pending' | 'active'

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [statsRes, organizersRes] = await Promise.all([
        fetch('/admin/passportr/api/stats', { credentials: 'include' }),
        fetch('/admin/passportr/api/organizers', { credentials: 'include' }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (organizersRes.ok) {
        const d = await organizersRes.json();
        setOrganizers(d.organizers || []);
      }
    } catch (err) {
      console.error('Load error:', err);
    }
    setLoading(false);
  }

  async function verifyNonprofit(userId) {
    setUpdating(userId);
    try {
      const res = await fetch(`/admin/passportr/api/organizers/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nonprofit_verified: true,
          nonprofit_pending: false,
          status: 'active',
          plan: 'unlimited',
          tier: 2,
        }),
      });
      if (res.ok) loadAll();
      else alert('Failed to verify nonprofit');
    } catch { alert('Network error'); }
    setUpdating(null);
  }

  async function toggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!confirm(`Set this organizer to ${newStatus}?`)) return;
    setUpdating(userId);
    try {
      const res = await fetch(`/admin/passportr/api/organizers/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) loadAll();
      else alert('Failed to update status');
    } catch { alert('Network error'); }
    setUpdating(null);
  }

  const filteredOrganizers = organizers.filter(o => {
    if (filter === 'nonprofit_pending') return o.nonprofit_pending && !o.nonprofit_verified;
    if (filter === 'active') return o.status === 'active';
    return true;
  });

  if (loading) return <div style={{ padding: '40px' }}><p>Loading...</p></div>;

  return (
    <div style={{ padding: '40px', maxWidth: '1100px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Passportr</h1>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {[
            { label: 'Active Organizers', value: stats.active_organizers },
            { label: 'Total Hops', value: stats.total_hops },
            { label: 'Participants', value: stats.total_participants },
            { label: 'Stamps', value: stats.total_stamps },
            { label: 'Redemptions', value: stats.total_redemptions },
            { label: 'Nonprofit Pending', value: stats.pending_nonprofit_verifications, alert: stats.pending_nonprofit_verifications > 0 },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                padding: '16px',
                backgroundColor: stat.alert ? '#fff3cd' : '#f9f9f9',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px', color: stat.alert ? '#856404' : undefined }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: stat.alert ? '#856404' : '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { key: 'all', label: `All (${organizers.length})` },
          { key: 'active', label: `Active (${organizers.filter(o => o.status === 'active').length})` },
          { key: 'nonprofit_pending', label: `Nonprofit Pending (${organizers.filter(o => o.nonprofit_pending && !o.nonprofit_verified).length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontSize: '13px',
              padding: '6px 14px',
              backgroundColor: filter === f.key ? '#1A1A1A' : '#f0f0f0',
              color: filter === f.key ? 'white' : '#1A1A1A',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Organizers table */}
      <div style={{ display: 'grid', gap: '8px' }}>
        {filteredOrganizers.length === 0 && (
          <p style={{ color: '#666', padding: '32px', textAlign: 'center' }}>No organizers found.</p>
        )}
        {filteredOrganizers.map(org => {
          const statusStyle = STATUS_COLORS[org.status] || STATUS_COLORS.inactive;
          return (
            <div
              key={org.user_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                gap: '16px',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #eee',
                fontSize: '14px',
              }}
            >
              <div>
                <div style={{ fontWeight: '500', marginBottom: '2px' }}>{org.name || '—'}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{org.email}</div>
                {org.organization && <div style={{ color: '#666', fontSize: '12px' }}>{org.organization}</div>}
                {org.nonprofit_pending && !org.nonprofit_verified && (
                  <div style={{ color: '#856404', fontSize: '12px', marginTop: '2px' }}>
                    ⚠ Nonprofit pending — EIN: {org.nonprofit_ein || 'not provided'}
                  </div>
                )}
                {org.nonprofit_verified && (
                  <div style={{ color: '#2AB8A0', fontSize: '12px', marginTop: '2px' }}>✓ Nonprofit verified</div>
                )}
              </div>

              <div>
                <div>{PLAN_LABELS[org.plan] || 'None'}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>Tier {org.tier}</div>
              </div>

              <div>
                <div>{org.hops_used_this_period || 0} hops used</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{org.total_hops} total</div>
              </div>

              <div>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                  fontWeight: '500',
                }}>
                  {org.status}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {org.nonprofit_pending && !org.nonprofit_verified && (
                  <button
                    onClick={() => verifyNonprofit(org.user_id)}
                    disabled={updating === org.user_id}
                    style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#2AB8A0' }}
                  >
                    Verify Nonprofit
                  </button>
                )}
                <button
                  onClick={() => toggleStatus(org.user_id, org.status)}
                  disabled={updating === org.user_id}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    backgroundColor: org.status === 'active' ? '#e55' : '#666',
                  }}
                >
                  {org.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Task D — Add Passportr to Admin Navigation

Read the existing admin navigation component in `services/web/app/admin/` — it may be a layout file, a sidebar component, or a nav bar. Find where the existing admin tabs/links are defined and add a Passportr link following the same pattern.

The link should point to `/admin/passportr` and be labeled "Passportr".

---

## Verification Checklist

- [ ] `PASSPORTR_API_URL` and `PASSPORTR_ADMIN_SECRET` added to services/web Railway env vars
- [ ] `services/web/lib/passportr-admin.js` exists with all four functions
- [ ] Three proxy API routes created under `services/web/app/admin/passportr/api/`
- [ ] All proxy routes use existing admin auth pattern from services/web
- [ ] `services/web/app/admin/passportr/page.jsx` exists with stats, organizer list, nonprofit verify, activate/deactivate
- [ ] Passportr link added to admin navigation
- [ ] No other files modified outside this list
