# CrackSense AI — Release & Update Guide

This document describes the exact process for publishing updates for both the **Windows Desktop app (Electron)** and the **Android Mobile app (Capacitor)** using the single version source of truth.

---

## 1. Single Version Source of Truth

The app version is declared in one single place:
* **[desktop/package.json](file:///D:/CrackSense/desktop/package.json)** (`"version": "X.Y.Z"`)

When bumped:
1. **Frontend (React):** `vite.config.ts` reads `desktop/package.json` and injects `import.meta.env.APP_VERSION` and `__APP_VERSION__` into the production build.
2. **Android (Gradle):** `desktop/frontend/android/app/build.gradle` parses `desktop/package.json`:
   * `versionName = "X.Y.Z"`
   * `versionCode = major * 10000 + minor * 100 + patch` (e.g. `1.1.2` $\rightarrow$ `10102`)
3. **Windows (Electron):** `electron-builder` packages the executable matching the version and generates `latest.yml`.

---

## 2. Release Steps

### Step 1: Bump Version
Edit [desktop/package.json](file:///D:/CrackSense/desktop/package.json):
```json
{
  "name": "cracksense-desktop",
  "version": "1.1.0"
}
```

### Step 2: Build the Frontend
```powershell
cd D:\CrackSense\desktop
npm run release:frontend
```
This outputs compiled production assets into `desktop/frontend/dist/`.

---

### Step 3: Build Windows Installer (electron-builder)
Run the release build script with `--publish never` (builds NSIS installer and `latest.yml` locally):
```powershell
cd D:\CrackSense\desktop
npm run release:win
```

**Artifacts generated in `desktop/dist-electron/`:**
* `CrackSense AI Setup 1.1.0.exe` (NSIS installer)
* `latest.yml` (contains sha512 hash and binary name; **crucial** for `electron-updater`)

---

### Step 4: Build and Sign the Android APK

#### The Android Keystore (CRITICAL)
> [!IMPORTANT]
> **Keystore Security & Continuity:**
> * Store your release keystore **outside the repository** (e.g. `C:\Users\<username>\secure-keys\cracksense-release.keystore`).
> * Never commit `.keystore`, `.jks`, or `keystore.properties` into Git.
> * **Every release must be signed with the exact same keystore and key alias.** Android OS verifies that the certificate of an update matches the certificate of the installed app. If signed with a different key, Android will throw `INSTALL_FAILED_UPDATE_INCOMPATIBLE` and refuse to install the update.

#### 1. Generate Keystore (Once Only):
```powershell
keytool -genkey -v -keystore "C:\Users\arshr\secure-keys\cracksense-release.keystore" -alias cracksense -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. Sync Web Assets to Android:
```powershell
cd D:\CrackSense\desktop
npm run release:android:sync
```

#### 3. Compile Release APK:
```powershell
cd D:\CrackSense\desktop\frontend\android
.\gradlew.bat assembleRelease
```
Unsigned release APK generated at:
`desktop/frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk`

#### 4. Sign with apksigner (Android SDK build-tools):
```powershell
$BUILD_TOOLS = "C:\Users\arshr\AppData\Local\Android\Sdk\build-tools\36.0.0"
& "$BUILD_TOOLS\apksigner.bat" sign --ks "C:\Users\arshr\secure-keys\cracksense-release.keystore" --ks-key-alias cracksense --out "D:\CrackSense\desktop\frontend\android\app\build\outputs\apk/release/app-release.apk" "D:\CrackSense\desktop\frontend\android\app\build\outputs\apk/release/app-release-unsigned.apk"
```

---

### Step 5: Create GitHub Release

1. Go to `https://github.com/YOUR_GITHUB_OWNER/YOUR_GITHUB_REPO/releases/new`.
2. Tag: `v1.1.0` (target `main` or release branch).
3. Title: `CrackSense AI v1.1.0`.
4. Release Notes: Describe new features and defect detection improvements.
5. **Attach 3 Assets to the Release:**
   * `CrackSense AI Setup 1.1.0.exe` (Windows NSIS installer)
   * `latest.yml` (from `desktop/dist-electron/`)
   * `app-release.apk` (Signed Android APK)
6. Click **Publish release**.

---

### Step 6: Publish Android Update Row to Supabase

In the Supabase Dashboard SQL Editor (or Table Editor $\rightarrow$ `app_versions`), insert the update record:

```sql
INSERT INTO public.app_versions (
    platform,
    latest_version,
    min_supported_version,
    apk_url,
    release_notes,
    published_at
) VALUES (
    'android',
    '1.1.0',
    '1.0.0',
    'https://github.com/YOUR_GITHUB_OWNER/YOUR_GITHUB_REPO/releases/download/v1.1.0/app-release.apk',
    '• Improved crack localization and NMS accuracy.\n• Native bottom navigation and mobile UI overhaul.\n• Faster image uploads.',
    now()
);
```

* **`min_supported_version`:** If older app versions are incompatible with the backend API, set `min_supported_version = '1.1.0'`. Older Android installations will immediately show the blocking "Update Required" dialog.
* **`apk_url`:** Direct download URL of the uploaded GitHub release APK.

---

## 3. Placeholders to Configure

Before running production CI/CD or auto-updates, replace these two placeholders in [desktop/package.json](file:///D:/CrackSense/desktop/package.json):

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_OWNER",
  "repo": "YOUR_GITHUB_REPO"
}
```

* Replace `YOUR_GITHUB_OWNER` with your GitHub username or organization (e.g. `arshrawal`).
* Replace `YOUR_GITHUB_REPO` with your repository name (e.g. `CrackSense`).
