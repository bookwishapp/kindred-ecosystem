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
