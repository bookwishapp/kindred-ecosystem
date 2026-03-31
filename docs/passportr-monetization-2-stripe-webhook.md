# Passportr Monetization — Prompt 2: Stripe Setup + Webhook Handler

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No other files modified outside this list.

## Prerequisites

- Prompt 1 must be fully deployed before this prompt runs
- Stripe products and prices must be created in Stripe dashboard before env vars can be filled in

---

## Manual Step: Create Stripe Products and Prices

In the Stripe dashboard (https://dashboard.stripe.com/products), create the following. Use exactly these names — they will appear on receipts and invoices.

**Product 1: Passportr Tier 1 (up to 10 venues per hop)**

Prices:
- Single hop — $49.00 one-time → set metadata key `plan` = `single_tier1`
- Occasional (1–3 hops/year) — $79.00/year recurring → metadata `plan` = `occasional_tier1`
- Regular (up to 12 hops/year) — $129.00/year recurring → metadata `plan` = `regular_tier1`
- Unlimited hops/year — $179.00/year recurring → metadata `plan` = `unlimited_tier1`

**Product 2: Passportr Tier 2 (11+ venues per hop)**

Prices:
- Single hop — $79.00 one-time → metadata `plan` = `single_tier2`
- Occasional (1–3 hops/year) — $129.00/year recurring → metadata `plan` = `occasional_tier2`
- Regular (up to 12 hops/year) — $189.00/year recurring → metadata `plan` = `regular_tier2`
- Unlimited hops/year — $249.00/year recurring → metadata `plan` = `unlimited_tier2`

After creating each price, copy its `price_id` (starts with `price_`) into the corresponding Railway env var:
- `STRIPE_PRICE_TIER1_SINGLE`
- `STRIPE_PRICE_TIER1_OCCASIONAL`
- `STRIPE_PRICE_TIER1_REGULAR`
- `STRIPE_PRICE_TIER1_UNLIMITED`
- `STRIPE_PRICE_TIER2_SINGLE`
- `STRIPE_PRICE_TIER2_OCCASIONAL`
- `STRIPE_PRICE_TIER2_REGULAR`
- `STRIPE_PRICE_TIER2_UNLIMITED`

**Webhook:** In Stripe dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://outstanding-dedication-production-13f3.up.railway.app/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` Railway env var.

---

## Task A — Install Stripe SDK

From `services/passportr/`, run:
```
npm install stripe
```

Confirm `stripe` is added to `package.json` dependencies.

---

## Task B — Plan configuration module

Create `services/passportr/lib/plans.js`:

```js
const PLANS = {
  single_tier1: {
    tier: 1,
    maxHops: 1,
    maxVenuesPerHop: 10,
    isSingle: true,
    priceEnvVar: 'STRIPE_PRICE_TIER1_SINGLE',
    label: 'Single Hop — Tier 1',
    amount: 4900,
  },
  single_tier2: {
    tier: 2,
    maxHops: 1,
    maxVenuesPerHop: null,
    isSingle: true,
    priceEnvVar: 'STRIPE_PRICE_TIER2_SINGLE',
    label: 'Single Hop — Tier 2',
    amount: 7900,
  },
  occasional_tier1: {
    tier: 1,
    maxHops: 3,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_OCCASIONAL',
    label: 'Occasional — Tier 1 (up to 3 hops/year)',
    amount: 7900,
  },
  occasional_tier2: {
    tier: 2,
    maxHops: 3,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_OCCASIONAL',
    label: 'Occasional — Tier 2 (up to 3 hops/year)',
    amount: 12900,
  },
  regular_tier1: {
    tier: 1,
    maxHops: 12,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_REGULAR',
    label: 'Regular — Tier 1 (up to 12 hops/year)',
    amount: 12900,
  },
  regular_tier2: {
    tier: 2,
    maxHops: 12,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_REGULAR',
    label: 'Regular — Tier 2 (up to 12 hops/year)',
    amount: 18900,
  },
  unlimited_tier1: {
    tier: 1,
    maxHops: null,
    maxVenuesPerHop: 10,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER1_UNLIMITED',
    label: 'Unlimited — Tier 1',
    amount: 17900,
  },
  unlimited_tier2: {
    tier: 2,
    maxHops: null,
    maxVenuesPerHop: null,
    isSingle: false,
    priceEnvVar: 'STRIPE_PRICE_TIER2_UNLIMITED',
    label: 'Unlimited — Tier 2',
    amount: 24900,
  },
};

function getPlanConfig(planKey) {
  return PLANS[planKey] || null;
}

function getPriceId(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceEnvVar] || null;
}

function getAllPlans() {
  return PLANS;
}

module.exports = { getPlanConfig, getPriceId, getAllPlans };
```

---

## Task C — Stripe webhook handler

Create `services/passportr/app/api/stripe/webhook/route.js`:

```js
export const runtime = 'nodejs';

const Stripe = require('stripe');
const db = require('../../../../lib/db');
const { getPlanConfig } = require('../../../../lib/plans');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const planKey = session.metadata?.plan_key;

        if (!userId || !planKey) break;

        const planConfig = getPlanConfig(planKey);
        if (!planConfig) break;

        const isSingle = planConfig.isSingle;
        const now = new Date();
        const periodEnd = isSingle
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          : null;

        if (isSingle) {
          await db.query(
            `UPDATE organizer_profiles
             SET plan = $1,
                 tier = $2,
                 max_hops = 1,
                 hops_used_this_period = 0,
                 period_start = NOW(),
                 period_end = $3,
                 stripe_customer_id = $4,
                 subscription_status = 'single',
                 single_hop_credit = $5,
                 single_hop_purchased_at = NOW(),
                 single_hop_expires_at = $3,
                 updated_at = NOW()
             WHERE user_id = $6`,
            [planKey, planConfig.tier, periodEnd, session.customer, planConfig.amount, userId]
          );
        } else {
          // Subscription — period dates come from invoice.paid
          await db.query(
            `UPDATE organizer_profiles
             SET plan = $1,
                 tier = $2,
                 max_hops = $3,
                 stripe_customer_id = $4,
                 stripe_subscription_id = $5,
                 subscription_status = 'active',
                 updated_at = NOW()
             WHERE user_id = $6`,
            [
              planKey,
              planConfig.tier,
              planConfig.maxHops,
              session.customer,
              session.subscription,
              userId,
            ]
          );
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        const result = await db.query(
          'SELECT * FROM organizer_profiles WHERE stripe_subscription_id = $1',
          [invoice.subscription]
        );
        if (result.rows.length === 0) break;

        const profile = result.rows[0];
        const planConfig = getPlanConfig(profile.plan);

        await db.query(
          `UPDATE organizer_profiles
           SET subscription_status = 'active',
               hops_used_this_period = 0,
               period_start = TO_TIMESTAMP($1),
               period_end = TO_TIMESTAMP($2),
               updated_at = NOW()
           WHERE stripe_subscription_id = $3`,
          [
            invoice.period_start,
            invoice.period_end,
            invoice.subscription,
          ]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;

        const result = await db.query(
          'SELECT * FROM organizer_profiles WHERE stripe_subscription_id = $1',
          [sub.id]
        );
        if (result.rows.length === 0) break;

        const stripeStatus = sub.status;
        const dbStatus = stripeStatus === 'active' ? 'active'
          : stripeStatus === 'past_due' ? 'past_due'
          : stripeStatus === 'canceled' ? 'canceled'
          : 'inactive';

        await db.query(
          `UPDATE organizer_profiles
           SET subscription_status = $1,
               updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [dbStatus, sub.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;

        await db.query(
          `UPDATE organizer_profiles
           SET subscription_status = 'canceled',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
```

---

## Verification Checklist

- [ ] Stripe products and prices created in dashboard with correct metadata
- [ ] All 8 price env vars filled in Railway
- [ ] `STRIPE_WEBHOOK_SECRET` filled in Railway
- [ ] Stripe webhook endpoint registered pointing to `/api/stripe/webhook`
- [ ] `stripe` in `package.json` dependencies
- [ ] `lib/plans.js` created with all 8 plan configurations
- [ ] `api/stripe/webhook/route.js` handles all 4 event types
- [ ] Webhook verifies Stripe signature before processing
- [ ] No other files modified
