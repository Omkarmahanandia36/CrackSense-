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

/**
 * Supabase Authentication Service
 */
export interface SupabaseAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    full_name?: string;
    username?: string;
  };
  error?: string;
  message?: string;
}

export const signUpWithSupabase = async (
  email: string,
  password: string,
  fullName: string,
  username?: string
): Promise<SupabaseAuthResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username || email.split('@')[0],
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const supaUser = data.user;
    if (!supaUser) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Notice if email confirmation is required
    const needsEmailConfirm = supaUser.identities && supaUser.identities.length > 0 && !data.session;
    return {
      success: true,
      user: {
        id: supaUser.id,
        email: supaUser.email || email,
        full_name: fullName,
        username: username || email.split('@')[0],
      },
      message: needsEmailConfirm
        ? 'Account registered! Please check your email to confirm your account.'
        : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed' };
  }
};

export const signInWithSupabase = async (
  email: string,
  password: string
): Promise<SupabaseAuthResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const supaUser = data.user;
    if (data.session) {
      localStorage.setItem('supabase_token', data.session.access_token);
    }

    return {
      success: true,
      user: supaUser ? {
        id: supaUser.id,
        email: supaUser.email || email,
        full_name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.username || supaUser.email?.split('@')[0],
        username: supaUser.user_metadata?.username,
      } : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign in failed' };
  }
};

export const resetPasswordWithSupabase = async (
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Password reset link sent! Check your email inbox.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Password reset request failed' };
  }
};

export const signOutSupabase = async (): Promise<void> => {
  localStorage.removeItem('supabase_token');
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  }
};
