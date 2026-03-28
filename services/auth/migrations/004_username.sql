-- Add username to profiles table
ALTER TABLE profiles
ADD COLUMN username VARCHAR(20) UNIQUE;

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON profiles(username);