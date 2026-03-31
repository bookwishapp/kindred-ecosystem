# Passportr Monetization — Prompt 3: Organizer Signup + Checkout Flow

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Prerequisites

- Prompts 1 and 2 must be fully deployed
- Stripe products and prices must be live with env vars filled in

---

## Task A — Checkout API route

Create `services/passportr/app/api/organize/checkout/route.js`:

```js
export const runtime = 'nodejs';

const Stripe = require('stripe');
const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');
const { getPlanConfig, getPriceId } = require('../../../../lib/plans');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const user = requireAuth(req);
    const { plan_key, name, organization, website, nonprofit_ein } = await req.json();

    if (!plan_key) {
      return Response.json({ error: 'plan_key required' }, { status: 400 });
    }

    const planConfig = getPlanConfig(plan_key);
    if (!planConfig) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = getPriceId(plan_key);
    if (!priceId) {
      return Response.json({ error: 'Plan not configured' }, { status: 500 });
    }

    // Upsert organizer profile with submitted info
    const nonprofitPending = !!nonprofit_ein;
    await db.query(
      `INSERT INTO organizer_profiles (user_id, email, name, organization, website, nonprofit_ein, nonprofit_pending)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, organizer_profiles.name),
           organization = COALESCE(EXCLUDED.organization, organizer_profiles.organization),
           website = COALESCE(EXCLUDED.website, organizer_profiles.website),
           nonprofit_ein = COALESCE(EXCLUDED.nonprofit_ein, organizer_profiles.nonprofit_ein),
           nonprofit_pending = CASE WHEN EXCLUDED.nonprofit_ein IS NOT NULL THEN true ELSE organizer_profiles.nonprofit_pending END,
           updated_at = NOW()`,
      [user.sub, user.email, name, organization, website, nonprofit_ein || null, nonprofitPending]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';

    // Get or create Stripe customer
    const profileResult = await db.query(
      'SELECT stripe_customer_id, single_hop_credit FROM organizer_profiles WHERE user_id = $1',
      [user.sub]
    );
    const profile = profileResult.rows[0];

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.sub },
      });
      customerId = customer.id;
      await db.query(
        'UPDATE organizer_profiles SET stripe_customer_id = $1 WHERE user_id = $2',
        [customerId, user.sub]
      );
    }

    // Apply single hop credit if upgrading to a subscription
    const discounts = [];
    const creditAmount = profile?.single_hop_credit || 0;
    if (creditAmount > 0 && !planConfig.isSingle) {
      const coupon = await stripe.coupons.create({
        amount_off: creditAmount,
        currency: 'usd',
        name: 'Single hop credit',
        max_redemptions: 1,
      });
      discounts.push({ coupon: coupon.id });
    }

    const sessionParams = {
      customer: customerId,
      mode: planConfig.isSingle ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/organize/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/organize/signup`,
      metadata: {
        user_id: user.sub,
        plan_key,
      },
    };

    if (discounts.length > 0) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Checkout error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Task B — Organizer Signup Page

Create `services/passportr/app/organize/signup/page.jsx`:

```jsx
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
```

---

## Task C — Welcome Page

Create `services/passportr/app/organize/welcome/page.jsx`:

```jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizerWelcome() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/organize');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="container" style={{ paddingTop: '120px', maxWidth: '500px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>You're all set!</h1>
      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
        Welcome to Passportr. Your account is active and ready to go.
      </p>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        Redirecting to your dashboard in {countdown}...
      </p>
      <button onClick={() => router.push('/organize')} style={{ marginTop: '16px' }}>
        Go to Dashboard Now
      </button>
    </div>
  );
}
```

---

## Task D — Update organize dashboard 403 state

Read `services/passportr/app/organize/page.jsx`.

Find the `accessDenied` render block and replace it:

Find:
```jsx
if (accessDenied) {
  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Organizer Access Required</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          This area is currently available to authorized organizers only.
          Contact support if you believe you should have access.
        </p>
      </div>
    </div>
  );
}
```

Replace with:
```jsx
if (accessDenied) {
  return (
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '64px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>Start Running Hops</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
          Replace paper passports with digital ones. No app required for participants — they just scan and go.
        </p>
        <a href="/organize/signup">
          <button style={{ width: '100%' }}>Get Started →</button>
        </a>
      </div>
    </div>
  );
}
```

No other changes to this file.

---

## Verification Checklist

- [ ] `api/organize/checkout/route.js` — upserts organizer profile, gets or creates Stripe customer, applies single hop credit coupon if present, returns checkout URL
- [ ] `organize/signup/page.jsx` — two-step form: info then plan selection, nonprofit EIN collection, posts to checkout API, redirects to Stripe hosted checkout
- [ ] `organize/welcome/page.jsx` — countdown redirect to dashboard
- [ ] `organize/page.jsx` — 403 state shows Get Started prompt linking to signup
- [ ] Checkout handles 401 by redirecting to `/organize/login`
- [ ] No other files modified
