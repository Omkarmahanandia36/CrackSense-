"""Download specified Roboflow Universe projects and stage them for training.

Targets:
1. workspace: google-colab-cmvo4, project: cracks-detection-ojrlk
2. workspace: kamar, project: crack-tddj8
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

TARGET_PROJECTS = [
    {"workspace": "google-colab-cmvo4", "project": "cracks-detection-ojrlk", "version": 1},
    {"workspace": "kamar", "project": "crack-tddj8", "version": 2},
]


def download_projects(api_key: str = "", target_base: Path = PROJECT_ROOT / "dataset" / "roboflow"):
    key = api_key or os.getenv("ROBOFLOW_API_KEY", "")
    if not key or key == "YOUR_ROBOFLOW_API_KEY":
        print("[!] Roboflow API Key is required to download from Roboflow Universe.")
        print("    Get your free key at: https://app.roboflow.com -> Settings -> Roboflow API")
        print("    Then run with: --api-key YOUR_KEY or set ROBOFLOW_API_KEY in .env")
        return False

    try:
        from roboflow import Roboflow
    except ImportError:
        print("[!] roboflow package not installed.")
        return False

    rf = Roboflow(api_key=key)

    for item in TARGET_PROJECTS:
        ws = item["workspace"]
        proj = item["project"]
        ver = item["version"]
        dest = target_base / proj
        print(f"\n[*] Downloading Roboflow project: {ws}/{proj} (v{ver})...")
        try:
            p = rf.workspace(ws).project(proj)
            v = p.version(ver)
            dl = v.download("yolov8")
            source_p = Path(dl.location)
            dest.mkdir(parents=True, exist_ok=True)
            for child in source_p.iterdir():
                target_child = dest / child.name
                if child.is_dir():
                    if target_child.exists():
                        shutil.rmtree(target_child)
                    shutil.copytree(child, target_child)
                else:
                    shutil.copy2(child, target_child)
            print(f"[+] Successfully saved {proj} to {dest}")
        except Exception as e:
            print(f"[!] Error downloading {ws}/{proj}: {e}")

    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download Roboflow Universe crack datasets")
    parser.add_argument("--api-key", type=str, default="", help="Roboflow API key")
    args = parser.parse_args()
    download_projects(api_key=args.api_key)
