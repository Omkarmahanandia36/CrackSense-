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

ver = "1.3.4"
notes = "CrackSense AI v1.3.4: Fixed Windows update detection and setup link (.exe), updated mobile crack bounding box view edge-to-edge, touch pinch-to-zoom, tainted canvas download fix, and auto rehydration."

apk_url = f"https://sxhxucovqkqmxwdsdine.supabase.co/storage/v1/object/public/cracksense-images/releases/CrackSense-v{ver}.apk"
exe_url = f"https://github.com/Omkarmahanandia36/CrackSense-/releases/download/v{ver}/CrackSense-v{ver}-Setup.exe"

# 1. Android
sb.table("app_versions").insert({
    "platform": "android",
    "latest_version": ver,
    "min_supported_version": "1.0.0",
    "apk_url": apk_url,
    "release_notes": notes
}).execute()
print(f"Android v{ver} registered successfully with URL: {apk_url}")

# 2. Windows
sb.table("app_versions").insert({
    "platform": "windows",
    "latest_version": ver,
    "min_supported_version": "1.0.0",
    "apk_url": exe_url,
    "release_notes": notes
}).execute()
print(f"Windows v{ver} registered successfully with URL: {exe_url}")
