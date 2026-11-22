/** API Client service for communication with FastAPI backend. */
import { ENV, AWS_API_URL } from '../config/env';

export interface HealthData {
  status: string;
  app_name?: string;
  environment?: string;
  device?: string;
  model_loaded?: boolean;
  timestamp?: string;
  is_waking_up?: boolean;
}

export interface ClassProbabilities {
  positive_crack: number;
  negative_clear: number;
}

export interface BoundingBox {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence: number;
  label?: string;
}

export interface DetectionItem {
  id: number;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] in original pixel coordinates
}

export interface AnalyzeResult {
  id: string;
  filename: string;
  is_crack: boolean;
  verdict?: 'crack_detected' | 'no_crack' | string;
  predicted_class: string;
  confidence: number;
  probabilities: ClassProbabilities;
  image_url: string;
  annotated_image_url?: string;
  boxes?: BoundingBox[];
  detections?: DetectionItem[];
  mask_png_base64?: string;
  image_width?: number;
  image_height?: number;
  created_at: string;
}

export interface InspectionListItem {
  id: number;
  uuid: string;
  filename: string;
  is_crack: boolean;
  predicted_class: string;
  confidence: number;
  image_url: string;
  created_at: string;
  sync_status?: string;
}

export interface UserProfile {
  id: number | string;
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
}

import { Capacitor } from '@capacitor/core';

export const isNativeMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    Capacitor.isNativePlatform() ||
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
};

export function getApiBase(): string {
  // Configured environment variable override (if specified during build or dev)
  if (typeof window !== 'undefined' && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }

  // 24/7 AWS Lambda Cloud API for all platforms (Mobile, Desktop, Web)
  return AWS_API_URL;
}

export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getApiBase();
  return `${base}${url}`;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('supabase_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSystemHealth(): Promise<HealthData> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/health`, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.status === 503 || res.status === 504) {
      return {
        status: 'waking_up',
        app_name: 'CrackSense AI',
        environment: 'cloud',
        device: 'waking',
        model_loaded: false,
        timestamp: new Date().toISOString(),
        is_waking_up: true,
      };
    }

    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.message?.includes('503')) {
      return {
        status: 'waking_up',
        app_name: 'CrackSense AI',
        environment: 'cloud',
        device: 'waking',
        model_loaded: false,
        timestamp: new Date().toISOString(),
        is_waking_up: true,
      };
    }
    throw err;
  }
}

/**
 * Continuously polls /health until the backend responds 200 OK.
 * Useful for Hugging Face Spaces cold starts (~20-60s wake-up time).
 */
export async function waitForBackendAwake(
  maxSeconds = 60,
  onTick?: (secondsElapsed: number) => void
): Promise<boolean> {
  const start = Date.now();
  const pollIntervalMs = 2500;

  while ((Date.now() - start) / 1000 < maxSeconds) {
    const elapsed = Math.round((Date.now() - start) / 1000);
    if (onTick) onTick(elapsed);

    try {
      const health = await getSystemHealth();
      if (health.status === 'healthy' || health.status === 'ok') {
        return true;
      }
    } catch {
      // Continue polling until server wakes up
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}

export async function uploadAndAnalyzeImage(file: File, threshold: number = 0.15): Promise<AnalyzeResult> {
  const base = getApiBase();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${base}/analyze?threshold=${threshold}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server returned error (${res.status})`);
  }

  return res.json();
}

export async function predictWithImageUrl(imageUrl: string, threshold: number = 0.15): Promise<AnalyzeResult> {
  const base = getApiBase();
  const res = await fetch(`${base}/predict?threshold=${threshold}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server returned error (${res.status})`);
  }

  const data = await res.json();
  const isCrack = data.result === 'crack';
  return {
    id: String(Date.now()),
    filename: imageUrl.split('/').pop() || 'photo.jpg',
    is_crack: isCrack,
    verdict: isCrack ? 'crack_detected' : 'no_crack',
    predicted_class: isCrack ? 'Positive' : 'Negative',
    confidence: data.confidence,
    probabilities: {
      positive_crack: isCrack ? data.confidence : 1 - data.confidence,
      negative_clear: isCrack ? 1 - data.confidence : data.confidence,
    },
    image_url: imageUrl,
    boxes: data.boxes,
    detections: data.boxes?.map((b: any, idx: number) => ({
      id: idx + 1,
      confidence: b.confidence,
      bbox: [b.x, b.y, b.width, b.height],
    })),
    mask_png_base64: data.mask_data,
    image_width: data.image_width,
    image_height: data.image_height,
    created_at: new Date().toISOString(),
  };
}

export async function fetchInspections(skip: number = 0, limit: number = 50): Promise<InspectionListItem[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/inspections?skip=${skip}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load inspection history');
  return res.json();
}

export async function deleteInspection(id: number): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/inspections/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete inspection #${id}`);
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: UserProfile }> {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function registerUser(email: string, password: string, full_name?: string): Promise<UserProfile> {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = localStorage.getItem('cracksense_token');
  if (!token) return null;
  const base = getApiBase();
  const res = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    localStorage.removeItem('cracksense_token');
    return null;
  }
  return res.json();
}
