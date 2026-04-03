const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /subscriptions/subscribe
// Body: { user_sub, product }
router.post('/subscribe', async (req, res) => {
  const { user_sub, product } = req.body;
  if (!user_sub || !product) {
    return res.status(400).json({ error: 'user_sub and product are required' });
  }

  await pool.query(
    `INSERT INTO subscriptions (user_sub, product, status, opted_in_at)
     VALUES ($1, $2, 'active', NOW())
     ON CONFLICT (user_sub, product) DO UPDATE
       SET status = 'active', opted_in_at = NOW(), opted_out_at = NULL`,
    [user_sub, product]
  );

  return res.json({ status: 'subscribed' });
});

// POST /subscriptions/unsubscribe
// Body: { user_sub, product }
router.post('/unsubscribe', async (req, res) => {
  const { user_sub, product } = req.body;
  if (!user_sub || !product) {
    return res.status(400).json({ error: 'user_sub and product are required' });
  }

  await pool.query(
    `INSERT INTO subscriptions (user_sub, product, status, opted_out_at)
     VALUES ($1, $2, 'inactive', NOW())
     ON CONFLICT (user_sub, product) DO UPDATE
       SET status = 'inactive', opted_out_at = NOW()`,
    [user_sub, product]
  );

  return res.json({ status: 'unsubscribed' });
});

// GET /subscriptions/:user_sub
// Returns all subscriptions for a user
router.get('/:user_sub', async (req, res) => {
  const { user_sub } = req.params;
  const result = await pool.query(
    `SELECT product, status, opted_in_at, opted_out_at
     FROM subscriptions
     WHERE user_sub = $1
     ORDER BY opted_in_at DESC`,
    [user_sub]
  );
  return res.json({ subscriptions: result.rows });
});

// GET /subscriptions/product/:product
// Returns all active subscribers for a product (user_subs only)
router.get('/product/:product', async (req, res) => {
  const { product } = req.params;
  const result = await pool.query(
    `SELECT user_sub FROM subscriptions
     WHERE product = $1 AND status = 'active'`,
    [product]
  );
  return res.json({ subscribers: result.rows.map(r => r.user_sub) });
});

module.exports = router;
