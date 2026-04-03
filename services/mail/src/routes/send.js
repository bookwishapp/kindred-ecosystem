const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { sendEmail } = require('../ses');
const { getProductSubscribers } = require('../lib/auth');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FROM_ADDRESSES = {
  'terryheath': { email: 'newsletter@terryheath.com', name: 'Terry @ Sinclair Inlet Book Co.' },
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
    rendered = await tmpl.render({ ...data, email: to });
  } catch (err) {
    console.error('Template render error:', err.message, err.stack);
    return res.status(400).json({ error: `Template error: ${err.message}` });
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
    console.error('SES send error:', err.message, err.stack);
    await pool.query(
      `UPDATE email_log SET status = 'failed', error = $1 WHERE id = $2`,
      [err.message, logId]
    );
    return res.status(500).json({ error: 'Send failed', message: err.message });
  }
});

// POST /send/bulk
// Body: { product, template, recipients: [{ email, data }], commonData }
router.post('/bulk', async (req, res) => {
  const { product, template, recipients, commonData = {} } = req.body;

  if (!product || !template || !recipients?.length) {
    return res.status(400).json({ error: 'product, template, and recipients are required' });
  }

  const from = FROM_ADDRESSES[product];
  if (!from) {
    return res.status(400).json({ error: `Unknown product: ${product}` });
  }

  // Load template once
  let tmpl;
  try {
    tmpl = require(`../../dist/templates/${template}`);
  } catch (err) {
    return res.status(400).json({ error: `Template not found: ${template}` });
  }

  // Return immediately — process in background
  res.json({ status: 'queued', count: recipients.length });

  // Process sends
  let sentCount = 0;
  const errors = [];

  for (const recipient of recipients) {
    const { email, data: recipientData = {} } = recipient;

    try {
      // Check unsubscribe
      const unsub = await pool.query(
        'SELECT id FROM unsubscribes WHERE product = $1 AND email = $2',
        [product, email.toLowerCase()]
      );
      if (unsub.rows.length > 0) continue;

      const mergedData = { ...commonData, ...recipientData, email };
      const rendered = await tmpl.render(mergedData);

      const logResult = await pool.query(
        `INSERT INTO email_log (product, template, to_email, from_email, sender_name, subject, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
        [product, template, email, from.email, from.name, rendered.subject]
      );
      const logId = logResult.rows[0].id;

      const messageId = await sendEmail({
        to: email,
        from: from.email,
        senderName: from.name,
        subject: rendered.subject,
        html: rendered.html,
      });

      await pool.query(
        `UPDATE email_log SET status = 'sent', ses_message_id = $1, sent_at = NOW() WHERE id = $2`,
        [messageId, logId]
      );

      sentCount++;
    } catch (err) {
      errors.push({ email, error: err.message });
      await pool.query(
        `INSERT INTO email_log (product, template, to_email, from_email, sender_name, subject, status, error)
         VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7)`,
        [product, template, email, from.email, from.name, 'unknown', err.message]
      );
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 10));
  }
});

// POST /send/bulk-subscribed
// Sends to all active subscribers of a product
// Body: { product, template, commonData }
router.post('/bulk-subscribed', async (req, res) => {
  const { product, template, commonData = {} } = req.body;

  if (!product || !template) {
    return res.status(400).json({ error: 'product and template are required' });
  }

  const from = FROM_ADDRESSES[product];
  if (!from) {
    return res.status(400).json({ error: `Unknown product: ${product}` });
  }

  // Load template
  let tmpl;
  try {
    tmpl = require(`../../dist/templates/${template}`);
  } catch (err) {
    return res.status(400).json({ error: `Template not found: ${template}` });
  }

  // Resolve subscribers
  let subscribers;
  try {
    subscribers = await getProductSubscribers(product);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve subscribers' });
  }

  if (!subscribers.length) {
    return res.json({ status: 'no_subscribers', count: 0 });
  }

  // Return immediately — process in background
  res.json({ status: 'queued', count: subscribers.length });

  // Process sends
  for (const { user_sub, email } of subscribers) {
    try {
      // Check legacy unsubscribes table too
      const unsub = await pool.query(
        'SELECT id FROM unsubscribes WHERE product = $1 AND email = $2',
        [product, email.toLowerCase()]
      );
      if (unsub.rows.length > 0) continue;

      const mergedData = { ...commonData, email };
      const rendered = await tmpl.render(mergedData);

      const logResult = await pool.query(
        `INSERT INTO email_log (product, template, to_email, from_email, sender_name, subject, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
        [product, template, email, from.email, from.name, rendered.subject]
      );
      const logId = logResult.rows[0].id;

      const messageId = await sendEmail({
        to: email,
        from: from.email,
        senderName: from.name,
        subject: rendered.subject,
        html: rendered.html,
      });

      await pool.query(
        `UPDATE email_log SET status = 'sent', ses_message_id = $1, sent_at = NOW() WHERE id = $2`,
        [messageId, logId]
      );
    } catch (err) {
      await pool.query(
        `INSERT INTO email_log (product, template, to_email, from_email, sender_name, subject, status, error)
         VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7)`,
        [product, template, email, from.email, from.name, 'unknown', err.message]
      );
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }
});

module.exports = router;
