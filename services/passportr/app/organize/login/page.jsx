'use client';

import { useState } from 'react';

export default function OrganizerLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/organize/callback`;

      const response = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_uri: redirectUri,
          app_name: 'Passportr'
        })
      });

      if (response.ok) {
        setSent(true);
      } else {
        alert('Failed to send magic link. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Network error. Please try again.');
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Check your email</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We've sent you a magic link to sign in as an organizer. Click the link in your email to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ padding: '48px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>Organizer Sign In</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', textAlign: 'center' }}>
          Enter your email to receive a magic link
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
