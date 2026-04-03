'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../layout-admin';

export default function PassportrPage() {
  const [organizers, setOrganizers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/passportr/organizers').then(r => r.json()),
      fetch('/api/passportr/stats').then(r => r.json()),
    ]).then(([org, st]) => {
      setOrganizers(org.organizers || []);
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggleNonprofit(userId, current) {
    await fetch(`/api/passportr/organizers/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonprofit_verified: !current }),
    });
    setOrganizers(orgs => orgs.map(o =>
      o.user_id === userId ? { ...o, nonprofit_verified: !current } : o
    ));
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Passportr</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Organizer management</p>

      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="card" style={{ minWidth: '140px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{key.replace(/_/g, ' ')}</p>
              <p style={{ fontSize: '28px', fontWeight: '600' }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-faint)' }}>Loading...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Name / Org</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Nonprofit</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {organizers.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '32px' }}>No organizers yet.</td></tr>
              )}
              {organizers.map(org => (
                <tr key={org.user_id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{org.name || '—'}</div>
                    {org.organization && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{org.organization}</div>}
                  </td>
                  <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{org.email}</td>
                  <td><span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: '#F5F5F5' }}>Tier {org.tier}</span></td>
                  <td>
                    <button
                      onClick={() => toggleNonprofit(org.user_id, org.nonprofit_verified)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: org.nonprofit_verified ? '#E8F7F4' : 'transparent',
                        color: org.nonprofit_verified ? '#2AB8A0' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {org.nonprofit_verified ? '✓ Verified' : 'Verify'}
                    </button>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
