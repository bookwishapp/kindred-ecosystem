CREATE TABLE IF NOT EXISTS participant_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  zip_code VARCHAR(10),
  opt_in BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_in_hop_id UUID REFERENCES hops(id) ON DELETE SET NULL,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token VARCHAR(40) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS participant_preferences_user_id_idx ON participant_preferences(user_id);
CREATE INDEX IF NOT EXISTS participant_preferences_unsubscribe_token_idx ON participant_preferences(unsubscribe_token);
