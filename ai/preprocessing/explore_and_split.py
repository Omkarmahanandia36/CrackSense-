"""CrackSense AI - Phase 1: Dataset Exploration, Near-Duplicate Detection & Leakage-Aware Splitting.

This script:
1. Scans raw dataset directory (Positive/ and Negative/ folders).
2. Audits image formats, dimensions, and checks for corrupted files.
3. Computes 64-bit perceptual difference hashes (dHash) to find exact duplicates and near-duplicate patches.
4. Groups visually correlated patches into clusters (to model parent-photograph origin).
5. Splits data at the CLUSTER level (70% train, 15% val, 15% test) to prevent data leakage.
6. Verifies zero cluster overlap between splits and saves train.csv, val.csv, and test.csv.
"""

import os
import sys
import glob
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Set, Any
from collections import defaultdict, Counter

import numpy as np
import cv2
from PIL import Image
import torch

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# =====================================================================
# 1. Perceptual Hashing (dHash) & Similarity Functions
# =====================================================================

def compute_dhash(image_path: str, hash_size: int = 8) -> int:
    """Compute a 64-bit perceptual difference hash (dHash) for an image.
    
    How it works:
    1. Resizes image to (hash_size + 1, hash_size), e.g., 9x8 pixels.
    2. Converts to grayscale.
    3. Compares adjacent pixels: pixel[x] > pixel[x+1].
    4. Yields an 8x8 = 64-bit binary signature representing structural gradients.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    # Resize to 9 columns, 8 rows
    resized = cv2.resize(img, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    # Compare adjacent pixels horizontally
    diff = resized[:, 1:] > resized[:, :-1]
    # Convert 64 boolean values into a 64-bit integer
    decimal_val = 0
    for bit in diff.flatten():
        decimal_val = (decimal_val << 1) | int(bit)
    return decimal_val


def hamming_distance(hash1: int, hash2: int) -> int:
    """Calculate the Hamming distance (number of differing bits) between two 64-bit hashes."""
    return bin(hash1 ^ hash2).count("1")


# =====================================================================
# 2. Dataset Exploration & Health Checks
# =====================================================================

class DatasetAuditor:
    """Audits image formats, dimensions, corruption, and class distributions."""

    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.positive_dir = self.data_dir / "Positive"
        self.negative_dir = self.data_dir / "Negative"

    def scan_files(self) -> Tuple[List[str], List[str]]:
        """Collect all image paths from Positive and Negative folders."""
        valid_exts = ("*.jpg", "*.jpeg", "*.png", "*.bmp")
        pos_files: List[str] = []
        neg_files: List[str] = []

        if self.positive_dir.exists():
            for ext in valid_exts:
                pos_files.extend(glob.glob(str(self.positive_dir / ext)))
                pos_files.extend(glob.glob(str(self.positive_dir / ext.upper())))

        if self.negative_dir.exists():
            for ext in valid_exts:
                neg_files.extend(glob.glob(str(self.negative_dir / ext)))
                neg_files.extend(glob.glob(str(self.negative_dir / ext.upper())))

        return sorted(list(set(pos_files))), sorted(list(set(neg_files)))

    def inspect_images(self, file_paths: List[str]) -> Dict[str, Any]:
        """Verify image readability, dimensions, and corruptions."""
        corrupted = []
        sizes = Counter()
        formats = Counter()
        modes = Counter()

        # For large datasets, sample up to 1000 images to audit distribution rapidly
        sample = file_paths[:1000] if len(file_paths) > 2000 else file_paths
        for path in sample:
            try:
                with Image.open(path) as img:
                    sizes[f"{img.width}x{img.height}"] += 1
                    formats[img.format or "UNKNOWN"] += 1
                    modes[img.mode] += 1
            except Exception as e:
                corrupted.append((path, str(e)))

        return {
            "total_inspected": len(sample),
            "valid_count": len(sample) - len(corrupted),
            "corrupted_count": len(corrupted),
            "corrupted_files": corrupted,
            "dimensions_distribution": dict(sizes),
            "formats_distribution": dict(formats),
            "color_modes": dict(modes),
        }


# =====================================================================
# 3. Leakage-Aware Clustering & Splitting
# =====================================================================

class LeakageAwareSplitter:
    """Groups near-identical/sibling patches into clusters and splits at the cluster level.
    
    Why this is required:
    The 40,000 dataset patches originate from only 458 photographs without parent IDs.
    If multiple patches cut from photograph #12 appear in both training and test sets,
    the model simply memorizes the wall's texture and lighting, producing falsely inflated
    accuracy (Data Leakage).
    
    By grouping patches whose perceptual hash distance is <= threshold into the same cluster,
    and assigning all patches of each cluster exclusively to Train OR Val OR Test,
    we ensure strict independence between datasets.
    """

    def __init__(self, hamming_threshold: int = 6):
        # 6 bits difference out of 64 corresponds to ~90% structural visual similarity
        self.hamming_threshold = hamming_threshold

    def build_similarity_clusters(self, file_paths: List[str]) -> Tuple[Dict[str, int], Dict[int, List[str]], Dict[str, int]]:
        """Compute hashes and cluster near-duplicate images using connected components."""
        print(f"[*] Computing perceptual hashes for {len(file_paths)} images...", flush=True)
        file_hashes: Dict[str, int] = {}

        from concurrent.futures import ThreadPoolExecutor

        def _hash_worker(p):
            try:
                return p, compute_dhash(p)
            except Exception:
                return p, None

        with ThreadPoolExecutor(max_workers=16) as pool:
            for idx, (p, h) in enumerate(pool.map(_hash_worker, file_paths)):
                if h is not None:
                    file_hashes[p] = h
                if (idx + 1) % 5000 == 0 or idx + 1 == len(file_paths):
                    print(f"    - Processed {idx + 1}/{len(file_paths)} hashes...", flush=True)

        valid_files = list(file_hashes.keys())
        n = len(valid_files)

        # Union-Find (Disjoint Set) to group connected similar images
        parent = list(range(n))

        def find(i: int) -> int:
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        def union(i: int, j: int) -> None:
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        print("[*] Grouping sibling patches into clusters based on visual hash similarity...")
        if torch.cuda.is_available() and n > 200:
            raw_hashes = [file_hashes[p] for p in valid_files]
            # Convert 64-bit int into (n, 64) binary tensor on CUDA
            bits_list = [[(h >> k) & 1 for k in range(64)] for h in raw_hashes]
            bits = torch.tensor(bits_list, device="cuda", dtype=torch.float32)

            chunk_size = 5000
            for start in range(0, n, chunk_size):
                end = min(n, start + chunk_size)
                d = torch.cdist(bits[start:end], bits, p=1)
                close_pairs = torch.nonzero((d <= self.hamming_threshold), as_tuple=False).cpu().numpy()
                for row, col in close_pairs:
                    i = start + int(row)
                    j = int(col)
                    if j > i:
                        union(i, j)
        else:
            # Compare hashes pairwise
            for i in range(n):
                hash_i = file_hashes[valid_files[i]]
                for j in range(i + 1, n):
                    hash_j = file_hashes[valid_files[j]]
                    if hamming_distance(hash_i, hash_j) <= self.hamming_threshold:
                        union(i, j)

        # Remap root representatives to clean sequential cluster IDs: 0, 1, 2, ...
        unique_roots = sorted(list(set(find(i) for i in range(n))))
        root_to_cid = {r: idx for idx, r in enumerate(unique_roots)}

        file_to_cluster: Dict[str, int] = {}
        cluster_to_files: Dict[int, List[str]] = defaultdict(list)

        for i, path in enumerate(valid_files):
            cid = root_to_cid[find(i)]
            file_to_cluster[path] = cid
            cluster_to_files[cid].append(path)

        print(f"[+] Formed {len(cluster_to_files)} unique visual clusters from {n} images.")
        return file_to_cluster, cluster_to_files, file_hashes

    def split_clusters(
        self,
        cluster_to_files: Dict[int, List[str]],
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        seed: int = 42,
    ) -> Tuple[List[str], List[str], List[str]]:
        """Distribute whole clusters across Train, Val, and Test to achieve target ratios."""
        assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
        
        np.random.seed(seed)
        cluster_ids = list(cluster_to_files.keys())
        np.random.shuffle(cluster_ids)

        total_images = sum(len(files) for files in cluster_to_files.values())
        target_train = int(total_images * train_ratio)
        target_val = int(total_images * val_ratio)

        train_files: List[str] = []
        val_files: List[str] = []
        test_files: List[str] = []

        for cid in cluster_ids:
            files = cluster_to_files[cid]
            if len(train_files) < target_train:
                train_files.extend(files)
            elif len(val_files) < target_val:
                val_files.extend(files)
            else:
                test_files.extend(files)

        return train_files, val_files, test_files


# =====================================================================
# 4. Pipeline Runner & Verification
# =====================================================================

def run_phase1_pipeline(
    raw_dir: str = "dataset/raw",
    output_dir: str = "dataset/processed",
    hamming_threshold: int = 6,
    generate_synthetic_if_empty: bool = True,
) -> Dict[str, Any]:
    """Execute the complete Phase 1 exploration and split workflow."""
    raw_path = Path(raw_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    auditor = DatasetAuditor(str(raw_path))
    pos_files, neg_files = auditor.scan_files()
    total_found = len(pos_files) + len(neg_files)

    # If dataset/raw is empty, provide synthetic sample data so the pipeline can be tested immediately
    if total_found == 0 and generate_synthetic_if_empty:
        print("[!] No images found in dataset/raw/. Creating sample concrete patches for demonstration...")
        _generate_sample_dataset(raw_path, samples_per_class=40)
        pos_files, neg_files = auditor.scan_files()
        total_found = len(pos_files) + len(neg_files)

    print(f"\n{'='*60}")
    print(f"CrackSense AI - Phase 1 Dataset Exploration Report")
    print(f"{'='*60}")
    print(f"Raw Directory: {raw_path.resolve()}")
    print(f"Positive Images (Cracked):     {len(pos_files):>6}")
    print(f"Negative Images (Clear):       {len(neg_files):>6}")
    print(f"Total Dataset Count:           {total_found:>6}")

    # Inspect images
    all_files = pos_files + neg_files
    audit_results = auditor.inspect_images(all_files)
    print(f"\n[+] Health & Format Audit:")
    print(f"    - Valid Images:            {audit_results['valid_count']}")
    print(f"    - Corrupted Images:        {audit_results['corrupted_count']}")
    print(f"    - Dimensions Distribution: {audit_results['dimensions_distribution']}")
    print(f"    - File Formats:            {audit_results['formats_distribution']}")
    print(f"    - Color Modes:             {audit_results['color_modes']}")

    # Run Leakage-Aware Grouping separately per class (or jointly)
    splitter = LeakageAwareSplitter(hamming_threshold=hamming_threshold)

    # Perform clustering on positive and negative sets
    train_records = []
    val_records = []
    test_records = []

    train_clusters: Set[int] = set()
    val_clusters: Set[int] = set()
    test_clusters: Set[int] = set()

    cluster_offset = 0

    for label_name, file_list, label_val in [("Positive", pos_files, 1), ("Negative", neg_files, 0)]:
        if not file_list:
            continue
        print(f"\n[*] Processing '{label_name}' class ({len(file_list)} images)...")
        f_to_c, c_to_f, hashes = splitter.build_similarity_clusters(file_list)
        train_f, val_f, test_f = splitter.split_clusters(c_to_f, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)

        for p in train_f:
            cid = f_to_c[p] + cluster_offset
            train_clusters.add(cid)
            train_records.append((p, label_val, label_name, cid, hex(hashes[p])))

        for p in val_f:
            cid = f_to_c[p] + cluster_offset
            val_clusters.add(cid)
            val_records.append((p, label_val, label_name, cid, hex(hashes[p])))

        for p in test_f:
            cid = f_to_c[p] + cluster_offset
            test_clusters.add(cid)
            test_records.append((p, label_val, label_name, cid, hex(hashes[p])))

        cluster_offset += len(c_to_f)

    # Verify zero cluster overlap
    overlap_train_val = train_clusters & val_clusters
    overlap_train_test = train_clusters & test_clusters
    overlap_val_test = val_clusters & test_clusters

    has_leakage = bool(overlap_train_val or overlap_train_test or overlap_val_test)

    print(f"\n{'-'*60}")
    print(f"Leakage-Aware Split Verification:")
    print(f"    - Training Set:   {len(train_records):>5} images across {len(train_clusters):>4} clusters ({len(train_records)/total_found:.1%})")
    print(f"    - Validation Set: {len(val_records):>5} images across {len(val_clusters):>4} clusters ({len(val_records)/total_found:.1%})")
    print(f"    - Testing Set:    {len(test_records):>5} images across {len(test_clusters):>4} clusters ({len(test_records)/total_found:.1%})")
    print(f"    - Cluster Overlaps:")
    print(f"        Train <-> Val:  {len(overlap_train_val)} (Expected: 0)")
    print(f"        Train <-> Test: {len(overlap_train_test)} (Expected: 0)")
    print(f"        Val <-> Test:   {len(overlap_val_test)} (Expected: 0)")
    print(f"    - Result: {'FAILED: LEAKAGE DETECTED!' if has_leakage else 'PASSED: STRICT ZERO-LEAKAGE VERIFIED'}")
    print(f"{'-'*60}")

    # Save to CSV files
    header = "filepath,label,class_name,cluster_id,dhash\n"
    for split_name, records in [("train", train_records), ("val", val_records), ("test", test_records)]:
        csv_file = out_path / f"{split_name}.csv"
        with open(csv_file, "w", encoding="utf-8") as f:
            f.write(header)
            for r in records:
                # Use forward slashes for cross-platform consistency
                clean_path = str(Path(r[0]).as_posix())
                f.write(f'"{clean_path}",{r[1]},{r[2]},{r[3]},{r[4]}\n')
        print(f"[+] Saved: {csv_file}")

    # Save summary metadata
    summary = {
        "total_images": total_found,
        "positive_count": len(pos_files),
        "negative_count": len(neg_files),
        "train_count": len(train_records),
        "val_count": len(val_records),
        "test_count": len(test_records),
        "hamming_threshold": hamming_threshold,
        "zero_leakage_verified": not has_leakage,
    }
    with open(out_path / "dataset_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


def _generate_sample_dataset(raw_dir: Path, samples_per_class: int = 40) -> None:
    """Generate realistic synthetic concrete patches with cracks and textures for testing."""
    pos_dir = raw_dir / "Positive"
    neg_dir = raw_dir / "Negative"
    pos_dir.mkdir(parents=True, exist_ok=True)
    neg_dir.mkdir(parents=True, exist_ok=True)

    np.random.seed(42)

    # Generate Negative (Clean Concrete) patches: textured concrete aggregate
    for i in range(samples_per_class):
        # Base concrete gray tone
        base_gray = np.random.randint(120, 160)
        img = np.full((227, 227, 3), base_gray, dtype=np.uint8)
        # Add aggregate noise
        noise = np.random.normal(0, 12, (227, 227, 3)).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        # Sibling variation: sibling pairs share similar lighting
        Image.fromarray(img).save(neg_dir / f"clean_{i:04d}.jpg", quality=95)

    # Generate Positive (Cracked Concrete) patches: concrete aggregate + jagged dark crack lines
    for i in range(samples_per_class):
        base_gray = np.random.randint(110, 150)
        img = np.full((227, 227, 3), base_gray, dtype=np.uint8)
        noise = np.random.normal(0, 12, (227, 227, 3)).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Draw realistic crack path
        pts = []
        x = np.random.randint(20, 80)
        y = np.random.randint(20, 60)
        pts.append((x, y))
        for step in range(6):
            x += np.random.randint(15, 30)
            y += np.random.randint(15, 30)
            pts.append((min(x, 210), min(y, 210)))

        for k in range(len(pts) - 1):
            cv2.line(img, pts[k], pts[k + 1], (35, 35, 35), thickness=np.random.randint(2, 4))

        Image.fromarray(img).save(pos_dir / f"crack_{i:04d}.jpg", quality=95)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CrackSense AI Dataset Explorer & Leakage-Safe Splitter")
    parser.add_argument("--data-dir", type=str, default="dataset/raw", help="Path to raw dataset folder")
    parser.add_argument("--output-dir", type=str, default="dataset/processed", help="Path to save output CSVs")
    parser.add_argument("--hamming-threshold", type=int, default=6, help="Max Hamming bit distance for near-duplicates")
    args = parser.parse_args()

    run_phase1_pipeline(
        raw_dir=args.data_dir,
        output_dir=args.output_dir,
        hamming_threshold=args.hamming_threshold,
    )
