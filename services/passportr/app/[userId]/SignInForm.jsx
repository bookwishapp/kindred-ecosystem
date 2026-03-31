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
