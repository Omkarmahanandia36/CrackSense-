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

export interface AnalyzeResult {
  id: string;
  filename: string;
  is_crack: boolean;
  predicted_class: string;
  confidence: number;
  probabilities: ClassProbabilities;
  image_url: string;
  created_at: string;
}

// In development, Vite proxies /analyze and /health to http://localhost:8000
const API_BASE = '';

export async function getSystemHealth(): Promise<HealthData> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status: ${res.status}`);
  }
  return res.json();
}

export async function uploadAndAnalyzeImage(file: File): Promise<AnalyzeResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server returned error (${res.status})`);
  }

  return res.json();
}
