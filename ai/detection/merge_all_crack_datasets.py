"""Merge Mendeley DamSegment and Roboflow Universe crack datasets into a single unified benchmark dataset."""

import os
import sys
import shutil
import random
from pathlib import Path
from typing import List, Tuple, Dict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "dataset" / "detection_combined"

DAMSEGMENT_DIR = (
    PROJECT_ROOT
    / "dataset"
    / "damsegment"
    / "DamSegment"
    / "Damage Detection"
    / "Damage Detection"
)
ROBOFLOW_CRACKS_OJRLK = PROJECT_ROOT / "dataset" / "roboflow" / "cracks-detection-ojrlk"
ROBOFLOW_CRACK_TDDJ8 = PROJECT_ROOT / "dataset" / "roboflow" / "crack-tddj8"


def collect_damsegment_pairs() -> List[Tuple[Path, Path, str]]:
    """DamSegment: 0 -> crack (0), 1 -> spalling (1)."""
    pairs = []
    img_dir = DAMSEGMENT_DIR / "Images"
    lbl_dir = DAMSEGMENT_DIR / "Labels" / "Yolo"
    if not img_dir.exists():
        print(f"[!] DamSegment directory not found: {img_dir}")
        return pairs

    for img in sorted(img_dir.glob("*.jpg")):
        lbl = lbl_dir / f"{img.stem}.txt"
        if lbl.exists():
            pairs.append((img, lbl, "damsegment"))
    print(f"[*] Collected {len(pairs)} pairs from DamSegment")
    return pairs


def collect_roboflow_ojrlk_pairs() -> List[Tuple[Path, Path, str]]:
    """Cracks-detection-ojrlk: 0 -> crack (0)."""
    pairs = []
    if not ROBOFLOW_CRACKS_OJRLK.exists():
        print(f"[!] ojrlk directory not found: {ROBOFLOW_CRACKS_OJRLK}")
        return pairs

    for img in ROBOFLOW_CRACKS_OJRLK.rglob("*"):
        if img.is_file() and img.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            lbl = img.parent.parent / "labels" / f"{img.stem}.txt"
            if lbl.exists():
                pairs.append((img, lbl, "ojrlk"))
            else:
                # Same folder check
                lbl_same = img.with_suffix(".txt")
                if lbl_same.exists():
                    pairs.append((img, lbl_same, "ojrlk"))
    print(f"[*] Collected {len(pairs)} pairs from Roboflow cracks-detection-ojrlk")
    return pairs


def collect_roboflow_tddj8_pairs() -> List[Tuple[Path, Path, str]]:
    """Crack-tddj8: 0, 1, 2 -> crack (0); 3 (undamaged) -> dropped."""
    pairs = []
    if not ROBOFLOW_CRACK_TDDJ8.exists():
        print(f"[!] tddj8 directory not found: {ROBOFLOW_CRACK_TDDJ8}")
        return pairs

    for img in ROBOFLOW_CRACK_TDDJ8.rglob("*"):
        if img.is_file() and img.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            lbl = img.parent.parent / "labels" / f"{img.stem}.txt"
            if lbl.exists():
                pairs.append((img, lbl, "tddj8"))
            else:
                lbl_same = img.with_suffix(".txt")
                if lbl_same.exists():
                    pairs.append((img, lbl_same, "tddj8"))
    print(f"[*] Collected {len(pairs)} pairs from Roboflow crack-tddj8")
    return pairs


def remap_and_sanitize_labels(lbl_path: Path, source_type: str) -> List[str]:
    """Normalize bounding boxes to class 0: crack, class 1: spalling."""
    valid_lines = []
    with open(lbl_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                try:
                    cls_id = int(parts[0])
                    coords = [float(x) for x in parts[1:5]]
                    # Validate normalized coordinates [0, 1]
                    if all(0.0 <= c <= 1.05 for c in coords):
                        coords = [max(0.0, min(1.0, c)) for c in coords]
                        coords_str = " ".join(f"{c:.6f}" for c in coords)

                        if source_type == "damsegment":
                            # 0: crack, 1: spalling
                            valid_lines.append(f"{cls_id} {coords_str}")
                        elif source_type == "ojrlk":
                            # 0: crack
                            valid_lines.append(f"0 {coords_str}")
                        elif source_type == "tddj8":
                            # 0, 1, 2: crack (0); 3 (undamaged) dropped
                            if cls_id in [0, 1, 2]:
                                valid_lines.append(f"0 {coords_str}")
                except Exception:
                    continue
    return valid_lines


def build_unified_dataset(
    output_dir: Path = OUTPUT_DIR,
    train_ratio: float = 0.75,
    val_ratio: float = 0.15,
    test_ratio: float = 0.10,
    seed: int = 42,
) -> Path:
    random.seed(seed)
    all_pairs = []
    all_pairs.extend(collect_damsegment_pairs())
    all_pairs.extend(collect_roboflow_ojrlk_pairs())
    all_pairs.extend(collect_roboflow_tddj8_pairs())

    print(f"\n[*] Total aggregated image-label pairs: {len(all_pairs)}")
    random.shuffle(all_pairs)

    n_total = len(all_pairs)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)
    n_test = n_total - n_train - n_val

    splits = {
        "train": all_pairs[:n_train],
        "val": all_pairs[n_train : n_train + n_val],
        "test": all_pairs[n_train + n_val :],
    }

    # Reset directories
    for split in ["train", "val", "test"]:
        img_dest = output_dir / "images" / split
        lbl_dest = output_dir / "labels" / split
        if img_dest.exists():
            shutil.rmtree(img_dest)
        if lbl_dest.exists():
            shutil.rmtree(lbl_dest)
        img_dest.mkdir(parents=True, exist_ok=True)
        lbl_dest.mkdir(parents=True, exist_ok=True)

    class_counts = {0: 0, 1: 0}

    for split, split_items in splits.items():
        print(f"[*] Processing {split} split ({len(split_items)} samples)...")
        for idx, (img_p, lbl_p, source_type) in enumerate(split_items):
            unique_name = f"{source_type}_{img_p.stem}"
            dest_img = output_dir / "images" / split / f"{unique_name}{img_p.suffix}"
            dest_lbl = output_dir / "labels" / split / f"{unique_name}.txt"

            shutil.copy2(img_p, dest_img)
            lines = remap_and_sanitize_labels(lbl_p, source_type)
            with open(dest_lbl, "w", encoding="utf-8") as f:
                f.write("\n".join(lines) + ("\n" if lines else ""))

            for l in lines:
                cid = int(l.split()[0])
                class_counts[cid] = class_counts.get(cid, 0) + 1

    print(f"\n[+] Unified Dataset Creation Complete:")
    print(f"    - Output Folder: {output_dir}")
    print(f"    - Train Split:   {len(splits['train'])} images")
    print(f"    - Val Split:     {len(splits['val'])} images")
    print(f"    - Test Split:    {len(splits['test'])} images")
    print(f"    - Class 0 (crack):    {class_counts.get(0, 0)} bboxes")
    print(f"    - Class 1 (spalling): {class_counts.get(1, 0)} bboxes")

    yaml_path = output_dir / "data.yaml"
    yaml_content = f"""# CrackSense AI - Unified Multi-Source Dataset (DamSegment + Roboflow Universe)
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

    print(f"[+] Saved YOLO data.yaml: {yaml_path}")
    return yaml_path


if __name__ == "__main__":
    build_unified_dataset()
