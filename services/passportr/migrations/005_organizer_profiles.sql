CREATE TABLE IF NOT EXISTS organizer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  organization TEXT,
  website TEXT,

  -- Plan
  -- Values: 'single_tier1', 'single_tier2', 'occasional_tier1', 'occasional_tier2',
  --         'regular_tier1', 'regular_tier2', 'unlimited_tier1', 'unlimited_tier2'
  plan VARCHAR(30),
  tier INTEGER DEFAULT 1,
  max_hops INTEGER,
  hops_used_this_period INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status VARCHAR(20) DEFAULT 'inactive',

  -- Single hop credit
  single_hop_credit INTEGER DEFAULT 0,
  single_hop_purchased_at TIMESTAMPTZ,
  single_hop_expires_at TIMESTAMPTZ,

  -- Nonprofit
  nonprofit_verified BOOLEAN DEFAULT false,
  nonprofit_pending BOOLEAN DEFAULT false,
  nonprofit_ein TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS organizer_profiles_user_id_idx ON organizer_profiles(user_id);
CREATE INDEX IF NOT EXISTS organizer_profiles_stripe_customer_idx ON organizer_profiles(stripe_customer_id);
