CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE hops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id TEXT NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  completion_rule JSONB NOT NULL DEFAULT '{"type": "all"}',
  stamp_cutoff_date DATE NOT NULL,
  redeem_cutoff_date DATE NOT NULL,
  coupon_expiry_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  reward_description TEXT,
  stamp_token VARCHAR(20) UNIQUE NOT NULL,
  redeem_token VARCHAR(20) UNIQUE NOT NULL,
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(hop_id, user_id)
);

CREATE TABLE stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  stamped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, venue_id)
);

CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  coupon_code VARCHAR(20) UNIQUE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  UNIQUE(participant_id, venue_id)
);
