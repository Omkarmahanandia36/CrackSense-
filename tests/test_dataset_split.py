"""Unit tests for Phase 1: dataset exploration, dHash clustering, and leakage-aware splitting."""

import os
from pathlib import Path
import pandas as pd
from PIL import Image

from ai.preprocessing.explore_and_split import (
    compute_dhash,
    hamming_distance,
    LeakageAwareSplitter,
    run_phase1_pipeline,
)


def test_dhash_computation(tmp_path: Path):
    # Create two identical images
    img1 = Image.new("RGB", (227, 227), color=(128, 128, 128))
    path1 = str(tmp_path / "img1.jpg")
    img1.save(path1)

    hash1 = compute_dhash(path1)
    hash2 = compute_dhash(path1)

    assert isinstance(hash1, int)
    assert hash1 == hash2
    assert hamming_distance(hash1, hash2) == 0


def test_cluster_splitting_zero_overlap():
    splitter = LeakageAwareSplitter(hamming_threshold=6)

    # Mock clusters: cluster 0 has 5 files, cluster 1 has 3 files, cluster 2 has 4 files, etc.
    mock_clusters = {
        i: [f"file_{i}_{j}.jpg" for j in range(4)]
        for i in range(20)
    }

    train_files, val_files, test_files = splitter.split_clusters(
        mock_clusters, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15
    )

    # Extract cluster IDs from filenames
    train_cids = {int(f.split("_")[1]) for f in train_files}
    val_cids = {int(f.split("_")[1]) for f in val_files}
    test_cids = {int(f.split("_")[1]) for f in test_files}

    # Strict isolation assertion: NO cluster should appear in multiple splits
    assert len(train_cids & val_cids) == 0, "Leakage detected between Train and Val!"
    assert len(train_cids & test_cids) == 0, "Leakage detected between Train and Test!"
    assert len(val_cids & test_cids) == 0, "Leakage detected between Val and Test!"

    total_files = len(train_files) + len(val_files) + len(test_files)
    assert total_files == 80


def test_pipeline_execution(tmp_path: Path):
    raw_dir = tmp_path / "raw"
    processed_dir = tmp_path / "processed"

    summary = run_phase1_pipeline(
        raw_dir=str(raw_dir),
        output_dir=str(processed_dir),
        hamming_threshold=6,
        generate_synthetic_if_empty=True,
    )

    assert summary["zero_leakage_verified"] is True
    assert summary["total_images"] > 0

    # Verify generated CSV files
    train_csv = processed_dir / "train.csv"
    val_csv = processed_dir / "val.csv"
    test_csv = processed_dir / "test.csv"

    assert train_csv.exists()
    assert val_csv.exists()
    assert test_csv.exists()

    df_train = pd.read_csv(train_csv)
    df_val = pd.read_csv(val_csv)
    df_test = pd.read_csv(test_csv)

    assert "filepath" in df_train.columns
    assert "label" in df_train.columns
    assert "cluster_id" in df_train.columns
    assert "dhash" in df_train.columns

    # Verify no file appears twice
    all_files = set(df_train["filepath"]) | set(df_val["filepath"]) | set(df_test["filepath"])
    assert len(all_files) == len(df_train) + len(df_val) + len(df_test)

    # Verify no cluster appears in more than one split
    train_clusters = set(df_train["cluster_id"])
    val_clusters = set(df_val["cluster_id"])
    test_clusters = set(df_test["cluster_id"])

    assert len(train_clusters & val_clusters) == 0
    assert len(train_clusters & test_clusters) == 0
    assert len(val_clusters & test_clusters) == 0
