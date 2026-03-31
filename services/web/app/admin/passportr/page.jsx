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
