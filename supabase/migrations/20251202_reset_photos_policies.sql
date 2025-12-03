-- Reset photos RLS policies to minimal, permissive set

-- Drop all existing policies on photos
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'photos' LOOP
    EXECUTE format('DROP POLICY %I ON public.photos', pol.policyname);
  END LOOP;
END $$;

-- Recreate policies
-- SELECT: anyone can view approved photos
CREATE POLICY "Anyone can view approved photos" ON photos
  FOR SELECT
  USING (status = 'approved');

-- INSERT: allow anon and authenticated to insert any row
CREATE POLICY "Anon can insert photos" ON photos
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert photos" ON photos
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: event creators can moderate photos (keep semantics)
CREATE POLICY "Event creators can moderate photos" ON photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = photos.event_id 
      AND events.creator_id = auth.uid()::text
    )
  );
