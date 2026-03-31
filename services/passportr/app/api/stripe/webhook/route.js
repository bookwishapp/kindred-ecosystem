export const runtime = 'nodejs';

const Stripe = require('stripe');
const db = require('../../../../lib/db');
const { getPlanConfig } = require('../../../../lib/plans');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req) {
  const stripe = getStripe();
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
