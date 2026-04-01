CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  subscription_status VARCHAR(20) DEFAULT 'trial',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_words_used INTEGER DEFAULT 0,
  trial_exhausted_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX users_user_id_idx ON users(user_id);
CREATE INDEX users_stripe_customer_idx ON users(stripe_customer_id);