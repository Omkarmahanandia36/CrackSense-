"""Automated Roboflow Universe Concrete Crack Detection Dataset Downloader (Stage 2).

Downloads bounding-box annotated concrete crack datasets directly in native YOLOv8 format:
- Automatic split structure: train/images, train/labels, val/images, val/labels, test/
- Generates data.yaml configured for YOLOv8 training.
"""

import os
import sys
import argparse
import shutil
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def download_roboflow_dataset(
    api_key: str = "",
    workspace: str = "crack-b3gku",
    project: str = "crack-detection-v02",
    version: int = 1,
    target_dir: str = str(PROJECT_ROOT / "dataset" / "detection"),
) -> str:
    """Download a YOLOv8-formatted concrete crack dataset from Roboflow Universe."""
    # 1. Resolve API key from arguments or environment
    key = api_key or os.getenv("ROBOFLOW_API_KEY", "")

    if not key or key == "YOUR_ROBOFLOW_API_KEY":
        print("\n" + "=" * 65)
        print("[!] Roboflow API Key Required")
        print("=" * 65)
        print("To download directly from Roboflow Universe:")
        print("1. Go to https://app.roboflow.com (Sign in free with Google/GitHub)")
        print("2. Click your Avatar (top right) -> 'Settings' -> 'Roboflow API'")
        print("3. Copy your free private API key")
        print("4. Run either:")
        print("   python ai/detection/download_roboflow.py --api-key YOUR_KEY")
        print("   OR add 'ROBOFLOW_API_KEY=YOUR_KEY' to your .env file.")
        print("=" * 65 + "\n")
        return ""

    try:
        from roboflow import Roboflow
    except ImportError:
        print("[!] Installing roboflow package...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "roboflow"])
        from roboflow import Roboflow

    print(f"[*] Authenticating with Roboflow API...")
    rf = Roboflow(api_key=key)

    print(f"[*] Fetching workspace '{workspace}' -> project '{project}' (v{version})...")
    rf_project = rf.workspace(workspace).project(project)
    rf_version = rf_project.version(version)

    print(f"[*] Downloading YOLOv8 dataset format...")
    downloaded = rf_version.download("yolov8")

    source_dir = Path(downloaded.location)
    dest_dir = Path(target_dir)

    print(f"[+] Download complete: {source_dir}")

    # Copy / merge into target detection folder if different
    if source_dir.resolve() != dest_dir.resolve():
        print(f"[*] Syncing dataset into {dest_dir}...")
        dest_dir.mkdir(parents=True, exist_ok=True)
        for item in source_dir.iterdir():
            target_item = dest_dir / item.name
            if item.is_dir():
                if target_item.exists():
                    shutil.rmtree(target_item)
                shutil.copytree(item, target_item)
            else:
                shutil.copy2(item, target_item)

    data_yaml = dest_dir / "data.yaml"
    print(f"[+] Roboflow Concrete Crack Dataset ready at: {dest_dir}")
    print(f"    - Configuration: {data_yaml}")
    return str(data_yaml)


def main():
    parser = argparse.ArgumentParser(description="Download Roboflow Universe Concrete Crack Dataset")
    parser.add_argument("--api-key", type=str, default="", help="Roboflow API key")
    parser.add_argument("--workspace", type=str, default="crack-b3gku", help="Roboflow workspace name")
    parser.add_argument("--project", type=str, default="crack-detection-v02", help="Roboflow project name")
    parser.add_argument("--version", type=int, default=1, help="Dataset version number")
    parser.add_argument(
        "--target-dir",
        type=str,
        default=str(PROJECT_ROOT / "dataset" / "detection"),
        help="Target folder path",
    )
    args = parser.parse_args()

    download_roboflow_dataset(
        api_key=args.api_key,
        workspace=args.workspace,
        project=args.project,
        version=args.version,
        target_dir=args.target_dir,
    )


if __name__ == "__main__":
    main()
