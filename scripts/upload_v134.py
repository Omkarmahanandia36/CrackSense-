import os
from pathlib import Path
from supabase import create_client

ROOT_DIR = Path("D:/CrackSense")
env_file = ROOT_DIR / ".env"
url, key = "", ""
with open(env_file, "r", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line.startswith("SUPABASE_URL="):
            url = line.split("=", 1)[1].strip("\"'")
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            key = line.split("=", 1)[1].strip("\"'")

sb = create_client(url, key)
bucket_name = "cracksense-images"

ver = "1.3.4"
notes = "CrackSense AI v1.3.4: Fixed Windows update detection and download link (.exe), updated mobile crack bounding box view edge-to-edge, touch pinch-to-zoom, tainted canvas download fix, and auto rehydration."

apk_file = ROOT_DIR / f"CrackSense-v{ver}.apk"
exe_file = ROOT_DIR / f"CrackSense-v{ver}-Setup.exe"

print(f"Uploading APK: {apk_file} ({apk_file.stat().st_size} bytes)...")
apk_storage_path = f"releases/CrackSense-v{ver}.apk"
with open(apk_file, "rb") as f:
    sb.storage.from_(bucket_name).upload(
        path=apk_storage_path,
        file=f,
        file_options={"content-type": "application/vnd.android.package-archive", "upsert": "true"}
    )
apk_url = sb.storage.from_(bucket_name).get_public_url(apk_storage_path)
print(f"APK Public URL: {apk_url}")

print(f"Uploading EXE: {exe_file} ({exe_file.stat().st_size} bytes)...")
exe_storage_path = f"releases/CrackSense-v{ver}-Setup.exe"
with open(exe_file, "rb") as f:
    sb.storage.from_(bucket_name).upload(
        path=exe_storage_path,
        file=f,
        file_options={"content-type": "application/vnd.microsoft.portable-executable", "upsert": "true"}
    )
exe_url = sb.storage.from_(bucket_name).get_public_url(exe_storage_path)
print(f"EXE Public URL: {exe_url}")

# Insert into app_versions table
print("Updating app_versions table...")
sb.table("app_versions").insert({
    "platform": "android",
    "latest_version": ver,
    "min_supported_version": "1.0.0",
    "apk_url": apk_url,
    "release_notes": notes
}).execute()
print("Android version registered.")

sb.table("app_versions").insert({
    "platform": "windows",
    "latest_version": ver,
    "min_supported_version": "1.0.0",
    "apk_url": exe_url,
    "release_notes": notes
}).execute()
print("Windows version registered.")
print("Done!")
