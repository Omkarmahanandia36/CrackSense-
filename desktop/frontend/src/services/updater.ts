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
  minSupportedVersion?: string | null;
  isBlocking?: boolean;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export type UpdateListener = (state: UpdateState, info?: UpdateInfo | null, progress?: DownloadProgress | null, error?: string | null) => void;

class UpdateService {
  private state: UpdateState = 'idle';
  private updateInfo: UpdateInfo | null = null;
  private progress: DownloadProgress | null = null;
  private errorMessage: string | null = null;
  private listeners = new Set<UpdateListener>();
  private installedVersion: string = import.meta.env.APP_VERSION || '1.0.0';
  private isElectron: boolean = false;
  private isAndroid: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.detectPlatform();
  }

  private detectPlatform() {
    if (typeof window !== 'undefined') {
      this.isElectron = Boolean((window as any).electronAPI?.updater);
      this.isAndroid = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
    }
  }

  public async init() {
    if (this.initialized) return;
    this.initialized = true;

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

    // 2. Setup Platform Updaters
    if (this.isElectron) {
      this.setupElectronListeners();
    } else if (this.isAndroid) {
      this.setupAndroidListeners();
    }
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
    // Emit current state immediately
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

  // ── Electron Platform Integration ──
  private setupElectronListeners() {
    const updater = (window as any).electronAPI?.updater;
    if (!updater) return;

    updater.onChecking(() => {
      this.state = 'checking';
      this.errorMessage = null;
      this.notify();
    });

    updater.onUpdateAvailable((data: any) => {
      this.state = 'available';
      this.updateInfo = {
        version: data.version,
        releaseNotes: data.releaseNotes,
        releaseDate: data.releaseDate,
      };
      this.errorMessage = null;
      this.notify();
    });

    updater.onUpdateNotAvailable(() => {
      this.state = 'not-available';
      this.errorMessage = null;
      this.notify();
    });

    updater.onDownloadProgress((prog: DownloadProgress) => {
      this.state = 'downloading';
      this.progress = prog;
      this.notify();
    });

    updater.onUpdateDownloaded((data: any) => {
      this.state = 'downloaded';
      this.updateInfo = {
        version: data.version,
        releaseNotes: data.releaseNotes,
      };
      this.progress = null;
      this.notify();
    });

    updater.onError((err: any) => {
      this.state = 'error';
      this.errorMessage = err.message || 'Update check failed';
      this.notify();
    });
  }

  // ── Android Platform Integration ──
  private setupAndroidListeners() {
    // 1. Check immediately on startup
    this.checkAndroidUpdate().catch(() => {});

    // 2. Check when app resumes / returns to foreground
    try {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          this.checkAndroidUpdate().catch(() => {});
        }
      });
    } catch {
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
          this.checkAndroidUpdate().catch(() => {});
        });
      }
    }

    // 3. Periodic check every 3 minutes so active users get prompt automatically
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        this.checkAndroidUpdate().catch(() => {});
      }, 3 * 60 * 1000);
    }

    // 4. Instant Realtime push from Supabase when a new version is published
    if (isSupabaseConfigured()) {
      try {
        supabase
          .channel('cracksense_version_updates')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'app_versions' },
            () => {
              this.checkAndroidUpdate(true).catch(() => {});
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime version subscription deferred:', e);
      }
    }
  }

  /**
   * Query newest version from Supabase app_versions table for Android.
   */
  public async checkAndroidUpdate(force = false): Promise<void> {
    if (!isSupabaseConfigured()) return;
    if (this.state === 'checking' || this.state === 'downloading') return;

    this.state = 'checking';
    this.errorMessage = null;
    this.notify();

    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', 'android')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        // No version record exists
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
          isBlocking,
        };
      } else {
        this.state = 'not-available';
        this.updateInfo = null;
      }
      this.notify();
    } catch (err: any) {
      // Fail quietly when offline or server unreachable
      console.warn('Android update check deferred (offline or error):', err.message);
      this.state = 'idle'; // Fail silently as required
      this.errorMessage = null;
      this.notify();
    }
  }

  // ── Public User Actions ──

  /**
   * Trigger check for updates.
   */
  public async checkForUpdates(): Promise<void> {
    await this.init();

    if (this.isElectron) {
      const updater = (window as any).electronAPI?.updater;
      if (updater) {
        this.state = 'checking';
        this.notify();
        try {
          await updater.checkForUpdates();
        } catch (e: any) {
          this.state = 'error';
          this.errorMessage = e.message;
          this.notify();
        }
      }
    } else {
      await this.checkAndroidUpdate(true);
    }
  }

  /**
   * Start downloading update (Electron) or open APK link in system browser (Android).
   */
  public async downloadOrOpenUpdate(): Promise<void> {
    if (this.isElectron) {
      const updater = (window as any).electronAPI?.updater;
      if (updater) {
        this.state = 'downloading';
        this.progress = { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 };
        this.notify();
        try {
          await updater.downloadUpdate();
        } catch (e: any) {
          this.state = 'error';
          this.errorMessage = e.message;
          this.notify();
        }
      }
    } else if (this.isAndroid && this.updateInfo?.apkUrl) {
      const url = this.updateInfo.apkUrl;
      try {
        await Browser.open({ url });
      } catch {
        window.open(url, '_system');
      }
    }
  }

  /**
   * Desktop only: install downloaded NSIS update (restarts application).
   */
  public installUpdate(): void {
    if (this.isElectron) {
      const updater = (window as any).electronAPI?.updater;
      if (updater) {
        updater.installUpdate();
      }
    }
  }
}

export const updateService = new UpdateService();
