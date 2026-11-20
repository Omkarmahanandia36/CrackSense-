/** API Client service for communication with FastAPI backend. */

export interface HealthData {
  status: string;
  app_name: string;
  environment: string;
  device: string;
  model_loaded: boolean;
  timestamp: string;
}

export interface ClassProbabilities {
  positive_crack: number;
  negative_clear: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  label: string;
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

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? 'http://127.0.0.1:8000'
    : '');

export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://127.0.0.1:8000' : '');
  return `${base}${url}`;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('supabase_token') || localStorage.getItem('cracksense_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSystemHealth(): Promise<HealthData> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function uploadAndAnalyzeImage(file: File, threshold: number = 0.35): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analyze?threshold=${threshold}`, {
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

export async function fetchInspections(skip: number = 0, limit: number = 50): Promise<InspectionListItem[]> {
  const res = await fetch(`${API_BASE}/inspections?skip=${skip}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load inspection history');
  return res.json();
}

export async function deleteInspection(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/inspections/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete inspection #${id}`);
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
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
  const res = await fetch(`${API_BASE}/auth/register`, {
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
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    localStorage.removeItem('cracksense_token');
    return null;
  }
  return res.json();
}
