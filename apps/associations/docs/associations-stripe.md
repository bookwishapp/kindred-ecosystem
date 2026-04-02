# Associations — Stripe Checkout

## Context

Read `docs/ARCHITECTURE.md`, `docs/CLAUDE.md`, and `apps/associations/docs/ASSOCIATIONS_ARCHITECTURE.md` before starting.

This prompt adds the Stripe subscription checkout flow. Read every file before touching it. No scope creep. No other files modified outside this list.

---

## What the Checkout Flow Does

When a writer exhausts their 15,000 word trial, they see:

*Your ghosts know you a little now.*
*Subscribe to keep writing.*

They choose monthly ($9) or annual ($79). Stripe Checkout opens in their default browser. After successful payment, the browser redirects to `associations://billing/return` which the Electron app intercepts, verifies the subscription, and unlocks writing.

The Billing menu item (under Project menu) allows existing subscribers to manage their subscription via the Stripe customer portal.

---

## Task A — Add Stripe checkout route to associations-api

Read `services/associations-api/src/routes/subscriptions.js`.

Add a checkout session creation endpoint:

```js
// POST /stripe/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId required' });
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    const userResult = await db.query(
      'SELECT stripe_customer_id, email FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.stripe_customer_id) {
      stripeCustomerId = user.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: req.user.sub },
      });
      stripeCustomerId = customer.id;
      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2',
        [stripeCustomerId, req.user.sub]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'associations://billing/return?status=success',
      cancel_url: 'associations://billing/return?status=cancelled',
      metadata: { user_id: req.user.sub },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Task B — Add billing return deep link handler in Electron

Read `apps/associations/electron/main.js`.

The app already handles `associations://auth/verify` deep links. Add handling for `associations://billing/return`:

In the `open-url` handler, update to handle both:

```js
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url);
  }
});
```

This already sends all deep links to the renderer. The renderer needs to handle the billing return URL.

---

## Task C — Add checkout IPC to preload

Read `apps/associations/electron/preload.js`.

No changes needed — the existing `openExternal` and deep link handler already cover what's needed. The checkout URL opens in the browser via `openExternal`, and the return deep link comes back via `onDeepLink`.

---

## Task D — Checkout component

Create `apps/associations/src/components/Checkout.jsx`:

```jsx
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
```

---

## Task E — Wire checkout into App.jsx

Read `apps/associations/src/App.jsx`.

The trial exhaustion screen currently shows a placeholder. Replace it with the real Checkout component.

Add import:

```jsx
import Checkout from './components/Checkout';
```

The `userProfile` state already exists. When `userProfile.can_write === false`, show Checkout instead of Compose:

```jsx
if (authed && userProfile && !userProfile.can_write) {
  return <Checkout onClose={() => {
    // Re-check subscription after returning from Stripe
    fetchUserProfile().then(setUserProfile);
  }} />;
}
```

Handle the billing return deep link in the existing deep link handler. In the `useEffect` that sets up `onDeepLink`:

```js
window.electron.onDeepLink((url) => {
  const parsed = new URL(url);

  if (parsed.protocol === 'associations:' && parsed.host === 'auth') {
    const token = parsed.searchParams.get('access_token');
    if (token) {
      window.electron.saveToken(token).then(() => {
        setAuthed(true);
        loadActiveContext();
      });
    }
  }

  if (parsed.protocol === 'associations:' && parsed.host === 'billing') {
    const status = parsed.searchParams.get('status');
    if (status === 'success') {
      // Re-fetch user profile to pick up new subscription status
      setTimeout(() => {
        fetchUserProfile().then(setUserProfile);
      }, 2000); // Give webhook time to process
    }
  }
});
```

---

## Task F — Add Stripe price IDs to .env

Read `apps/associations/.env`.

Add:

```
VITE_STRIPE_PRICE_MONTHLY=price_xxxxx
VITE_STRIPE_PRICE_ANNUAL=price_xxxxx
```

Replace with actual price IDs from the Stripe dashboard. These are the Associations monthly and annual prices created earlier.

---

## Task G — Add Billing to Project menu

Read `apps/associations/electron/main.js`.

In the Project submenu, add after the Questions item:

```js
{ type: 'separator' },
{
  label: 'Manage Billing…',
  click: () => mainWindow?.webContents.send('menu-billing'),
},
```

In `preload.js`, add to menu contextBridge:

```js
onBilling: (cb) => ipcRenderer.on('menu-billing', cb),
```

In `App.jsx`, wire the billing menu event and add a portal handler:

```jsx
window.electron.menu.onBilling(async () => {
  const token = await window.electron.getToken();
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/stripe/portal`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (res.ok) {
    const { url } = await res.json();
    window.electron.openExternal(url);
  }
});
```

---

## Verification Checklist

- [ ] associations-api deployed with new checkout route
- [ ] Trial exhaustion screen shows "Your ghosts know you a little now."
- [ ] Monthly and annual buttons both present
- [ ] Clicking a plan opens Stripe Checkout in the browser
- [ ] After successful payment, app re-checks subscription and unlocks
- [ ] "Maybe later" closes the screen (writer can still see it by quitting and re-opening once trial is exhausted)
- [ ] Project > Manage Billing opens Stripe customer portal
- [ ] Webhook correctly updates subscription_status to 'active' after payment
- [ ] No other files modified outside this list

## Beta Tester Access

For beta testers who should bypass the trial, manually set their subscription status in the Railway Postgres database for associations-api:

```sql
UPDATE users SET subscription_status = 'active' WHERE email = 'tester@example.com';
```

Run this in the Railway database console for each beta tester after they sign in for the first time.
