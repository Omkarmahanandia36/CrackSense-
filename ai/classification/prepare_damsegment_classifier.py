"""Prepare DamSegment classification subset for ResNet-18 training.

Scans the extracted DamSegment for classification images (crack vs non-crack),
computes 70/20/10 train/val/test splits, and outputs CSV files compatible with
ai/classification/train.py.
"""

import os
import sys
import random
import pandas as pd
from pathlib import Path
from typing import List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DAMSEGMENT_DIR = PROJECT_ROOT / "dataset" / "damsegment"
OUTPUT_CSV_DIR = PROJECT_ROOT / "dataset" / "processed" / "damsegment"


def find_classification_samples(base_dir: Path) -> List[Tuple[str, int, str]]:
    """Find images categorized by damage type (crack = 1, non-crack = 0)."""
    valid_exts = {".jpg", ".jpeg", ".png"}
    samples = []

    for p in base_dir.rglob("*"):
        if p.is_file() and p.suffix.lower() in valid_exts and not p.name.startswith("."):
            path_str = str(p).lower()
            # Check directory or filename for crack indication
            if "non_crack" in path_str or "non-crack" in path_str or "nocrack" in path_str or "negative" in path_str:
                samples.append((str(p.resolve()), 0, "Negative"))
            elif "crack" in path_str or "positive" in path_str:
                samples.append((str(p.resolve()), 1, "Positive"))

    return samples


def create_classifier_csv_splits(
    samples: List[Tuple[str, int, str]],
    output_dir: Path = OUTPUT_CSV_DIR,
    train_ratio: float = 0.70,
    val_ratio: float = 0.20,
    seed: int = 42,
):
    """Save train.csv, val.csv, and test.csv splits."""
    random.seed(seed)
    random.shuffle(samples)

    n_total = len(samples)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)

    splits = {
        "train": samples[:n_train],
        "val": samples[n_train : n_train + n_val],
        "test": samples[n_train + n_val :],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    for split_name, split_data in splits.items():
        df = pd.DataFrame(split_data, columns=["filepath", "label", "class_name"])
        csv_file = output_dir / f"{split_name}.csv"
        df.to_csv(csv_file, index=False)
        print(f"[+] Saved {split_name}.csv: {len(df)} samples ({df['label'].value_counts().to_dict()})")


if __name__ == "__main__":
    if not DAMSEGMENT_DIR.exists():
        print(f"[!] DamSegment directory not found: {DAMSEGMENT_DIR}")
        sys.exit(1)

    samples = find_classification_samples(DAMSEGMENT_DIR)
    print(f"[*] Found {len(samples)} classification samples in {DAMSEGMENT_DIR}")
    if samples:
        create_classifier_csv_splits(samples)
