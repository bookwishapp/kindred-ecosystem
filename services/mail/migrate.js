require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      template TEXT NOT NULL,
      to_email TEXT NOT NULL,
      from_email TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      ses_message_id TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS unsubscribes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      email TEXT NOT NULL,
      unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(product, email)
    );

    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      template TEXT NOT NULL,
      to_email TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      send_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      name TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      steps JSONB NOT NULL DEFAULT '[]',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(product, name)
    );

    CREATE TABLE IF NOT EXISTS sequence_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_id UUID REFERENCES sequences(id),
      email TEXT NOT NULL,
      current_step INTEGER DEFAULT 0,
      next_send_at TIMESTAMPTZ,
      completed BOOLEAN DEFAULT false,
      unenrolled BOOLEAN DEFAULT false,
      data JSONB DEFAULT '{}',
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(sequence_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_emails_send_at
      ON scheduled_emails(send_at) WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_send
      ON sequence_enrollments(next_send_at)
      WHERE completed = false AND unenrolled = false;

    CREATE INDEX IF NOT EXISTS idx_email_log_product
      ON email_log(product, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_unsubscribes_lookup
      ON unsubscribes(product, email);
  `);

  console.log('Migrations complete');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
