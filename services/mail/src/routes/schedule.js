const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /schedule
// Body: { product, template, to, data, send_at }
router.post('/', async (req, res) => {
  const { product, template, to, data = {}, send_at } = req.body;

  if (!product || !template || !to || !send_at) {
    return res.status(400).json({ error: 'product, template, to, and send_at are required' });
  }

  const result = await pool.query(
    `INSERT INTO scheduled_emails (product, template, to_email, data, send_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [product, template, to, JSON.stringify(data), send_at]
  );

  return res.json({ status: 'scheduled', id: result.rows[0].id });
});

// DELETE /schedule/:id — cancel a scheduled email
router.delete('/:id', async (req, res) => {
  await pool.query(
    `UPDATE scheduled_emails SET status = 'cancelled' WHERE id = $1 AND status = 'pending'`,
    [req.params.id]
  );
  return res.json({ status: 'cancelled' });
});

module.exports = router;
