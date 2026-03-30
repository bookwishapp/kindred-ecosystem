'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StampPage({ params }) {
  const { token } = params;
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [passportUrl, setPassportUrl] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function handleStamp() {
      try {
        const response = await fetch('/api/stamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stamp_token: token }),
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
          setPassportUrl(data.passport_url);
          setStatus('success');
          // Redirect after 1 second
          setTimeout(() => {
            router.push(data.passport_url);
          }, 1000);
        } else if (response.status === 401) {
          setStatus('auth_required');
        } else {
          setError(data.error || 'Failed to stamp');
          setStatus('error');
        }
      } catch (err) {
        setError('Network error');
        setStatus('error');
      }
    }

    handleStamp();
  }, [token, router]);

  if (status === 'loading') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>📍</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Stamping your passport...</h1>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>✅</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--accent-teal)' }}>
          Stamped!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Redirecting to your passport...</p>
      </div>
    );
  }

  if (status === 'auth_required') {
    return (
      <div className="container" style={{ paddingTop: '80px', maxWidth: '500px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>
          Sign in to stamp your passport
        </h1>
        <div className="card">
          <p style={{ marginBottom: '16px', textAlign: 'center' }}>
            We'll send you a link to access your passport.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = e.target.email.value;

              // Request magic link from auth service
              try {
                const response = await fetch('/api/auth/request', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email,
                    redirect_uri: `${window.location.origin}/api/auth/callback?return_to=${encodeURIComponent(`/stamp/${token}`)}`,
                    app_name: 'Passportr'
                  })
                });

                if (response.ok) {
                  setStatus('email_sent');
                } else {
                  setError('Failed to send email');
                }
              } catch (err) {
                setError('Network error');
              }
            }}
          >
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              style={{ marginBottom: '16px' }}
            />
            <button type="submit" style={{ width: '100%' }}>
              Send Link
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (status === 'email_sent') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>📧</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Check your email</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          We sent you a link to access your passport.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Error</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  return null;
}
