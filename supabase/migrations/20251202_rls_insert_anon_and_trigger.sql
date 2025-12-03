-- Allow anon inserts for events and photos and create auto-approve trigger

-- Events: allow inserts by anon role
CREATE POLICY "Anon can insert events" ON events
  FOR INSERT TO anon
  WITH CHECK (true);

-- Photos: allow inserts by anon role
CREATE POLICY "Anon can insert photos" ON photos
  FOR INSERT TO anon
  WITH CHECK (true);

-- Moderation queue: allow inserts by anon role
CREATE POLICY "Anon can insert moderation queue" ON moderation_queues
  FOR INSERT TO anon
  WITH CHECK (true);

-- Auto-approve photos when event has moderation disabled
CREATE OR REPLACE FUNCTION auto_approve_photo_if_no_moderation()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = NEW.event_id AND e.moderation_enabled = false
  ) THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS photos_auto_approve ON photos;
CREATE TRIGGER photos_auto_approve
BEFORE INSERT ON photos
FOR EACH ROW
EXECUTE FUNCTION auto_approve_photo_if_no_moderation();

