ALTER TABLE hops
  ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS drawing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS drawing_winners_count INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS drawing_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drawing_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hop_id UUID NOT NULL REFERENCES hops(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES drawing_prizes(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE(hop_id, participant_id)
);

ALTER TABLE participants ADD COLUMN IF NOT EXISTS email TEXT;
