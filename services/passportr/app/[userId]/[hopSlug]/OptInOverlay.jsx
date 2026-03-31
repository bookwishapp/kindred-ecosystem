'use client';

import { useState } from 'react';

export default function OptInOverlay({ userId, hopId, onDismiss }) {
  const [zipCode, setZipCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleOptIn(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/participant/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hop_id: hopId, zip_code: zipCode }),
      });
    } catch { /* silent fail — opt-in is best effort */ }
    setDone(true);
    setTimeout(onDismiss, 1200);
  }

  async function handleDecline() {
    try {
      await fetch('/api/participant/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hop_id: hopId, opt_in: false }),
      });
    } catch { /* silent fail */ }
    onDismiss();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-warm, #F0EDE6)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        {done ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <p style={{ fontSize: '16px', color: 'var(--accent-teal, #2AB8A0)', fontWeight: '500' }}>You're in!</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🗺️</div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Hear about future hops?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary, #6B6B6B)', marginBottom: '24px', lineHeight: '1.5' }}>
              Get notified when new hops are coming to your area. No spam — just hops.
            </p>
            <form onSubmit={handleOptIn}>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="Your zip code (optional)"
                maxLength={10}
                style={{ marginBottom: '12px', textAlign: 'center' }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {submitting ? 'Saving...' : 'Yes, notify me'}
              </button>
            </form>
            <button
              onClick={handleDecline}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary, #6B6B6B)',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
