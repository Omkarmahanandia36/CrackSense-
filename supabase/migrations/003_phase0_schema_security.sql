-- ==============================================================================
-- CrackSense AI - Phase 0 Migration: Schema Alignment & Strict Row Level Security
-- ==============================================================================
-- Safe & Idempotent: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Never drops or overwrites existing user data.
-- Run this in your Supabase Project's SQL Editor (Dashboard -> SQL Editor).

-- ------------------------------------------------------------------------------
-- 1. INSPECTIONS TABLE ALIGNMENT
-- ------------------------------------------------------------------------------
-- Create table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT,
    cloudinary_public_id TEXT,
    result TEXT,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all required columns exist without dropping existing data
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Sync legacy columns if present from earlier versions
DO $$
BEGIN
    -- If legacy image_public_id exists, backfill cloudinary_public_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'image_public_id'
    ) THEN
        UPDATE public.inspections 
        SET cloudinary_public_id = image_public_id 
        WHERE cloudinary_public_id IS NULL AND image_public_id IS NOT NULL;
    END IF;

    -- If legacy verdict exists, backfill result
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'verdict'
    ) THEN
        UPDATE public.inspections 
        SET result = verdict 
        WHERE result IS NULL AND verdict IS NOT NULL;
    END IF;

    -- Make legacy constraints flexible for direct Phase 3 inserts
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.inspections ALTER COLUMN client_id DROP NOT NULL;
        ALTER TABLE public.inspections ALTER COLUMN client_id SET DEFAULT gen_random_uuid();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'filename'
    ) THEN
        ALTER TABLE public.inspections ALTER COLUMN filename DROP NOT NULL;
        ALTER TABLE public.inspections ALTER COLUMN filename SET DEFAULT 'photo.jpg';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inspections' AND column_name = 'verdict'
    ) THEN
        ALTER TABLE public.inspections ALTER COLUMN verdict DROP NOT NULL;
    END IF;
END $$;

-- Indexes for speedy queries
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections (user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections (created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. DETECTION_BOXES TABLE ALIGNMENT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.detection_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    label TEXT NOT NULL DEFAULT 'crack',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE;
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS x DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS y DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT 'crack';
ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- Ensure legacy columns on detection_boxes do not block Phase 3 inserts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'detection_boxes' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.detection_boxes ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE public.detection_boxes ALTER COLUMN user_id SET DEFAULT auth.uid();
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'detection_boxes' AND column_name = 'box_index'
    ) THEN
        ALTER TABLE public.detection_boxes ALTER COLUMN box_index DROP NOT NULL;
        ALTER TABLE public.detection_boxes ALTER COLUMN box_index SET DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_detection_boxes_inspection_id ON public.detection_boxes (inspection_id);

-- ------------------------------------------------------------------------------
-- 3. ENABLE ROW LEVEL SECURITY ON EVERY TABLE (MANDATORY)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detection_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES: PROFILES
-- User can select/update only their own row (auth.uid() = id).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile or admin read all" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;

CREATE POLICY "Users can select own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES: INSPECTIONS
-- User can select/insert/update/delete only their own rows (auth.uid() = user_id).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public can insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can view own inspections or admin view all" ON public.inspections;
DROP POLICY IF EXISTS "Users can insert own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can select own inspections" ON public.inspections;

CREATE POLICY "Users can select own inspections"
    ON public.inspections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inspections"
    ON public.inspections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections"
    ON public.inspections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections"
    ON public.inspections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. RLS POLICIES: DETECTION_BOXES
-- Access only if parent inspection belongs to user (EXISTS check on inspections.user_id = auth.uid()).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view detection_boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Public can insert detection_boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can view own detection boxes or admin view all" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can insert own detection boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can update own detection boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can delete own detection boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can select detection_boxes of own inspections" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can insert detection_boxes for own inspections" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can update detection_boxes of own inspections" ON public.detection_boxes;
DROP POLICY IF EXISTS "Users can delete detection_boxes of own inspections" ON public.detection_boxes;

CREATE POLICY "Users can select detection_boxes of own inspections"
    ON public.detection_boxes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE public.inspections.id = public.detection_boxes.inspection_id
              AND public.inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert detection_boxes for own inspections"
    ON public.detection_boxes FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE public.inspections.id = public.detection_boxes.inspection_id
              AND public.inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update detection_boxes of own inspections"
    ON public.detection_boxes FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE public.inspections.id = public.detection_boxes.inspection_id
              AND public.inspections.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE public.inspections.id = public.detection_boxes.inspection_id
              AND public.inspections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete detection_boxes of own inspections"
    ON public.detection_boxes FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.inspections
            WHERE public.inspections.id = public.detection_boxes.inspection_id
              AND public.inspections.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 7. RLS POLICIES: LOGIN_EVENTS
-- User can insert and select only their own events (auth.uid() = user_id).
-- No update or delete policies (append-only audit log).
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own login event" ON public.login_events;
DROP POLICY IF EXISTS "Users can view own login events or admin view all" ON public.login_events;
DROP POLICY IF EXISTS "Users can insert own login events" ON public.login_events;
DROP POLICY IF EXISTS "Users can select own login events" ON public.login_events;
DROP POLICY IF EXISTS "Users can update own login events" ON public.login_events;
DROP POLICY IF EXISTS "Users can delete own login events" ON public.login_events;

CREATE POLICY "Users can insert own login events"
    ON public.login_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own login events"
    ON public.login_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. RLS POLICIES & PERMISSIONS: APP_VERSIONS
-- Everyone (anon + authenticated) can SELECT (read-only).
-- NO client insert/update/delete policies.
-- Writes are possible only via Supabase Dashboard / service_role.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view app versions" ON public.app_versions;
DROP POLICY IF EXISTS "No client insert on app versions" ON public.app_versions;
DROP POLICY IF EXISTS "No client update on app versions" ON public.app_versions;
DROP POLICY IF EXISTS "No client delete on app versions" ON public.app_versions;
DROP POLICY IF EXISTS "Everyone can select app versions" ON public.app_versions;

CREATE POLICY "Everyone can select app versions"
    ON public.app_versions FOR SELECT
    TO anon, authenticated
    USING (true);

-- Ensure anon & authenticated roles only have SELECT permissions
REVOKE INSERT, UPDATE, DELETE ON public.app_versions FROM anon, authenticated;
GRANT SELECT ON public.app_versions TO anon, authenticated;
