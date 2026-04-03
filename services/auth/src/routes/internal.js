const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { v4: uuidv4 } = require('uuid');

// POST /internal/users/emails
// Resolve emails for a list of user_subs
// Body: { user_subs: [string] }
router.post('/users/emails', async (req, res) => {
  const { user_subs } = req.body;

  if (!user_subs || !Array.isArray(user_subs) || !user_subs.length) {
    return res.status(400).json({ error: 'user_subs array is required' });
  }

  // Limit batch size
  if (user_subs.length > 1000) {
    return res.status(400).json({ error: 'Maximum 1000 user_subs per request' });
  }

  const result = await pool.query(
    `SELECT id as user_sub, email
     FROM users
     WHERE id = ANY($1::uuid[])`,
    [user_subs]
  );

  return res.json({ users: result.rows });
});

// POST /internal/users/find-or-create
// Find a user by email, or create one if they don't exist
// Body: { email }
// Returns: { user_sub, email, created }
router.post('/users/find-or-create', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Try to find existing user
  const existing = await pool.query(
    'SELECT id as user_sub, email FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    return res.json({
      user_sub: existing.rows[0].user_sub,
      email: existing.rows[0].email,
      created: false,
    });
  }

  // Create new user
  const newUser = await pool.query(
    `INSERT INTO users (id, email, created_at)
     VALUES ($1, $2, NOW())
     RETURNING id as user_sub, email`,
    [uuidv4(), normalizedEmail]
  );

  return res.json({
    user_sub: newUser.rows[0].user_sub,
    email: newUser.rows[0].email,
    created: true,
  });
});

// GET /internal/users/:user_sub
// Get a single user by user_sub
router.get('/users/:user_sub', async (req, res) => {
  const { user_sub } = req.params;

  const result = await pool.query(
    'SELECT id as user_sub, email, created_at FROM users WHERE id = $1',
    [user_sub]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: result.rows[0] });
});

module.exports = router;
