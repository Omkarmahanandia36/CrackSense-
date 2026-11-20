import { supabase } from './supabase';

export interface CloudinarySignResponse {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  public_id: string;
  full_public_id: string;
  type: string;
  overwrite: boolean;
  allowed_formats?: string[];
  max_file_size?: number;
}

export interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

// In-memory cache for signed delivery URLs to avoid redundant edge function invocations
const deliveryUrlCache = new Map<string, { url: string; cachedAt: number }>();
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes

/**
 * Request signed upload parameters from the Supabase 'cloudinary-sign' Edge Function.
 * The Edge Function strictly scopes the upload to cracksense/<auth.uid()>/ with type=authenticated.
 */
export async function requestCloudinarySignature(
  clientId: string,
  assetType: 'original' | 'annotated' = 'original'
): Promise<CloudinarySignResponse> {
  const { data, error } = await supabase.functions.invoke('cloudinary-sign', {
    body: {
      action: 'upload',
      client_id: clientId,
      asset_type: assetType,
    },
  });

  if (error || !data) {
    const errorMsg = error?.message || 'Failed to obtain Cloudinary upload signature';
    console.error('Cloudinary signing error:', errorMsg);
    throw new Error(`Cloudinary authorization error: ${errorMsg}`);
  }

  return data as CloudinarySignResponse;
}

/**
 * Upload a downscaled image blob directly to Cloudinary using signed parameters.
 * No Cloudinary API secret is present on the client; Cloudinary validates the HMAC signature.
 */
export async function uploadImageToCloudinary(
  blob: Blob,
  signData: CloudinarySignResponse
): Promise<CloudinaryUploadResult> {
  const cloudName =
    signData.cloud_name || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

  if (!cloudName) {
    throw new Error('Cloudinary cloud name is not available from signature or environment');
  }

  const formData = new FormData();
  formData.append('file', blob);
  formData.append('api_key', signData.api_key);
  formData.append('timestamp', String(signData.timestamp));
  formData.append('signature', signData.signature);
  formData.append('folder', signData.folder);
  formData.append('public_id', signData.public_id);
  formData.append('type', signData.type || 'authenticated');
  formData.append('overwrite', 'true');

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `HTTP upload error ${response.status}`;
    console.error('Cloudinary direct upload rejected:', message);
    throw new Error(`Cloudinary upload failed: ${message}`);
  }

  const result = await response.json();
  return {
    public_id: result.public_id || signData.full_public_id,
    bytes: result.bytes || blob.size,
    width: result.width || 0,
    height: result.height || 0,
    format: result.format || 'jpg',
  };
}

/**
 * Obtain a signed authenticated delivery URL from the 'cloudinary-sign' Edge Function.
 * Employs in-memory caching to minimize edge function requests.
 */
export async function getSignedDeliveryUrl(
  publicId: string
): Promise<string> {
  if (!publicId) return '';

  // Check cache first
  const cached = deliveryUrlCache.get(publicId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.functions.invoke('cloudinary-sign', {
      body: {
        action: 'delivery_url',
        public_id: publicId,
      },
    });

    if (error || !data?.delivery_url) {
      console.warn(`Could not generate signed delivery URL for ${publicId}:`, error?.message);
      return '';
    }

    deliveryUrlCache.set(publicId, {
      url: data.delivery_url,
      cachedAt: Date.now(),
    });

    return data.delivery_url;
  } catch (err) {
    console.warn(`Error resolving delivery URL for ${publicId}:`, err);
    return '';
  }
}

/**
 * Invoke the 'cloudinary-delete' Edge Function to permanently remove Cloudinary assets.
 * Only the inspection owner or an administrator can delete assets.
 */
export async function deleteCloudinaryInspectionAssets(
  inspectionIdOrClientId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('cloudinary-delete', {
      body: {
        client_id: inspectionIdOrClientId,
      },
    });

    if (error) {
      console.warn('Cloudinary asset deletion error:', error.message);
      return false;
    }

    return Boolean(data?.success);
  } catch (err) {
    console.warn('Error invoking asset deletion:', err);
    return false;
  }
}
