-- Normalize INSERT policies for photos to allow client writes

-- Drop previous INSERT policies to avoid ambiguity
DROP POLICY IF EXISTS "Anon can insert photos" ON photos;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON photos;

-- Create a catch-all INSERT policy (applies to all roles)
CREATE POLICY "Anyone can insert photos" ON photos
  FOR INSERT
  WITH CHECK (true);
