export const runtime = 'nodejs';

const Stripe = require('stripe');
const db = require('../../../../lib/db');
const { requireAuth } = require('../../../../lib/auth');

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

    const profileResult = await db.query(
      'SELECT stripe_customer_id FROM organizer_profiles WHERE user_id = $1',
      [user.sub]
    );

    const profile = profileResult.rows[0];
    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://passportr.io';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/organize/billing`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Portal error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
