-- Add bio, link, and isPrivate columns to users table
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN link TEXT;
ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0;
