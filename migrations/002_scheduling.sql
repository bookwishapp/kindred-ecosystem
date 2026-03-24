-- Add scheduled_at column for post scheduling
ALTER TABLE posts
ADD COLUMN scheduled_at TIMESTAMPTZ;

-- Create index for efficient scheduling queries
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at, status)
WHERE status = 'scheduled';