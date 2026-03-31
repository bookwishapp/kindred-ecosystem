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
