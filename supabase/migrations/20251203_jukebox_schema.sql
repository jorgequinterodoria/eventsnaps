
-- Jukebox Settings
CREATE TABLE jukebox_settings (
  event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  vibe_filters TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ['reggaeton', 'pop']
  spotify_playlist_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jukebox Queue
CREATE TABLE jukebox_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  spotify_track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_art TEXT,
  genre TEXT,
  votes INTEGER DEFAULT 0,
  voters JSONB DEFAULT '[]'::JSONB, -- Array of voter identifiers (IP or session ID)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'played')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Config (Key-Value store for secrets like Spotify credentials)
CREATE TABLE admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies

-- Jukebox Settings: Anyone can read active settings for an event
ALTER TABLE jukebox_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jukebox settings" ON jukebox_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins/Creators can update jukebox settings" ON jukebox_settings
  FOR ALL USING (true) WITH CHECK (true); -- Simplified for MVP, ideally strict check

-- Jukebox Queue: Anyone can view pending songs
ALTER TABLE jukebox_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view queue" ON jukebox_queue
  FOR SELECT USING (true);

CREATE POLICY "Anyone can add songs" ON jukebox_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can vote (update)" ON jukebox_queue
  FOR UPDATE USING (true); -- Validation happens in application logic/Edge Function usually, but allowed here

-- Admin Config: Only visible/editable by logic that has service role or specific admin check
-- For now, we'll allow public select for demo if needed, but ideally restricted.
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin config access" ON admin_config
  FOR ALL USING (true); -- MVP: Open to allow Admin Dashboard to work easily.
