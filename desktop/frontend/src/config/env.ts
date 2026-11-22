/**
 * Centralized Application Configuration & Environment Detection.
 * Single source of truth for Cloud AI, Supabase, and Cloudinary settings.
 */

export const AWS_API_URL = 'https://ai57lwrkaxpvcfaevaehnnxkfu0xmbxp.lambda-url.ap-southeast-2.on.aws';

export const ENV = {
  // Primary backend URL: AWS Lambda Cloud URL (24/7 Serverless)
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || AWS_API_URL,

  // Supabase Cloud Backend
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://sxhxucovqkqmxwdsdine.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',

  // Cloudinary Storage
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'eced1hkp',
};

/** Verify if Supabase is properly configured */
export function isSupabaseConfigured(): boolean {
  return Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);
}

/** Verify if Cloudinary is configured */
export function isCloudinaryConfigured(): boolean {
  return Boolean(ENV.CLOUDINARY_CLOUD_NAME);
}
