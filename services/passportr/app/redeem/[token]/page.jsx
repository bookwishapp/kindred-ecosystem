'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RedeemPage({ params }) {
  const { token } = params;
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function handleRedeem() {
      try {
        const response = await fetch('/api/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redeem_token: token }),
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
          setCoupon(data);
          setStatus('success');

          // Calculate initial time left
          const expiresAt = new Date(data.expires_at);
          const now = new Date();
          const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
          setTimeLeft(diff);
        } else if (response.status === 401) {
          setStatus('auth_required');
        } else {
          setError(data.error || 'Failed to redeem');
          setStatus('error');
        }
      } catch (err) {
        setError('Network error');
        setStatus('error');
      }
    }

    handleRedeem();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (status === 'success' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'loading') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎁</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Generating your coupon...</h1>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="container" style={{ paddingTop: '60px', maxWidth: '500px', textAlign: 'center' }}>
        {!coupon.just_generated ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⛔</div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Already Redeemed</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              This reward was already redeemed on {new Date(coupon.redeemed_at).toLocaleDateString()}.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{coupon.venue_name}</h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
              {coupon.reward_description}
            </p>

            <div className="card" style={{ padding: '32px', backgroundColor: 'var(--accent-teal)', color: 'white' }}>
              <p style={{ fontSize: '14px', marginBottom: '16px', opacity: 0.9 }}>Your Coupon Code</p>
              <div style={{
                fontSize: '48px',
                fontWeight: '700',
                fontFamily: 'monospace',
                letterSpacing: '4px',
                marginBottom: '24px'
              }}>
                {coupon.coupon_code}
              </div>

              {timeLeft !== null && timeLeft > 0 && (
                <div style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}>
                  {formatTime(timeLeft)}
                </div>
              )}

              {timeLeft === 0 && (
                <div style={{
                  fontSize: '16px',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#FFE5E5'
                }}>
                  Expired
                </div>
              )}
            </div>

            <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Show this screen to the staff
            </p>

            <button
              onClick={() => router.back()}
              style={{ marginTop: '32px', backgroundColor: 'var(--text-secondary)' }}
            >
              Back to Passport
            </button>
          </>
        )}
      </div>
    );
  }

  if (status === 'auth_required') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Sign in required</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          You need to be signed in to redeem rewards.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
          {error === 'Complete the hop first' ? 'Complete the hop first' : 'Error'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error}</p>
        <button onClick={() => router.back()} style={{ backgroundColor: 'var(--text-secondary)' }}>
          Go Back
        </button>
      </div>
    );
  }

  return null;
}
