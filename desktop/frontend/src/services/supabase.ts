import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { downscaleImageForUpload } from './imageUtils';
import {
  requestCloudinarySignature,
  uploadImageToCloudinary,
  getSignedDeliveryUrl,
  deleteCloudinaryInspectionAssets,
} from './cloudinary';

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
      detectSessionInUrl: true,
    },
  }
);

// Keep localStorage supabase_token in sync with active Supabase session
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      localStorage.setItem('supabase_token', session.access_token);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem('supabase_token');
    }
  });

  // Attach online listener for automatic synchronization of pending inspections
  window.addEventListener('online', () => {
    console.info('Network connection restored. Syncing pending inspections...');
    syncPendingInspections().catch((err) =>
      console.warn('Auto-sync failed on reconnect:', err)
    );
  });
}

/**
 * Validate and automatically refresh session if expired or expiring soon.
 * Returns valid session or null. Never forcefully logs out the user on network failure.
 */
export const getValidSession = async () => {
  if (!isSupabaseConfigured()) return null;
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Refresh if session expires in under 60 seconds
    if (session.expires_at && session.expires_at * 1000 - Date.now() < 60000) {
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        console.warn('Session refresh warning (retaining current session):', refreshError?.message);
        // Do not wipe token on temporary offline/network issues
        return session;
      }
      localStorage.setItem('supabase_token', refreshData.session.access_token);
      return refreshData.session;
    }
    return session;
  } catch (err) {
    console.warn('Error verifying session:', err);
    return null;
  }
};

export interface UserProfileData {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin' | string;
  created_at?: string;
  username?: string;
}

/**
 * Retrieve cached user profile from localStorage for instant login persistence across app exits.
 */
export const getCachedUserProfile = (): UserProfileData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('supabase_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Persist cached user profile to localStorage so user stays logged in across app restarts.
 */
export const setCachedUserProfile = (profile: UserProfileData | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem('supabase_user_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('supabase_user_profile');
    }
  } catch (err) {
    console.warn('Error caching user profile:', err);
  }
};

/**
 * Fetch profile info including role from the profiles table.
 */
export const getUserProfile = async (
  userId: string
): Promise<UserProfileData | null> => {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Could not load profile from Supabase:', error.message);
      return null;
    }
    return data as UserProfileData;
  } catch (err) {
    console.warn('Error loading profile:', err);
    return null;
  }
};

/**
 * Record a login audit event in login_events.
 * Collects only platform, app version, and device model. No IP or location.
 */
export const recordLoginEvent = async (userId: string): Promise<void> => {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    let platform = Capacitor.getPlatform();
    if (
      platform === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('Electron')
    ) {
      platform = 'electron';
    }

    const appVersion = import.meta.env.APP_VERSION || '1.0.0';
    let deviceModel = 'Desktop Client';

    if (typeof navigator !== 'undefined') {
      if (navigator.userAgent.includes('Android')) {
        deviceModel = 'Android Device';
      } else if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        deviceModel = 'iOS Device';
      } else if (navigator.platform) {
        deviceModel = navigator.platform;
      }
    }

    const { error } = await supabase.from('login_events').insert({
      user_id: userId,
      platform,
      app_version: appVersion,
      device_model: deviceModel,
    });

    if (error) {
      console.warn('Could not record login event:', error.message);
    }
  } catch (err) {
    console.warn('Failed to record login audit event:', err);
  }
};

export interface SupabaseInspection {
  id: string;
  created_at: string;
  user_id?: string;
  client_id?: string;
  filename: string;
  image_public_id?: string;
  annotated_public_id?: string;
  image_bytes?: number;
  image_url?: string;
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
  sync_status?: string;
}

export interface LocalInspection {
  clientId: string; // Idempotency UUID
  userId: string;
  filename: string;
  imagePublicId?: string;
  annotatedPublicId?: string;
  imageBytes?: number;
  imageUrl?: string;
  annotatedImageUrl?: string;
  maskPngBase64?: string;
  verdict: 'crack_detected' | 'no_crack';
  confidence: number;
  boxCount: number;
  imageWidth: number;
  imageHeight: number;
  detections: Array<{
    id: number;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  metadata: {
    length_px?: number;
    max_width_px?: number;
    mean_width_px?: number;
    severity?: string;
    engine?: string;
    notes?: string;
    reviewed?: boolean;
    [key: string]: any;
  };
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  createdAt: string;
  supabaseId?: string;
}

const LOCAL_STORAGE_KEY = 'cracksense_local_inspections';

/** Retrieve stored local inspections. */
export const getLocalInspections = (): LocalInspection[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse local inspections:', err);
    return [];
  }
};

/** Save or update an inspection in local cache. */
export const saveLocalInspection = (item: LocalInspection): void => {
  if (typeof window === 'undefined') return;
  const list = getLocalInspections();
  const idx = list.findIndex((x) => x.clientId === item.clientId);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
};

/** Delete local inspection by client ID. */
export const deleteLocalInspection = (clientId: string): void => {
  if (typeof window === 'undefined') return;
  const list = getLocalInspections().filter((x) => x.clientId !== clientId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
};

/**
 * Generate a signed URL for display.
 * For Cloudinary assets (stored with type 'authenticated'), requests an HMAC delivery URL.
 */
export const getSignedImageUrl = async (
  pathOrPublicId: string,
  expiresIn = 3600
): Promise<string | null> => {
  if (!pathOrPublicId) return null;
  // If already an absolute http/blob/data URL, check if it's a Cloudinary public ID
  if (pathOrPublicId.startsWith('data:') || pathOrPublicId.startsWith('blob:')) {
    return pathOrPublicId;
  }

  // Cloudinary authenticated public ID (cracksense/<uid>/<id>)
  if (pathOrPublicId.startsWith('cracksense/') || !pathOrPublicId.startsWith('http')) {
    const deliveryUrl = await getSignedDeliveryUrl(pathOrPublicId);
    if (deliveryUrl) return deliveryUrl;
  }

  return pathOrPublicId;
};

/**
 * Upload an image file or blob to the user's isolated folder in cracksense-images bucket.
 */
export const uploadImageToSupabaseStorage = async (
  file: File | Blob,
  fileName: string,
  userId?: string
): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    let uid = userId;
    if (!uid) {
      const session = await getValidSession();
      uid = session?.user?.id;
    }
    if (!uid) throw new Error('Unauthenticated user cannot upload to storage');

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${uid}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('cracksense-images')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      console.error('Supabase image upload failed:', uploadError.message);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    return storagePath;
  } catch (err: any) {
    console.error('Supabase storage error:', err);
    throw err;
  }
};

/**
 * Save an inspection with local-first persistence (sync_status: 'pending')
 * and immediately trigger background cloud sync with client_id idempotency.
 */
export const saveInspectionLocalFirst = async (
  data: Omit<LocalInspection, 'clientId' | 'syncStatus' | 'createdAt'>,
  imageFileOrBlob?: File | Blob
): Promise<LocalInspection> => {
  const clientId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const localRecord: LocalInspection = {
    ...data,
    clientId,
    syncStatus: 'pending',
    createdAt,
  };

  // 1. Write locally first
  saveLocalInspection(localRecord);

  // 2. Trigger asynchronous synchronization
  syncInspection(localRecord, imageFileOrBlob).catch((err) => {
    console.warn(`Initial sync for inspection ${clientId} failed:`, err);
  });

  return localRecord;
};

/**
 * Synchronize a specific local inspection record to Supabase.
 */
export const syncInspection = async (
  item: LocalInspection,
  imageBlob?: File | Blob
): Promise<LocalInspection> => {
  if (!isSupabaseConfigured()) {
    item.syncStatus = 'pending';
    item.syncError = 'Cloud sync not configured';
    saveLocalInspection(item);
    return item;
  }

  const session = await getValidSession();
  if (!session?.user) {
    item.syncStatus = 'pending';
    item.syncError = 'Authentication required to sync';
    saveLocalInspection(item);
    return item;
  }

  item.syncStatus = 'syncing';
  saveLocalInspection(item);

  try {
    let imagePublicId = item.imagePublicId;
    let annotatedPublicId = item.annotatedPublicId;
    let imageBytes = item.imageBytes || 0;
    let imageWidth = item.imageWidth || 0;
    let imageHeight = item.imageHeight || 0;

    // 1. Upload original image to Cloudinary if provided and not yet uploaded
    if (imageBlob && !imagePublicId) {
      // Downscale to max 2000px, JPEG quality ~85%
      const processed = await downscaleImageForUpload(imageBlob, 2000, 0.85);
      imageBytes = processed.bytes;
      imageWidth = processed.width;
      imageHeight = processed.height;

      // Request signed upload parameters from edge function
      const signData = await requestCloudinarySignature(item.clientId, 'original');
      const cldRes = await uploadImageToCloudinary(processed.blob, signData);
      imagePublicId = cldRes.public_id;
    }

    // 2. Insert inspection record into Supabase (idempotent on client_id)
    const { data: inserted, error: insertError } = await supabase
      .from('inspections')
      .upsert(
        {
          client_id: item.clientId,
          user_id: session.user.id,
          filename: item.filename,
          image_public_id: imagePublicId || null,
          annotated_public_id: annotatedPublicId || null,
          image_bytes: imageBytes,
          image_width: imageWidth,
          image_height: imageHeight,
          image_url: item.imageUrl || null,
          annotated_image_url: item.annotatedImageUrl || null,
          mask_png_base64: item.maskPngBase64 || null,
          verdict: item.verdict,
          confidence: item.confidence,
          box_count: item.boxCount,
          detections: item.detections,
          metadata: item.metadata,
          sync_status: 'synced',
        },
        { onConflict: 'client_id' }
      )
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // 3. Insert detection boxes if any
    if (inserted?.id && item.detections && item.detections.length > 0) {
      const boxesToInsert = item.detections.map((d, idx) => ({
        inspection_id: inserted.id,
        user_id: session.user.id,
        box_index: idx,
        x: d.bbox[0],
        y: d.bbox[1],
        width: d.bbox[2],
        height: d.bbox[3],
        confidence: d.confidence,
        label: 'crack',
      }));

      const { error: boxError } = await supabase
        .from('detection_boxes')
        .insert(boxesToInsert);

      if (boxError) {
        console.warn('Could not insert detection boxes:', boxError.message);
      }
    }

    item.syncStatus = 'synced';
    item.syncError = undefined;
    item.imagePublicId = imagePublicId;
    item.annotatedPublicId = annotatedPublicId;
    item.imageBytes = imageBytes;
    item.imageWidth = imageWidth;
    item.imageHeight = imageHeight;
    item.supabaseId = inserted?.id;
    saveLocalInspection(item);
    return item;
  } catch (err: any) {
    console.error(`Sync error for inspection ${item.clientId}:`, err);
    item.syncStatus = 'failed';
    item.syncError = err.message || 'Network sync error';
    saveLocalInspection(item);
    throw err;
  }
};

/**
 * Retry all pending or failed inspections in the local queue.
 */
export const syncPendingInspections = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  const list = getLocalInspections();
  const pending = list.filter(
    (x) => x.syncStatus === 'pending' || x.syncStatus === 'failed'
  );

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await syncInspection(item);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
};

/**
 * Fetch inspections from Supabase for the current authenticated user.
 */
export const fetchSupabaseInspections = async (
  limit = 50
): Promise<SupabaseInspection[]> => {
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

export const subscribeToInspections = (
  onNewInspection: (record: SupabaseInspection) => void
) => {
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
    role?: string;
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
    return { success: false, error: 'Supabase configuration is missing' };
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username || cleanEmail.split('@')[0],
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

    const userData: UserProfileData = {
      id: supaUser.id,
      email: supaUser.email || cleanEmail,
      full_name: fullName,
      role: 'user',
      username: username || cleanEmail.split('@')[0],
    };

    if (data.session) {
      localStorage.setItem('supabase_token', data.session.access_token);
      setCachedUserProfile(userData);
      await recordLoginEvent(supaUser.id);
    }

    const needsEmailConfirm =
      supaUser.identities &&
      supaUser.identities.length > 0 &&
      !data.session;

    return {
      success: true,
      user: userData,
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
    return { success: false, error: 'Supabase configuration is missing' };
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const supaUser = data.user;
    if (data.session) {
      localStorage.setItem('supabase_token', data.session.access_token);
    }

    if (!supaUser) {
      return { success: false, error: 'Failed to retrieve authenticated user' };
    }

    // Fetch profile and role from Supabase profiles table
    const profile = await getUserProfile(supaUser.id);
    const role = profile?.role || 'user';

    const userData: UserProfileData = {
      id: supaUser.id,
      email: supaUser.email || cleanEmail,
      full_name:
        profile?.full_name ||
        supaUser.user_metadata?.full_name ||
        supaUser.user_metadata?.username ||
        supaUser.email?.split('@')[0] ||
        'Inspector',
      role,
      username: supaUser.user_metadata?.username,
    };

    // Cache profile for persistent login across app restarts
    setCachedUserProfile(userData);

    // Record login audit event
    await recordLoginEvent(supaUser.id);

    return {
      success: true,
      user: userData,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign in failed' };
  }
};

export const resetPasswordWithSupabase = async (
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase configuration is missing' };
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
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
    return {
      success: false,
      error: err.message || 'Password reset request failed',
    };
  }
};

export const signOutSupabase = async (): Promise<void> => {
  localStorage.removeItem('supabase_token');
  setCachedUserProfile(null);
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    }
  }
};
