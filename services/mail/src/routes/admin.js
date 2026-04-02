const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /admin/log?product=associations&limit=50
router.get('/log', async (req, res) => {
  const { product, limit = 50, offset = 0 } = req.query;

  const query = product
    ? `SELECT * FROM email_log WHERE product = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
    : `SELECT * FROM email_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

  const params = product ? [product, limit, offset] : [limit, offset];
  const result = await pool.query(query, params);
  return res.json(result.rows);
});

// GET /admin/unsubscribes?product=associations
router.get('/unsubscribes', async (req, res) => {
  const { product } = req.query;
  const query = product
    ? `SELECT * FROM unsubscribes WHERE product = $1 ORDER BY unsubscribed_at DESC`
    : `SELECT * FROM unsubscribes ORDER BY unsubscribed_at DESC`;
  const result = await pool.query(query, product ? [product] : []);
  return res.json(result.rows);
});

// GET /admin/sequences?product=associations
router.get('/sequences', async (req, res) => {
  const { product } = req.query;
  const query = product
    ? `SELECT s.*, COUNT(se.id) as enrolled_count
       FROM sequences s
       LEFT JOIN sequence_enrollments se ON se.sequence_id = s.id AND se.unenrolled = false
       WHERE s.product = $1
       GROUP BY s.id ORDER BY s.created_at DESC`
    : `SELECT s.*, COUNT(se.id) as enrolled_count
       FROM sequences s
       LEFT JOIN sequence_enrollments se ON se.sequence_id = s.id AND se.unenrolled = false
       GROUP BY s.id ORDER BY s.created_at DESC`;
  const result = await pool.query(query, product ? [product] : []);
  return res.json(result.rows);
});

// GET /admin/stats
router.get('/stats', async (req, res) => {
  const result = await pool.query(`
    SELECT
      product,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) as total
    FROM email_log
    GROUP BY product
    ORDER BY product
  `);
  return res.json(result.rows);
});

module.exports = router;
