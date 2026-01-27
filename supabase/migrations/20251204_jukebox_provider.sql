
-- Add provider column to jukebox_settings
ALTER TABLE jukebox_settings 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'spotify' CHECK (provider IN ('spotify', 'youtube'));

-- Add provider column to jukebox_queue
ALTER TABLE jukebox_queue 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'spotify' CHECK (provider IN ('spotify', 'youtube'));

-- Rename spotify_track_id to track_id (generic) - keeping spotify_track_id as alias for backward compatibility if needed, 
-- but ideally we migrate data. For now, we'll just add track_id and migrate data if any exists.
ALTER TABLE jukebox_queue 
ADD COLUMN IF NOT EXISTS track_id TEXT;

-- Update existing rows to use spotify_track_id as track_id
UPDATE jukebox_queue SET track_id = spotify_track_id WHERE track_id IS NULL;

-- Make track_id NOT NULL after backfill
ALTER TABLE jukebox_queue ALTER COLUMN track_id SET NOT NULL;
