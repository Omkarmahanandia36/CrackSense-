-- ====================================================================
-- CrackSense AI - Online Mode Database Migration (001_online_mode.sql)
-- ====================================================================
-- Enables strict multi-tenant Row Level Security, Profiles, Login Events,
-- Admin RBAC with security definer functions, and Private Image Storage.

-- 1. Helper function: check if calling user is an Admin (SECURITY DEFINER)
-- Bypasses RLS recursion by running with privileges of the function creator.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
DROP POLICY IF EXISTS "Users can read own profile or admin read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admin read all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
CREATE POLICY "Users can update own profile except role"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );

-- Trigger to prevent any non-admin from modifying the role column
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Only administrators can modify user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Auto-create profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Login Events Table
CREATE TABLE IF NOT EXISTS public.login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    platform TEXT NOT NULL,
    app_version TEXT,
    device_model TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON public.login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON public.login_events (created_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Login Events RLS: insert and select own rows, or admin select all. No update/delete.
DROP POLICY IF EXISTS "Users can insert own login event" ON public.login_events;
CREATE POLICY "Users can insert own login event"
    ON public.login_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own login events or admin view all" ON public.login_events;
CREATE POLICY "Users can view own login events or admin view all"
    ON public.login_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- 4. Inspections Table Update / Migration
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID UNIQUE NOT NULL,
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
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    sync_status TEXT DEFAULT 'synced'
);

-- Ensure columns exist if table was created in an earlier migration
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS client_id UUID UNIQUE;
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.inspections ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections (user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_client_id ON public.inspections (client_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON public.inspections (created_at DESC);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Drop obsolete permissive policies
DROP POLICY IF EXISTS "Public can view inspections" ON public.inspections;
DROP POLICY IF EXISTS "Public can insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON public.inspections;

-- Strict Inspections RLS
DROP POLICY IF EXISTS "Users can view own inspections or admin view all" ON public.inspections;
CREATE POLICY "Users can view own inspections or admin view all"
    ON public.inspections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own inspections" ON public.inspections;
CREATE POLICY "Users can insert own inspections"
    ON public.inspections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
CREATE POLICY "Users can update own inspections"
    ON public.inspections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own inspections" ON public.inspections;
CREATE POLICY "Users can delete own inspections"
    ON public.inspections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Detection Boxes Table
CREATE TABLE IF NOT EXISTS public.detection_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    box_index INTEGER NOT NULL DEFAULT 0,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    label TEXT NOT NULL DEFAULT 'crack',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.detection_boxes ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_detection_boxes_inspection_id ON public.detection_boxes (inspection_id);
CREATE INDEX IF NOT EXISTS idx_detection_boxes_user_id ON public.detection_boxes (user_id);

ALTER TABLE public.detection_boxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view detection_boxes" ON public.detection_boxes;
DROP POLICY IF EXISTS "Public can insert detection_boxes" ON public.detection_boxes;

DROP POLICY IF EXISTS "Users can view own detection boxes or admin view all" ON public.detection_boxes;
CREATE POLICY "Users can view own detection boxes or admin view all"
    ON public.detection_boxes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own detection boxes" ON public.detection_boxes;
CREATE POLICY "Users can insert own detection boxes"
    ON public.detection_boxes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own detection boxes" ON public.detection_boxes;
CREATE POLICY "Users can update own detection boxes"
    ON public.detection_boxes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own detection boxes" ON public.detection_boxes;
CREATE POLICY "Users can delete own detection boxes"
    ON public.detection_boxes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. Private Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('cracksense-images', 'cracksense-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS: folder isolation by user auth.uid()
DROP POLICY IF EXISTS "Public Access to CrackSense Images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Image Uploads to CrackSense Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own images or admin read all" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

CREATE POLICY "Users can read own images or admin read all"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'cracksense-images' AND
        ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
    );

CREATE POLICY "Users can upload own images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'cracksense-images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'cracksense-images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'cracksense-images' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- 7. Admin Summary RPC (Pagination & Aggregations)
CREATE OR REPLACE FUNCTION public.get_admin_users(
    page_offset INT DEFAULT 0,
    page_limit INT DEFAULT 20
)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in TIMESTAMPTZ,
    inspection_count BIGINT,
    login_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: administrator privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.email,
        p.full_name,
        p.role,
        p.created_at,
        (SELECT MAX(le.created_at) FROM public.login_events le WHERE le.user_id = p.id) AS last_sign_in,
        (SELECT COUNT(*) FROM public.inspections i WHERE i.user_id = p.id) AS inspection_count,
        (SELECT COUNT(*) FROM public.login_events le WHERE le.user_id = p.id) AS login_count
    FROM public.profiles p
    ORDER BY p.created_at DESC
    OFFSET page_offset
    LIMIT page_limit;
END;
$$;
