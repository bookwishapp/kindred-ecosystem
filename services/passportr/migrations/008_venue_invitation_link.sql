ALTER TABLE venues ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES venue_invitations(id);
