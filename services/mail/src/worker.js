const cron = require('node-cron');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Process scheduled emails and sequence steps every minute
cron.schedule('* * * * *', async () => {
  await processScheduledEmails();
  await processSequenceSteps();
});

async function processScheduledEmails() {
  const pending = await pool.query(
    `SELECT * FROM scheduled_emails
     WHERE status = 'pending' AND send_at <= NOW()
     LIMIT 10`
  );

  for (const email of pending.rows) {
    // Mark as processing
    await pool.query(
      `UPDATE scheduled_emails SET status = 'processing' WHERE id = $1`,
      [email.id]
    );

    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 3000}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
        },
        body: JSON.stringify({
          product: email.product,
          template: email.template,
          to: email.to_email,
          data: email.data,
        }),
      });

      await pool.query(
        `UPDATE scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [email.id]
      );
    } catch (err) {
      await pool.query(
        `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
        [email.id]
      );
      console.error('Scheduled email failed:', err.message);
    }
  }
}

async function processSequenceSteps() {
  const due = await pool.query(
    `SELECT se.*, s.product, s.steps, s.name as sequence_name
     FROM sequence_enrollments se
     JOIN sequences s ON s.id = se.sequence_id
     WHERE se.completed = false
       AND se.unenrolled = false
       AND se.next_send_at <= NOW()
     LIMIT 10`
  );

  for (const enrollment of due.rows) {
    const steps = enrollment.steps;
    const step = steps[enrollment.current_step];

    if (!step) {
      await pool.query(
        `UPDATE sequence_enrollments SET completed = true WHERE id = $1`,
        [enrollment.id]
      );
      continue;
    }

    try {
      await fetch(`http://localhost:${process.env.PORT || 3000}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mail-secret': process.env.MAIL_SERVICE_SECRET,
        },
        body: JSON.stringify({
          product: enrollment.product,
          template: step.template,
          to: enrollment.email,
          data: { ...enrollment.data, ...step.data },
        }),
      });

      const nextStep = steps[enrollment.current_step + 1];
      if (nextStep) {
        const nextSendAt = new Date(
          Date.now() + (nextStep.delay_hours || 0) * 60 * 60 * 1000
        );
        await pool.query(
          `UPDATE sequence_enrollments
           SET current_step = $1, next_send_at = $2
           WHERE id = $3`,
          [enrollment.current_step + 1, nextSendAt, enrollment.id]
        );
      } else {
        await pool.query(
          `UPDATE sequence_enrollments SET completed = true WHERE id = $1`,
          [enrollment.id]
        );
      }
    } catch (err) {
      console.error('Sequence step failed:', err.message);
    }
  }
}

module.exports = { processScheduledEmails, processSequenceSteps };
