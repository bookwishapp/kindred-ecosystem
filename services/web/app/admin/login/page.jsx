'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(
    error === 'unauthorized' ? 'This account is not authorized for admin access.' :
    error === 'no_token' ? 'Invalid sign-in link.' :
    error === 'invalid_token' ? 'Sign-in link expired. Please try again.' :
    ''
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setErr(data.error || 'Failed to send sign-in link.');
      }
    } catch {
      setErr('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="container">
        <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
          <h1>Check your email</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>
            A sign-in link has been sent to {email}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <h1>Admin</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="your@email.com"
            />
          </div>
          {err && <div className="message message-error" style={{ marginBottom: '16px' }}>{err}</div>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send sign-in link'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container"><div style={{ maxWidth: '400px', margin: '4rem auto' }}><h1>Admin</h1></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
