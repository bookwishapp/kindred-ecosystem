export const runtime = 'nodejs';

import Stripe from 'stripe';

export async function POST(request) {
  // Initialize Stripe inside the handler to avoid build-time errors
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    // Parse JSON body
    const body = await request.json();
    const { amount, mode } = body;

    // Validate inputs
    if (!amount || !Number.isInteger(amount) || amount <= 0) {
      return Response.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!mode || !['payment', 'subscription'].includes(mode)) {
      return Response.json(
        { error: 'Mode must be either "payment" or "subscription"' },
        { status: 400 }
      );
    }

    // Build line item based on mode
    const lineItem = {
      price_data: {
        currency: 'usd',
        unit_amount: amount * 100, // Convert dollars to cents
        product_data: {
          name: 'Support Small Things',
        },
      },
      quantity: 1,
    };

    // Add recurring for subscription mode
    if (mode === 'subscription') {
      lineItem.price_data.recurring = {
        interval: 'month',
      };
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: mode,
      line_items: [lineItem],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}