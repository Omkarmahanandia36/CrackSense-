/**
 * Cloudinary Direct Upload Service with Client-Side Resize and Compression (Phase 2).
 *
 * Flow:
 * 1. Validates file format (.jpg, .jpeg, .png) and max size (15MB).
 * 2. Compresses & resizes image on client canvas (max 1600px, jpeg 0.85).
 * 3. Retrieves signed upload signature from /upload-signature (API secret never exposed).
 * 4. Direct signed upload to Cloudinary into folder cracksense/{user_id}/.
 * 5. Returns secure_url and public_id with upload progress tracking.
 */

import { getApiBase } from './api';
import { supabase } from './supabase';

export interface UploadSignature {
  timestamp: number;
  signature: string;
  api_key: string;
  folder: string;
  cloud_name: string;
}

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
  secure_url?: string;
  public_id: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

/** Allowed image extensions. */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const MAX_RAW_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/** Validate file format and size before compression. */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file format '.${ext || 'unknown'}'. Please select a JPG or PNG image.`,
    };
  }

  if (file.size > MAX_RAW_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 15 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resize and compress image on client-side canvas.
 * Restricts max dimension to 1600px and encodes to JPEG ~0.85.
 */
export async function compressAndResizeImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Scale down if either dimension exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context for image compression.'));
        return;
      }

      // Smooth image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas compression failed to generate image blob.'));
            return;
          }
          resolve({ blob, width, height });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for client-side compression.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Fetch signed upload credentials from backend (/upload-signature).
 * The API secret stays strictly in HF Space Secrets / backend environment.
 */
export async function getUploadSignature(userId?: string): Promise<UploadSignature> {
  const base = getApiBase();
  const safeId = userId || 'guest';
  const res = await fetch(`${base}/upload-signature?user_id=${encodeURIComponent(safeId)}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.detail || `Failed to get upload signature from server (HTTP ${res.status}). Ensure backend is online.`
    );
  }

  return res.json();
}

/**
 * Upload compressed image directly to Cloudinary with real-time progress.
 */
export async function uploadToCloudinary(
  imageBlob: Blob,
  sig: UploadSignature | CloudinarySignResponse,
  filename = 'inspection.jpg',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', imageBlob, filename);
    formData.append('api_key', sig.api_key);
    formData.append('timestamp', String(sig.timestamp));
    formData.append('signature', sig.signature);
    formData.append('folder', sig.folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`;
    const xhr = new XMLHttpRequest();

    xhr.open('POST', uploadUrl, true);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            secure_url: data.secure_url,
            public_id: data.public_id,
            bytes: data.bytes,
            width: data.width,
            height: data.height,
            format: data.format,
          });
        } catch (e) {
          reject(new Error('Failed to parse Cloudinary upload response.'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error?.message || `Cloudinary upload failed (HTTP ${xhr.status}).`));
        } catch {
          reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during photo upload to Cloudinary. Check your internet connection.'));
    };

    xhr.send(formData);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Backward-compatible exports for supabase.ts & legacy components
// ──────────────────────────────────────────────────────────────────────────────
const deliveryUrlCache = new Map<string, { url: string; cachedAt: number }>();
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes

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

export async function uploadImageToCloudinary(
  blob: Blob,
  signData: CloudinarySignResponse
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(blob, signData, 'inspection.jpg');
}

export async function getSignedDeliveryUrl(publicId: string): Promise<string> {
  if (!publicId) return '';
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
      return '';
    }

    deliveryUrlCache.set(publicId, {
      url: data.delivery_url,
      cachedAt: Date.now(),
    });

    return data.delivery_url;
  } catch (err) {
    return '';
  }
}

export async function deleteCloudinaryInspectionAssets(
  inspectionIdOrClientId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('cloudinary-delete', {
      body: {
        client_id: inspectionIdOrClientId,
      },
    });

    return Boolean(data?.success);
  } catch (err) {
    return false;
  }
}
