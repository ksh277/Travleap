-- Add event date columns to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS event_start_date DATE,
ADD COLUMN IF NOT EXISTS event_end_date DATE,
ADD INDEX idx_event_dates (event_start_date, event_end_date);
