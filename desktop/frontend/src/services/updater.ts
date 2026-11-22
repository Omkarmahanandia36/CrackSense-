import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, isSupabaseConfigured } from './supabase';
import { isVersionOlder } from './semver';

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string | null;
  releaseDate?: string | null;
  apkUrl?: string | null;
  downloadUrl?: string | null;
  minSupportedVersion?: string | null;
  isBlocking?: boolean;
  platform?: 'android' | 'windows';
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateListener = (
  state: UpdateState,
  info?: UpdateInfo | null,
  progress?: DownloadProgress | null,
  error?: string | null
) => void;

class UpdateService {
  private state: UpdateState = 'idle';
  private updateInfo: UpdateInfo | null = null;
  private progress: DownloadProgress | null = null;
  private errorMessage: string | null = null;
  private listeners = new Set<UpdateListener>();
  private installedVersion: string = import.meta.env.APP_VERSION || '1.3.4';
  private isElectron: boolean = false;
  private isAndroid: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.detectPlatform();
  }

  private detectPlatform() {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      this.isAndroid = Capacitor.getPlatform() === 'android' || /Android/i.test(ua);
      this.isElectron = Boolean((window as any).electronAPI) || ua.includes('Electron');
    }
  }

  public getPlatform(): 'android' | 'windows' {
    this.detectPlatform();
    return this.isAndroid ? 'android' : 'windows';
  }

  public async init() {
    if (this.initialized) return;
    this.initialized = true;

    this.detectPlatform();

    // 1. Resolve installed version
    if (this.isAndroid) {
      try {
        const info = await App.getInfo();
        if (info?.version) {
          this.installedVersion = info.version;
        }
      } catch {
        // Fallback to build version
      }
    } else if (this.isElectron) {
      const elecVer = (window as any).electronAPI?.appVersion;
      if (elecVer) this.installedVersion = elecVer;
    }

    // 2. Setup listeners and check updates
    this.setupListeners();
  }

  public getInstalledVersion(): string {
    return this.installedVersion;
  }

  public getState(): UpdateState {
    return this.state;
  }

  public getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  public getProgress(): DownloadProgress | null {
    return this.progress;
  }

  public getError(): string | null {
    return this.errorMessage;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.updateInfo, this.progress, this.errorMessage);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state, this.updateInfo, this.progress, this.errorMessage);
      } catch (err) {
        console.warn('Update listener error:', err);
      }
    }
  }

  private setupListeners() {
    // Check immediately on startup
    this.checkPlatformUpdate().catch(() => {});

    // Resume / focus listeners
    if (this.isAndroid) {
      try {
        App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            this.checkPlatformUpdate().catch(() => {});
          }
        });
      } catch {
        // Ignored
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.checkPlatformUpdate().catch(() => {});
      });

      // Check every 3 minutes
      window.setInterval(() => {
        this.checkPlatformUpdate().catch(() => {});
      }, 3 * 60 * 1000);
    }

    // Supabase Realtime update notification
    if (isSupabaseConfigured()) {
      try {
        supabase
          .channel('cracksense_version_updates')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'app_versions' },
            () => {
              this.checkPlatformUpdate(true).catch(() => {});
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime version subscription deferred:', e);
      }
    }
  }

  /**
   * Query newest version from Supabase app_versions table for the current platform (windows or android).
   */
  public async checkPlatformUpdate(force = false): Promise<void> {
    if (!isSupabaseConfigured()) return;
    if (this.state === 'checking' || this.state === 'downloading') return;

    this.detectPlatform();
    const targetPlatform = this.getPlatform();

    this.state = 'checking';
    this.errorMessage = null;
    this.notify();

    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', targetPlatform)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        this.state = 'not-available';
        this.updateInfo = null;
        this.notify();
        return;
      }

      const latestVer = data.latest_version;
      const minSupportedVer = data.min_supported_version;
      const installed = this.installedVersion;

      const isBlocking = Boolean(minSupportedVer && isVersionOlder(installed, minSupportedVer));
      const hasUpdate = Boolean(latestVer && isVersionOlder(installed, latestVer));

      if (isBlocking || hasUpdate) {
        this.state = 'available';
        this.updateInfo = {
          version: latestVer,
          minSupportedVersion: minSupportedVer,
          releaseNotes: data.release_notes,
          releaseDate: data.published_at,
          apkUrl: data.apk_url,
          downloadUrl: data.apk_url,
          isBlocking,
          platform: targetPlatform,
        };
      } else {
        this.state = 'not-available';
        this.updateInfo = null;
      }
      this.notify();
    } catch (err: any) {
      console.warn('Update check deferred (offline or error):', err?.message);
      this.state = 'idle';
      this.errorMessage = null;
      this.notify();
    }
  }

  // Alias for backward compatibility
  public async checkAndroidUpdate(force = false): Promise<void> {
    return this.checkPlatformUpdate(force);
  }

  public async checkForUpdates(): Promise<void> {
    await this.init();
    await this.checkPlatformUpdate(true);
  }

  /**
   * Download update: opens APK link in mobile browser/system (Android)
   * or triggers browser/external download of Windows installer (.exe).
   */
  public async downloadOrOpenUpdate(): Promise<void> {
    const url = this.updateInfo?.downloadUrl || this.updateInfo?.apkUrl;
    if (!url) return;

    this.detectPlatform();

    if (this.isAndroid) {
      try {
        await Browser.open({ url });
      } catch {
        window.open(url, '_system');
      }
      return;
    }

    // Windows / Desktop
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openExternal) {
      try {
        await electronAPI.openExternal(url);
        return;
      } catch (e) {
        console.warn('electron openExternal failed, falling back to browser download', e);
      }
    }

    // Standard browser download trigger
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(url, '_blank');
    }
  }

  public installUpdate(): void {
    const updater = (window as any).electronAPI?.updater;
    if (updater?.installUpdate) {
      updater.installUpdate();
    } else {
      this.downloadOrOpenUpdate();
    }
  }
}

export const updateService = new UpdateService();
