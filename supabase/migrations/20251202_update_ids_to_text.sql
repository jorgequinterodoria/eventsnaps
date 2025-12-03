-- Migrate identity columns from UUID to TEXT to align with Clerk IDs
-- and fix invalid input syntax errors when inserting non-UUID identifiers.

-- Drop policies first to allow altering dependent columns
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Creators can update their events" ON events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
DROP POLICY IF EXISTS "Event creators can moderate photos" ON photos;
DROP POLICY IF EXISTS "Anyone can view approved photos" ON photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON photos;
DROP POLICY IF EXISTS "Event creators can view moderation queue" ON moderation_queues;
DROP POLICY IF EXISTS "Event creators can update moderation queue" ON moderation_queues;
DROP POLICY IF EXISTS "Event creators can create moderation actions" ON moderation_actions;
DROP POLICY IF EXISTS "Anyone can view moderation actions" ON moderation_actions;

-- Alter column types to TEXT
ALTER TABLE events
  ALTER COLUMN creator_id TYPE TEXT USING creator_id::TEXT;

ALTER TABLE photos
  ALTER COLUMN uploaded_by TYPE TEXT USING uploaded_by::TEXT;

ALTER TABLE moderation_actions
  ALTER COLUMN moderator_id TYPE TEXT USING moderator_id::TEXT;

-- Recreate policies, preserving existing semantics and casting auth.uid() to text where needed
CREATE POLICY "Anyone can view active events" ON events
  FOR SELECT USING (status = 'active' AND expires_at > NOW());

CREATE POLICY "Creators can update their events" ON events
  FOR UPDATE USING (auth.uid()::text = creator_id);

CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view approved photos" ON photos
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can upload photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Event creators can moderate photos" ON photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = photos.event_id 
      AND events.creator_id = auth.uid()::text
    )
  );

CREATE POLICY "Event creators can view moderation queue" ON moderation_queues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos 
      JOIN events ON events.id = photos.event_id
      WHERE photos.id = moderation_queues.photo_id 
      AND events.creator_id = auth.uid()::text
    )
  );

CREATE POLICY "Event creators can update moderation queue" ON moderation_queues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM photos 
      JOIN events ON events.id = photos.event_id
      WHERE photos.id = moderation_queues.photo_id 
      AND events.creator_id = auth.uid()::text
    )
  );

CREATE POLICY "Event creators can create moderation actions" ON moderation_actions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view moderation actions" ON moderation_actions
  FOR SELECT USING (true);
