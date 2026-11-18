"""Download and extract the DamSegment dataset from Mendeley Data (DOI: 10.17632/z5z6gtt5t4.1)."""

import os
import sys
import time
import zipfile
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASET_DIR = PROJECT_ROOT / "dataset"
ZIP_PATH = DATASET_DIR / "damsegment.zip"
EXTRACT_DIR = DATASET_DIR / "damsegment"
MENDELEY_URL = "https://data.mendeley.com/public-api/zip/z5z6gtt5t4/download/1"


def download_damsegment(url: str = MENDELEY_URL, dest_zip: Path = ZIP_PATH) -> Path:
    dest_zip.parent.mkdir(parents=True, exist_ok=True)
    if dest_zip.exists() and dest_zip.stat().st_size > 400 * 1024 * 1024:
        print(f"[i] Zip file already downloaded: {dest_zip} ({dest_zip.stat().st_size / (1024*1024):.1f} MB)")
        return dest_zip

    print(f"[*] Downloading DamSegment from Mendeley Data...")
    print(f"    URL: {url}")
    print(f"    Destination: {dest_zip}")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)

    start_time = time.time()
    with urllib.request.urlopen(req) as response:
        total_size = int(response.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024  # 1 MB

        with open(dest_zip, "wb") as f:
            last_reported = 0
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = int(downloaded / total_size * 100)
                    if pct >= last_reported + 10 or downloaded == total_size:
                        last_reported = pct
                        mb = downloaded / (1024 * 1024)
                        total_mb = total_size / (1024 * 1024)
                        elapsed = time.time() - start_time
                        speed = mb / elapsed if elapsed > 0 else 0
                        print(f"    Progress: {pct}% ({mb:.1f}/{total_mb:.1f} MB, {speed:.2f} MB/s)")

    print(f"[+] Download complete: {dest_zip.stat().st_size / (1024*1024):.2f} MB in {time.time() - start_time:.1f}s")
    return dest_zip


def extract_damsegment(zip_path: Path = ZIP_PATH, extract_to: Path = EXTRACT_DIR) -> Path:
    extract_to.mkdir(parents=True, exist_ok=True)
    print(f"[*] Extracting {zip_path.name} to {extract_to}...")
    start_time = time.time()
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_to)
    print(f"[+] Extraction complete in {time.time() - start_time:.1f}s")
    return extract_to


def inspect_extracted_structure(extract_dir: Path = EXTRACT_DIR):
    print(f"\n[*] Extracted DamSegment contents:")
    for root, dirs, files in os.walk(extract_dir):
        rel = Path(root).relative_to(extract_dir)
        if len(rel.parts) <= 2:
            img_count = sum(1 for f in files if f.lower().endswith((".jpg", ".jpeg", ".png")))
            txt_count = sum(1 for f in files if f.lower().endswith(".txt"))
            json_count = sum(1 for f in files if f.lower().endswith(".json"))
            zip_count = sum(1 for f in files if f.lower().endswith(".zip"))
            print(f"  - {rel}: {len(dirs)} dirs, {len(files)} files (imgs: {img_count}, txt: {txt_count}, json: {json_count}, zip: {zip_count})")


if __name__ == "__main__":
    zip_p = download_damsegment()
    extract_p = extract_damsegment(zip_p)
    inspect_extracted_structure(extract_p)
