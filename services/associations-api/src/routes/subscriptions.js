const express = require('express');
const router = express.Router();
const db = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        await db.query(
          `UPDATE users
           SET subscription_status = 'active',
               stripe_customer_id = $1,
               stripe_subscription_id = $2,
               subscribed_at = NOW(),
               updated_at = NOW()
           WHERE user_id = $3`,
          [session.customer, session.subscription, userId]
        );
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        await db.query(
          `UPDATE users
           SET subscription_status = 'active',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [invoice.subscription]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'canceled' ? 'canceled'
          : 'trial';

        await db.query(
          `UPDATE users
           SET subscription_status = $1,
               updated_at = NOW()
           WHERE stripe_subscription_id = $2`,
          [status, sub.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        await db.query(
          `UPDATE users
           SET subscription_status = 'canceled',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [event.data.object.id]
        );
        break;
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Handler failed' });
  }
});

// POST /stripe/portal
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT stripe_customer_id FROM users WHERE user_id = $1',
      [req.user.sub]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: 'associations://billing/return',
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;