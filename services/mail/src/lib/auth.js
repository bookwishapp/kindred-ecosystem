const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Resolve emails for a list of user_subs by calling auth service
async function resolveEmails(userSubs) {
  if (!userSubs.length) return [];

  const response = await fetch(
    `${process.env.AUTH_BASE_URL}/internal/users/emails`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ user_subs: userSubs }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to resolve emails from auth service');
  }

  const data = await response.json();
  // Returns [{ user_sub, email }]
  return data.users;
}

// Get all active subscribers for a product with their emails
async function getProductSubscribers(product) {
  const result = await pool.query(
    `SELECT user_sub FROM subscriptions
     WHERE product = $1 AND status = 'active'`,
    [product]
  );

  const userSubs = result.rows.map(r => r.user_sub);
  if (!userSubs.length) return [];

  return resolveEmails(userSubs);
}

module.exports = { resolveEmails, getProductSubscribers };
