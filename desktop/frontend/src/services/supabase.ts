import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export interface SupabaseInspection {
  id: string;
  created_at: string;
  user_id?: string;
  filename: string;
  image_url: string;
  annotated_image_url?: string;
  mask_png_base64?: string;
  verdict: 'crack_detected' | 'no_crack';
  confidence: number;
  box_count: number;
  image_width: number;
  image_height: number;
  detections: Array<{
    id: number;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  metadata?: Record<string, any>;
}

export const fetchSupabaseInspections = async (limit = 50): Promise<SupabaseInspection[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return [];
    }
    return (data as SupabaseInspection[]) || [];
  } catch (err) {
    console.warn('Supabase client error:', err);
    return [];
  }
};

export const uploadImageToSupabaseStorage = async (
  file: File | Blob,
  fileName: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error: uploadError } = await supabase.storage
      .from('cracksense-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.warn('Supabase image upload failed:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('cracksense-images').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.warn('Supabase storage error:', err);
    return null;
  }
};

export const subscribeToInspections = (onNewInspection: (record: SupabaseInspection) => void) => {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel('public:inspections')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'inspections' },
      (payload) => {
        onNewInspection(payload.new as SupabaseInspection);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
