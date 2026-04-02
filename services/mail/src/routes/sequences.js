const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /sequences/enroll
// Body: { product, sequenceName, email, data }
router.post('/enroll', async (req, res) => {
  const { product, sequenceName, email, data = {} } = req.body;

  const seq = await pool.query(
    `SELECT id, steps FROM sequences WHERE product = $1 AND name = $2 AND active = true`,
    [product, sequenceName]
  );

  if (seq.rows.length === 0) {
    return res.status(404).json({ error: 'Sequence not found' });
  }

  const sequence = seq.rows[0];
  const steps = sequence.steps;
  const firstStep = steps[0];

  if (!firstStep) {
    return res.json({ status: 'no_steps' });
  }

  // Calculate next send time
  const nextSendAt = firstStep.delay_hours
    ? new Date(Date.now() + firstStep.delay_hours * 60 * 60 * 1000)
    : new Date();

  await pool.query(
    `INSERT INTO sequence_enrollments (sequence_id, email, current_step, next_send_at, data)
     VALUES ($1, $2, 0, $3, $4)
     ON CONFLICT (sequence_id, email) DO NOTHING`,
    [sequence.id, email.toLowerCase(), nextSendAt, JSON.stringify(data)]
  );

  return res.json({ status: 'enrolled' });
});

// POST /sequences/event
// Body: { product, event, email, data }
// Enrolls email in all sequences triggered by this event
router.post('/event', async (req, res) => {
  const { product, event, email, data = {} } = req.body;

  const sequences = await pool.query(
    `SELECT id, steps FROM sequences WHERE product = $1 AND trigger_event = $2 AND active = true`,
    [product, event]
  );

  const enrolled = [];
  for (const seq of sequences.rows) {
    const firstStep = seq.steps[0];
    if (!firstStep) continue;

    const nextSendAt = firstStep.delay_hours
      ? new Date(Date.now() + firstStep.delay_hours * 60 * 60 * 1000)
      : new Date();

    await pool.query(
      `INSERT INTO sequence_enrollments (sequence_id, email, current_step, next_send_at, data)
       VALUES ($1, $2, 0, $3, $4)
       ON CONFLICT (sequence_id, email) DO NOTHING`,
      [seq.id, email.toLowerCase(), nextSendAt, JSON.stringify(data)]
    );
    enrolled.push(seq.id);
  }

  return res.json({ status: 'enrolled', sequences: enrolled.length });
});

// POST /sequences/unenroll
// Body: { product, sequenceName, email }
router.post('/unenroll', async (req, res) => {
  const { product, sequenceName, email } = req.body;

  await pool.query(
    `UPDATE sequence_enrollments se
     SET unenrolled = true
     FROM sequences s
     WHERE se.sequence_id = s.id
       AND s.product = $1
       AND s.name = $2
       AND se.email = $3`,
    [product, sequenceName, email.toLowerCase()]
  );

  return res.json({ status: 'unenrolled' });
});

// POST /sequences (create or update a sequence)
router.post('/', async (req, res) => {
  const { product, name, triggerEvent, steps } = req.body;

  await pool.query(
    `INSERT INTO sequences (product, name, trigger_event, steps)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (product, name) DO UPDATE SET
       trigger_event = excluded.trigger_event,
       steps = excluded.steps`,
    [product, name, triggerEvent, JSON.stringify(steps)]
  );

  return res.json({ status: 'saved' });
});

module.exports = router;
