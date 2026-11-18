"""Prepare DamSegment (concrete dam dataset) for YOLOv8 training.

Parses DamSegment folders (Damage Detection):
- Matches images in Damage Detection/Images with YOLO labels in Damage Detection/Labels/Yolo.
- Organizes into a standard YOLO dataset structure:
    dataset/detection_damsegment/
        images/train, images/val, images/test
        labels/train, labels/val, labels/test
    dataset/detection_damsegment/data.yaml
- Classes: 0: crack, 1: spalling
"""

import os
import sys
import shutil
import random
from pathlib import Path
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BASE_DETECTION_DIR = (
    PROJECT_ROOT
    / "dataset"
    / "damsegment"
    / "DamSegment"
    / "Damage Detection"
    / "Damage Detection"
)
OUTPUT_DIR = PROJECT_ROOT / "dataset" / "detection_damsegment"


def find_damsegment_pairs(base_dir: Path) -> List[Tuple[Path, Path]]:
    """Find images in Images/ and corresponding .txt labels in Labels/Yolo/."""
    images_dir = base_dir / "Images"
    labels_dir = base_dir / "Labels" / "Yolo"

    if not images_dir.exists() or not labels_dir.exists():
        print(f"[!] Path not found: {images_dir} or {labels_dir}")
        return []

    pairs = []
    for img_path in sorted(images_dir.glob("*.jpg")):
        lbl_path = labels_dir / f"{img_path.stem}.txt"
        if lbl_path.exists():
            pairs.append((img_path, lbl_path))

    return pairs


def prepare_yolo_splits(
    pairs: List[Tuple[Path, Path]],
    output_dir: Path = OUTPUT_DIR,
    train_ratio: float = 0.70,
    val_ratio: float = 0.20,
    test_ratio: float = 0.10,
    seed: int = 42,
) -> Path:
    """Split image-label pairs into train/val/test and write data.yaml."""
    random.seed(seed)
    pairs = list(pairs)
    random.shuffle(pairs)

    n_total = len(pairs)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)
    n_test = n_total - n_train - n_val

    splits = {
        "train": pairs[:n_train],
        "val": pairs[n_train : n_train + n_val],
        "test": pairs[n_train + n_val :],
    }

    print(f"[*] Splitting {n_total} DamSegment concrete dam pairs:")
    print(f"    - Train: {len(splits['train'])}")
    print(f"    - Val:   {len(splits['val'])}")
    print(f"    - Test:  {len(splits['test'])}")

    # Clear/create directories
    for split in ["train", "val", "test"]:
        img_dest = output_dir / "images" / split
        lbl_dest = output_dir / "labels" / split
        if img_dest.exists():
            shutil.rmtree(img_dest)
        if lbl_dest.exists():
            shutil.rmtree(lbl_dest)
        img_dest.mkdir(parents=True, exist_ok=True)
        lbl_dest.mkdir(parents=True, exist_ok=True)

    class_counts: Dict[int, int] = {}

    for split, split_pairs in splits.items():
        for img_p, lbl_p in split_pairs:
            # Copy image
            dest_img = output_dir / "images" / split / img_p.name
            shutil.copy2(img_p, dest_img)

            # Read and sanitize label
            with open(lbl_p, "r", encoding="utf-8") as f:
                lines = f.readlines()

            valid_lines = []
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    class_counts[cls_id] = class_counts.get(cls_id, 0) + 1
                    valid_lines.append(" ".join(parts[:5]))

            dest_lbl = output_dir / "labels" / split / f"{img_p.stem}.txt"
            with open(dest_lbl, "w", encoding="utf-8") as f:
                f.write("\n".join(valid_lines) + ("\n" if valid_lines else ""))

    print(f"[*] Class distribution in DamSegment annotations:")
    class_names = {0: "crack", 1: "spalling"}
    for cls_id, count in sorted(class_counts.items()):
        name = class_names.get(cls_id, f"class_{cls_id}")
        print(f"    - Class {cls_id} ({name}): {count} bounding boxes")

    # Generate data.yaml with absolute posix path for Ultralytics
    yaml_path = output_dir / "data.yaml"
    yaml_content = f"""# DamSegment Concrete Dam Dataset Configuration
path: {output_dir.as_posix()}
train: images/train
val: images/val
test: images/test

names:
  0: crack
  1: spalling
"""
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    print(f"[+] Created DamSegment YOLO dataset YAML: {yaml_path}")
    return yaml_path


if __name__ == "__main__":
    if not BASE_DETECTION_DIR.exists():
        print(f"[!] DamSegment directory not found: {BASE_DETECTION_DIR}")
        sys.exit(1)

    pairs = find_damsegment_pairs(BASE_DETECTION_DIR)
    print(f"[*] Found {len(pairs)} matching image+label pairs in {BASE_DETECTION_DIR}")
    if pairs:
        prepare_yolo_splits(pairs)
    else:
        print("[!] No pairs found. Check directory structure.")
