'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    tier: 1,
    tierLabel: 'Tier 1 — Up to 10 venues per hop',
    plans: [
      { key: 'single_tier1', label: 'Single Hop', price: '$49', description: 'One hop, valid for 1 year', isSubscription: false },
      { key: 'occasional_tier1', label: 'Occasional', price: '$79/year', description: 'Up to 3 hops per year', isSubscription: true },
      { key: 'regular_tier1', label: 'Regular', price: '$129/year', description: 'Up to 12 hops per year', isSubscription: true },
      { key: 'unlimited_tier1', label: 'Unlimited', price: '$179/year', description: 'Unlimited hops per year', isSubscription: true },
    ],
  },
  {
    tier: 2,
    tierLabel: 'Tier 2 — Unlimited venues per hop',
    plans: [
      { key: 'single_tier2', label: 'Single Hop', price: '$79', description: 'One hop, valid for 1 year', isSubscription: false },
      { key: 'occasional_tier2', label: 'Occasional', price: '$129/year', description: 'Up to 3 hops per year', isSubscription: true },
      { key: 'regular_tier2', label: 'Regular', price: '$189/year', description: 'Up to 12 hops per year', isSubscription: true },
      { key: 'unlimited_tier2', label: 'Unlimited', price: '$249/year', description: 'Unlimited hops per year', isSubscription: true },
    ],
  },
];

export default function OrganizerSignup() {
  const router = useRouter();
  const [step, setStep] = useState('info');
  const [info, setInfo] = useState({ name: '', organization: '', website: '', nonprofit_ein: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isNonprofit, setIsNonprofit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCheckout() {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/organize/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plan_key: selectedPlan,
          ...info,
          nonprofit_ein: isNonprofit ? info.nonprofit_ein : null,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/organize/login');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        setLoading(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: '60px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Get Started with Passportr</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
        Replace paper passports with digital ones. No app required for participants.
      </p>

      {step === 'info' && (
        <div className="card">
          <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>About Your Organization</h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Your Name</label>
            <input
              type="text"
              value={info.name}
              onChange={e => setInfo({ ...info, name: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Organization Name <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={info.organization}
              onChange={e => setInfo({ ...info, organization: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Website <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <input
              type="url"
              value={info.website}
              onChange={e => setInfo({ ...info, website: e.target.value })}
              placeholder="https://"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isNonprofit}
                onChange={e => setIsNonprofit(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>We are a 501(c)(3) nonprofit organization</span>
            </label>
            {isNonprofit && (
              <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>EIN</label>
                <input
                  type="text"
                  value={info.nonprofit_ein}
                  onChange={e => setInfo({ ...info, nonprofit_ein: e.target.value })}
                  placeholder="XX-XXXXXXX"
                  style={{ marginBottom: '8px' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  We'll verify your nonprofit status within 2 business days and refund your payment once confirmed.
                  You'll need to select a plan and pay today to activate your account immediately.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep('plan')}
            disabled={!info.name}
            style={{ width: '100%' }}
          >
            Choose a Plan →
          </button>
        </div>
      )}

      {step === 'plan' && (
        <div>
          <button
            onClick={() => setStep('info')}
            style={{ fontSize: '14px', color: 'var(--text-secondary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
          >
            ← Back
          </button>

          {PLANS.map(tier => (
            <div key={tier.tier} style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                {tier.tierLabel}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {tier.plans.map(plan => (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedPlan(plan.key)}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      border: selectedPlan === plan.key ? '2px solid var(--accent-teal)' : '2px solid transparent',
                      backgroundColor: selectedPlan === plan.key ? '#E8F7F4' : 'white',
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{plan.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-teal)', marginBottom: '8px' }}>{plan.price}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{plan.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && <p style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={!selectedPlan || loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Redirecting to checkout...' : 'Continue to Payment →'}
          </button>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '16px' }}>
            Secure payment via Stripe. Subscriptions can be canceled anytime.
          </p>
        </div>
      )}
    </div>
  );
}
