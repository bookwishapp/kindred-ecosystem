-- Drop foreign key constraint on linked_profile_id
-- The profiles table has been moved to the auth service database
-- so this foreign key is no longer valid
ALTER TABLE kin_records DROP CONSTRAINT IF EXISTS kin_records_linked_profile_id_fkey;