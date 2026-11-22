#!/usr/bin/env python3
"""
CrackSense AI - One-Command Automated Update Publisher
======================================================
Builds the latest frontend and binaries, bumps the version,
uploads assets to Supabase Cloud Storage, and syncs the
app_versions database table so all users instantly get the update.

Usage:
    python scripts/publish_update.py
    python scripts/publish_update.py --notes "Fixed camera zoom and UI layout"
    python scripts/publish_update.py --bump minor
    python scripts/publish_update.py --skip-windows
"""

import os
import sys
import json
import shutil
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
DESKTOP_DIR = ROOT_DIR / "desktop"
FRONTEND_DIR = DESKTOP_DIR / "frontend"
ANDROID_DIR = FRONTEND_DIR / "android"
DOWNLOADS_DIR = Path(os.path.expanduser("~")) / "Downloads"

# Supabase Credentials loaded securely from .env
def get_supabase_creds():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("SUPABASE_URL=") and not url:
                    url = line.split("=", 1)[1].strip('"\'')
                elif line.startswith("SUPABASE_SERVICE_ROLE_KEY=") and not key:
                    key = line.split("=", 1)[1].strip('"\'')
    return url, key

BUCKET_NAME = "cracksense-images"


def parse_semver(v: str):
    parts = v.strip().lstrip("v").split(".")
    major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 1
    minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
    patch = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
    return major, minor, patch


def bump_version(current: str, bump_type: str) -> str:
    major, minor, patch = parse_semver(current)
    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    elif bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        # specific version string provided
        return bump_type.lstrip("v")


def run_cmd(cmd: str, cwd: Path):
    print(f"\n[RUN] ({cwd.name}) {cmd}")
    res = subprocess.run(cmd, cwd=str(cwd), shell=True)
    if res.returncode != 0:
        print(f"[ERROR] Command failed with exit code {res.returncode}: {cmd}")
        sys.exit(res.returncode)


def main():
    parser = argparse.ArgumentParser(description="Publish CrackSense AI App Update")
    parser.add_argument("--notes", "-n", type=str, default="", help="Release notes for this version")
    parser.add_argument("--bump", "-b", type=str, default="patch", choices=["patch", "minor", "major"], help="Semver bump type")
    parser.add_argument("--skip-windows", action="store_true", help="Skip packaging Windows executable")
    parser.add_argument("--skip-android", action="store_true", help="Skip packaging Android APK")
    args = parser.parse_args()

    # 1. Read current version
    desktop_pkg_path = DESKTOP_DIR / "package.json"
    frontend_pkg_path = FRONTEND_DIR / "package.json"

    with open(desktop_pkg_path, "r", encoding="utf-8") as f:
        desktop_pkg = json.load(f)

    current_ver = desktop_pkg.get("version", "1.0.0")
    new_ver = bump_version(current_ver, args.bump)

    print("=" * 60)
    print(f"CrackSense AI Release Publisher")
    print(f"Current version: v{current_ver} -> New version: v{new_ver}")
    print("=" * 60)

    # 2. Update version in package.json files
    desktop_pkg["version"] = new_ver
    with open(desktop_pkg_path, "w", encoding="utf-8") as f:
        json.dump(desktop_pkg, f, indent=2)

    with open(frontend_pkg_path, "r", encoding="utf-8") as f:
        frontend_pkg = json.load(f)
    frontend_pkg["version"] = new_ver
    with open(frontend_pkg_path, "w", encoding="utf-8") as f:
        json.dump(frontend_pkg, f, indent=2)

    print(f"[OK] Updated package.json files to v{new_ver}")

    # 3. Build Web/Frontend assets
    print("\n--- 1. Building Vite Production Frontend ---")
    run_cmd("npm run build", cwd=FRONTEND_DIR)

    # Release notes
    notes = args.notes.strip()
    if not notes:
        notes = f"CrackSense AI v{new_ver}: Defect inspection optimizations, enhanced UI responsiveness, and real-time cloud sync."

    # 4. Build and Publish Android APK
    if not args.skip_android:
        print("\n--- 2. Building Android APK ---")
        run_cmd("npx cap sync android", cwd=FRONTEND_DIR)
        run_cmd(".\\gradlew.bat assembleDebug", cwd=ANDROID_DIR)

        built_apk = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"
        if not built_apk.exists():
            print(f"[FATAL] Built APK not found at {built_apk}")
            sys.exit(1)

        # Copy to root and user Downloads
        root_apk = ROOT_DIR / f"CrackSense-v{new_ver}.apk"
        user_apk = DOWNLOADS_DIR / f"CrackSense-v{new_ver}.apk"
        shutil.copy2(built_apk, root_apk)
        shutil.copy2(built_apk, user_apk)
        print(f"[OK] Saved APK to:\n  - {root_apk}\n  - {user_apk}")

        # Upload to Supabase Storage
        print("\n--- 3. Uploading APK to Supabase Storage ---")
        from supabase import create_client
        supabase_url, supabase_key = get_supabase_creds()
        supabase = create_client(supabase_url, supabase_key)

        storage_path = f"releases/CrackSense-v{new_ver}.apk"
        with open(root_apk, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=f,
                file_options={"content-type": "application/vnd.android.package-archive", "upsert": "true"}
            )
        public_apk_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        print(f"[OK] Supabase APK URL: {public_apk_url}")

        # Insert record into app_versions
        res = supabase.table("app_versions").insert({
            "platform": "android",
            "latest_version": new_ver,
            "min_supported_version": "1.0.0",
            "apk_url": public_apk_url,
            "release_notes": notes
        }).execute()
        print(f"[OK] Android v{new_ver} published to Supabase app_versions table!")

    # 5. Build and Publish Windows Installer
    if not args.skip_windows:
        print("\n--- 4. Building Windows Setup Executable ---")
        run_cmd("npx electron-builder --win nsis --publish never", cwd=DESKTOP_DIR)

        built_exe = DESKTOP_DIR / "dist-electron" / f"CrackSense AI Setup {new_ver}.exe"
        if built_exe.exists():
            root_exe = ROOT_DIR / f"CrackSense AI Setup {new_ver}.exe"
            user_exe = DOWNLOADS_DIR / f"CrackSense AI Setup {new_ver}.exe"
            shutil.copy2(built_exe, root_exe)
            shutil.copy2(built_exe, user_exe)
            print(f"[OK] Saved Windows installer to:\n  - {root_exe}\n  - {user_exe}")

            # Insert Windows record into app_versions
            from supabase import create_client
            supabase_url, supabase_key = get_supabase_creds()
            supabase = create_client(supabase_url, supabase_key)
            supabase.table("app_versions").insert({
                "platform": "windows",
                "latest_version": new_ver,
                "min_supported_version": "1.0.0",
                "apk_url": f"https://github.com/Omkarmahanandia36/CrackSense-/releases/download/v{new_ver}/CrackSense.AI.Setup.{new_ver}.exe",
                "release_notes": notes
            }).execute()
            print(f"[OK] Windows v{new_ver} published to Supabase app_versions table!")

    print("\n" + "=" * 60)
    print(f"SUCCESS! CrackSense AI v{new_ver} is officially LIVE.")
    print(f"Every user who opens the app will now receive the update!")
    print("=" * 60)


if __name__ == "__main__":
    main()
