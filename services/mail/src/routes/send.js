const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { sendEmail } = require('../ses');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FROM_ADDRESSES = {
  'associations': { email: 'hello@dampconcrete.com', name: 'Associations' },
  'passportr': { email: 'hello@dampconcrete.com', name: 'Passportr' },
  'kindred': { email: 'hello@dampconcrete.com', name: 'Kindred' },
  'analoglist': { email: 'hello@dampconcrete.com', name: 'AnalogList' },
  'northstarpostal': { email: 'hello@dampconcrete.com', name: 'North Star Postal' },
  'bookwish': { email: 'hello@dampconcrete.com', name: 'BookWish' },
};

// POST /send
// Body: { product, template, to, data, senderName (optional override) }
router.post('/', async (req, res) => {
  const { product, template, to, data = {}, senderName } = req.body;

  if (!product || !template || !to) {
    return res.status(400).json({ error: 'product, template, and to are required' });
  }

  const from = FROM_ADDRESSES[product];
  if (!from) {
    return res.status(400).json({ error: `Unknown product: ${product}` });
  }

  // Check unsubscribe
  const unsub = await pool.query(
    'SELECT id FROM unsubscribes WHERE product = $1 AND email = $2',
    [product, to.toLowerCase()]
  );
  if (unsub.rows.length > 0) {
    return res.json({ status: 'unsubscribed', message: 'Recipient has unsubscribed' });
  }

  // Load and render template
  let rendered;
  try {
    const tmpl = require(`../../dist/templates/${template}`);
    rendered = await tmpl.render(data);
  } catch (err) {
    return res.status(400).json({ error: `Template not found: ${template}` });
  }

  // Log pending
  const logResult = await pool.query(
    `INSERT INTO email_log (product, template, to_email, from_email, sender_name, subject, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
    [product, template, to, from.email, senderName || from.name, rendered.subject]
  );
  const logId = logResult.rows[0].id;

  // Send
  try {
    const messageId = await sendEmail({
      to,
      from: from.email,
      senderName: senderName || from.name,
      subject: rendered.subject,
      html: rendered.html,
    });

    await pool.query(
      `UPDATE email_log SET status = 'sent', ses_message_id = $1, sent_at = NOW() WHERE id = $2`,
      [messageId, logId]
    );

    return res.json({ status: 'sent', messageId, logId });
  } catch (err) {
    await pool.query(
      `UPDATE email_log SET status = 'failed', error = $1 WHERE id = $2`,
      [err.message, logId]
    );
    console.error('Send failed:', err.message);
    return res.status(500).json({ error: 'Send failed', message: err.message });
  }
});

module.exports = router;
