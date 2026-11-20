-- Migration 002: In-App Version Management & Auto-Update
-- Creates public.app_versions table with RLS permitting public SELECT and locking client writes.

CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('android', 'windows')),
    latest_version TEXT NOT NULL,
    min_supported_version TEXT NOT NULL,
    apk_url TEXT,
    release_notes TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_app_versions_platform_published 
    ON public.app_versions (platform, published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Everyone (anon & authenticated) can SELECT versions
DROP POLICY IF EXISTS "Public can view app versions" ON public.app_versions;
CREATE POLICY "Public can view app versions"
    ON public.app_versions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Write Policies: Explicitly blocked for client roles (dashboard / service_role only)
DROP POLICY IF EXISTS "No client insert on app versions" ON public.app_versions;
CREATE POLICY "No client insert on app versions"
    ON public.app_versions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS "No client update on app versions" ON public.app_versions;
CREATE POLICY "No client update on app versions"
    ON public.app_versions
    FOR UPDATE
    TO anon, authenticated
    USING (false);

DROP POLICY IF EXISTS "No client delete on app versions" ON public.app_versions;
CREATE POLICY "No client delete on app versions"
    ON public.app_versions
    FOR DELETE
    TO anon, authenticated
    USING (false);

-- Grant SELECT permissions to public PostgREST roles
GRANT SELECT ON public.app_versions TO anon, authenticated;
