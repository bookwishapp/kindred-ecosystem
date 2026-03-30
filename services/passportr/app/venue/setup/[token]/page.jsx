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
