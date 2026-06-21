-- =====================================================
-- Instagram Backgrounds Storage Bucket Setup
-- =====================================================
-- This script creates the Supabase Storage bucket for Instagram background images
-- and configures the necessary policies for public access.

-- Create storage bucket for Instagram backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-backgrounds', 'instagram-backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow public read access to all background images
CREATE POLICY "Public read access for backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-backgrounds');

-- Policy: Allow authenticated users to upload backgrounds
CREATE POLICY "Authenticated users can upload backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instagram-backgrounds'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own backgrounds
CREATE POLICY "Authenticated users can update backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'instagram-backgrounds'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their own backgrounds
CREATE POLICY "Authenticated users can delete backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'instagram-backgrounds'
  AND auth.role() = 'authenticated'
);

-- Note: Since we're using browser_user_id (not Supabase auth), the policies above
-- will allow any authenticated user to manage backgrounds. In production, you may
-- want to implement more granular RLS based on user_id matching.

-- Optional: Create a storage bucket for generated Instagram posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('instagram-posts', 'instagram-posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow public read access to all post images
CREATE POLICY "Public read access for posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-posts');

-- Policy: Allow authenticated users to upload post images
CREATE POLICY "Authenticated users can upload posts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instagram-posts'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update post images
CREATE POLICY "Authenticated users can update posts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'instagram-posts'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete post images
CREATE POLICY "Authenticated users can delete posts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'instagram-posts'
  AND auth.role() = 'authenticated'
);
