import { useState } from 'react';

const PRICES = [
  {
    id: import.meta.env.VITE_STRIPE_PRICE_MONTHLY,
    label: 'Monthly',
    amount: '$9',
    period: '/month',
    description: 'Cancel anytime.',
  },
  {
    id: import.meta.env.VITE_STRIPE_PRICE_ANNUAL,
    label: 'Annual',
    amount: '$79',
    period: '/year',
    description: 'Save $29 — two months free.',
    featured: true,
  },
];

export default function Checkout({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheckout(priceId) {
    setLoading(true);
    setError(null);
    try {
      const token = await window.electron.getToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      await window.electron.openExternal(url);
      // Don't close — wait for deep link return
    } catch {
      setError('Could not connect. Check your connection and try again.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '0',
      padding: '48px',
      background: 'var(--bg)',
    }}>
      <p style={{
        fontFamily: "'Lora', serif",
        fontStyle: 'italic',
        fontSize: '24px',
        color: 'var(--text)',
        lineHeight: '1.5',
        textAlign: 'center',
        marginBottom: '8px',
      }}>
        Your ghosts know you a little now.
      </p>
      <p style={{
        fontFamily: "'Lora', serif",
        fontStyle: 'italic',
        fontSize: '16px',
        color: 'var(--text-muted)',
        marginBottom: '52px',
        textAlign: 'center',
      }}>
        Subscribe to keep writing.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
        {PRICES.map(price => (
          <button
            key={price.id}
            onClick={() => handleCheckout(price.id)}
            disabled={loading || !price.id}
            style={{
              fontFamily: "'Poppins', sans-serif",
              background: price.featured ? 'var(--text)' : 'white',
              color: price.featured ? 'var(--bg)' : 'var(--text)',
              border: price.featured ? 'none' : '0.5px solid var(--border)',
              borderRadius: '10px',
              padding: '24px 32px',
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: '160px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <p style={{ fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px', opacity: 0.7 }}>
              {price.label}
            </p>
            <p style={{ fontSize: '28px', fontWeight: '500', marginBottom: '4px' }}>
              {price.amount}
              <span style={{ fontSize: '13px', fontWeight: '400', opacity: 0.7 }}>{price.period}</span>
            </p>
            <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '6px', fontFamily: "'Lora', serif", fontStyle: 'italic' }}>
              {price.description}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontFamily: "'Lora', serif", fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {error}
        </p>
      )}

      {loading && (
        <p style={{ fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: '13px', color: 'var(--text-faint)' }}>
          Opening checkout…
        </p>
      )}

      <button
        onClick={onClose}
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: '10px',
          letterSpacing: '0.08em',
          color: 'var(--text-faint)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginTop: '16px',
        }}
      >
        Maybe later
      </button>
    </div>
  );
}
