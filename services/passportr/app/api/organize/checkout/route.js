export const runtime = 'nodejs';

const Stripe = require('stripe');
const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');
const { getPlanConfig, getPriceId } = require('../../../../lib/plans');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req) {
  try {
    const stripe = getStripe();
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
