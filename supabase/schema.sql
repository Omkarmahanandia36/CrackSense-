-- ====================================================================
-- CrackSense AI - Supabase Database Schema & Storage Setup
-- ====================================================================
-- Run this in your Supabase project's SQL Editor (Dashboard -> SQL Editor)

-- 1. Create inspections table
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    annotated_image_url TEXT,
    mask_png_base64 TEXT,
    verdict TEXT NOT NULL CHECK (verdict IN ('crack_detected', 'no_crack')),
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    box_count INTEGER NOT NULL DEFAULT 0,
    image_width INTEGER DEFAULT 0,
    image_height INTEGER DEFAULT 0,
    detections JSONB DEFAULT '[]'::jsonb NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Index for speedy queries by creation date and user
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections (user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_verdict ON public.inspections (verdict);

-- 2. Create detection_boxes table for normalized relational querying
CREATE TABLE IF NOT EXISTS public.detection_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    box_index INTEGER NOT NULL DEFAULT 0,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    label TEXT NOT NULL DEFAULT 'crack',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detection_boxes_inspection_id ON public.detection_boxes (inspection_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_boxes ENABLE ROW LEVEL SECURITY;

-- 4. Grant table access to API roles
GRANT ALL ON TABLE public.inspections TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.detection_boxes TO anon, authenticated, service_role;

-- 5. RLS Policies: Allow authenticated users to manage their own records,
-- and allow anonymous access for local desktop inspection syncing
DROP POLICY IF EXISTS "Public can view inspections" ON public.inspections;
CREATE POLICY "Public can view inspections"
    ON public.inspections FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can insert inspections" ON public.inspections;
CREATE POLICY "Public can insert inspections"
    ON public.inspections FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own inspections" ON public.inspections;
CREATE POLICY "Users can update their own inspections"
    ON public.inspections FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own inspections" ON public.inspections;
CREATE POLICY "Users can delete their own inspections"
    ON public.inspections FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- Detection boxes policies
DROP POLICY IF EXISTS "Public can view detection_boxes" ON public.detection_boxes;
CREATE POLICY "Public can view detection_boxes"
    ON public.detection_boxes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can insert detection_boxes" ON public.detection_boxes;
CREATE POLICY "Public can insert detection_boxes"
    ON public.detection_boxes FOR INSERT
    WITH CHECK (true);

-- 6. Set up Supabase Storage bucket for crack inspection images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cracksense-images', 'cracksense-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read, authenticated or anon upload
DROP POLICY IF EXISTS "Public Access to CrackSense Images" ON storage.objects;
CREATE POLICY "Public Access to CrackSense Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cracksense-images');

DROP POLICY IF EXISTS "Allow Image Uploads to CrackSense Bucket" ON storage.objects;
CREATE POLICY "Allow Image Uploads to CrackSense Bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cracksense-images');
