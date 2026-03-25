CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  birthday DATE,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_wishlist_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profile_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurs_annually BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kin_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('linked', 'local')),
  linked_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  local_name TEXT,
  local_photo_url TEXT,
  local_birthday DATE,
  position_override DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kin_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kin_record_id UUID REFERENCES kin_records(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurs_annually BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_kin_records_owner_user_id ON kin_records(owner_user_id);
CREATE INDEX idx_kin_records_linked_profile_id ON kin_records(linked_profile_id);
CREATE INDEX idx_profile_wishlist_links_profile_id ON profile_wishlist_links(profile_id);
CREATE INDEX idx_profile_dates_profile_id ON profile_dates(profile_id);
CREATE INDEX idx_kin_dates_kin_record_id ON kin_dates(kin_record_id);