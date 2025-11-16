-- Migration: add user_id to potm_votes and unique index (PostgreSQL/Supabase)
ALTER TABLE potm_votes ADD COLUMN IF NOT EXISTS user_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS potm_votes_user_id_uniq ON potm_votes(user_id);

-- Optional: backfill user_id if you have mapping (left blank here)
-- UPDATE potm_votes SET user_id = ...;
