-- Replace generic INSERT policy with explicit role-targeted policies

DROP POLICY IF EXISTS "Anyone can insert photos" ON photos;

CREATE POLICY "Anon can insert photos" ON photos
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert photos" ON photos
  FOR INSERT TO authenticated
  WITH CHECK (true);

