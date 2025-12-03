DROP POLICY IF EXISTS "Authenticated users can upload photos" ON photos;
CREATE POLICY "Authenticated users can upload photos" ON photos
  FOR INSERT TO authenticated
  WITH CHECK (true);
