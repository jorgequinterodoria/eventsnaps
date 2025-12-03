-- Create Supabase Storage bucket 'photos' and policies for read/upload

-- Create bucket (public for reads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects
-- Allow anon and authenticated to read from 'photos'
DROP POLICY IF EXISTS "Anon can read photos bucket" ON storage.objects;
CREATE POLICY "Anon can read photos bucket" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Authenticated can read photos bucket" ON storage.objects;
CREATE POLICY "Authenticated can read photos bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photos');

-- Allow anon to upload into 'photos'
DROP POLICY IF EXISTS "Anon can upload to photos bucket" ON storage.objects;
CREATE POLICY "Anon can upload to photos bucket" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'photos');

-- Allow authenticated to upload into 'photos'
DROP POLICY IF EXISTS "Authenticated can upload to photos bucket" ON storage.objects;
CREATE POLICY "Authenticated can upload to photos bucket" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');
