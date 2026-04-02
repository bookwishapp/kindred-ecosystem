const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /unsubscribe/:product/:email
router.get('/:product/:email', async (req, res) => {
  const { product, email } = req.params;

  await pool.query(
    `INSERT INTO unsubscribes (product, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [product, email.toLowerCase()]
  );

  // Return a simple confirmation page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Unsubscribed</title>
      <style>
        body { font-family: Georgia, serif; background: #F5F3EF; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { max-width: 400px; text-align: center; padding: 48px 32px; }
        h1 { font-size: 24px; font-weight: 400; color: #2A2825; margin-bottom: 16px; }
        p { font-size: 16px; color: #6A6660; line-height: 1.7; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>You've been unsubscribed.</h1>
        <p>You won't receive any more ${product} emails at this address.</p>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
