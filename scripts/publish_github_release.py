import os
import sys
import json
import subprocess
import urllib.request
import urllib.parse
from pathlib import Path

ROOT_DIR = Path("D:/CrackSense")
DIST_ELECTRON = ROOT_DIR / "desktop" / "dist-electron"

# 1. Get GitHub token securely from git credential manager
p = subprocess.run(
    ["git", "credential", "fill"],
    input="protocol=https\nhost=github.com\n",
    text=True,
    capture_output=True
)
token = ""
for line in p.stdout.splitlines():
    if line.startswith("password="):
        token = line.split("=", 1)[1]

if not token:
    print("[ERROR] Could not retrieve GitHub token from git credentials.")
    sys.exit(1)

repo = "Omkarmahanandia36/CrackSense-"
tag = "v1.3.5"
release_name = "CrackSense AI v1.3.5"
release_body = (
    "## CrackSense AI v1.3.5\n\n"
    "### What's New:\n"
    "- **Water Leak Fissure Detection:** Calibrated multi-scale detection to accurately identify and box cracks at water leak burst origins.\n"
    "- **False Positive Elimination:** Suppressed false detections on smooth column edges and ladder rails.\n"
    "- **Defect Classification:** Categorizes defects by type (Water Leak Fissure, Surface Spalling, Crack) with calibrated confidence.\n"
    "- **Windows Installer (.exe):** Working in-app update trigger and download.\n\n"
    "### Downloads:\n"
    "- **Windows Setup:** `CrackSense-v1.3.5-Setup.exe` / `CrackSense-AI-Setup.exe`\n"
    "- **Android Mobile APK:** `CrackSense-v1.3.5.apk` / `CrackSense-AI-Mobile.apk`\n"
)

# 2. Check if release exists or create it
api_url = f"https://api.github.com/repos/{repo}/releases"
headers = {
    "Authorization": f"token {token}",
    "User-Agent": "CrackSense-Release-Uploader",
    "Accept": "application/vnd.github.v3+json"
}

# Check if release exists
release = None
try:
    req = urllib.request.Request(f"{api_url}/tags/{tag}", headers=headers)
    res = urllib.request.urlopen(req)
    release = json.loads(res.read())
    print(f"[OK] Release {tag} already exists (ID: {release['id']}).")
except urllib.error.HTTPError as e:
    if e.code == 404:
        print(f"[INFO] Release {tag} does not exist yet. Creating...")
    else:
        raise

if not release:
    payload = json.dumps({
        "tag_name": tag,
        "target_commitish": "main",
        "name": release_name,
        "body": release_body,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")
    req = urllib.request.Request(api_url, data=payload, headers={**headers, "Content-Type": "application/json"})
    res = urllib.request.urlopen(req)
    release = json.loads(res.read())
    print(f"[OK] Created GitHub release {tag} (ID: {release['id']}).")

release_id = release["id"]
upload_url_tmpl = release["upload_url"] # e.g. https://uploads.github.com/repos/.../assets{?name,label}
upload_base = upload_url_tmpl.split("{")[0]

# Existing assets on release
existing_assets = {a["name"]: a["id"] for a in release.get("assets", [])}
print(f"[INFO] Existing assets: {list(existing_assets.keys())}")

# Files to upload
assets_to_upload = [
    ("CrackSense-v1.3.5-Setup.exe", ROOT_DIR / "CrackSense-v1.3.5-Setup.exe", "application/vnd.microsoft.portable-executable"),
    ("CrackSense-AI-Setup-1.3.5.exe", ROOT_DIR / "CrackSense-v1.3.5-Setup.exe", "application/vnd.microsoft.portable-executable"),
    ("CrackSense-AI-Setup.exe", ROOT_DIR / "CrackSense-v1.3.5-Setup.exe", "application/vnd.microsoft.portable-executable"),
    ("CrackSense-v1.3.5.apk", ROOT_DIR / "CrackSense-v1.3.5.apk", "application/vnd.android.package-archive"),
    ("CrackSense-AI-Mobile.apk", ROOT_DIR / "CrackSense-v1.3.5.apk", "application/vnd.android.package-archive"),
    ("latest.yml", DIST_ELECTRON / "latest.yml", "text/yaml"),
]

for asset_name, file_path, content_type in assets_to_upload:
    if not file_path.exists():
        print(f"[WARN] Skipping missing file {file_path}")
        continue

    # Delete existing asset if it exists so we can re-upload fresh
    if asset_name in existing_assets:
        asset_id = existing_assets[asset_name]
        print(f"[INFO] Deleting existing asset {asset_name} (ID: {asset_id})...")
        del_req = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/releases/assets/{asset_id}",
            headers=headers,
            method="DELETE"
        )
        urllib.request.urlopen(del_req)

    print(f"[UPLOAD] Uploading {asset_name} ({file_path.stat().st_size:,} bytes)...")
    with open(file_path, "rb") as f:
        data = f.read()

    upload_url = f"{upload_base}?name={urllib.parse.quote(asset_name)}"
    upload_headers = {
        **headers,
        "Content-Type": content_type,
        "Content-Length": str(len(data))
    }
    up_req = urllib.request.Request(upload_url, data=data, headers=upload_headers)
    up_res = urllib.request.urlopen(up_req)
    asset_data = json.loads(up_res.read())
    print(f"[OK] Uploaded {asset_name}: {asset_data.get('browser_download_url')}")

print("\n" + "=" * 60)
print(f"ALL RELEASE ASSETS SUCCESSFULLY PUSHED TO GITHUB {tag}!")
print("=" * 60)
