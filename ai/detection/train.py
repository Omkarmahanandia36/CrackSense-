"""Training script for YOLOv8 crack localization (Stage 2) sized for 6 GB VRAM.

Ultralytics YOLOv8 Nano fine-tuning pipeline:
- FP16 Automatic Mixed Precision (AMP)
- Batch size 8/16 optimized for NVIDIA RTX 3050 (6 GB VRAM)
- Early stopping & checkpoint saving to models/best_yolo.pt
- Test set evaluation: Precision, Recall, mAP@50, mAP@50-95
"""

import os
import sys
import json
import shutil
import argparse
from pathlib import Path
import torch
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def parse_args():
    parser = argparse.ArgumentParser(description="Train YOLOv8 for concrete crack localization")
    parser.add_argument(
        "--data",
        type=str,
        default=str(PROJECT_ROOT / "dataset" / "detection" / "data.yaml"),
        help="Path to data.yaml dataset configuration",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n.pt",
        help="Base model checkpoint (yolov8n.pt or yolov8s.pt)",
    )
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (8-16 fits 6 GB VRAM)")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="", help="Inference device: '0', 'cpu', etc.")
    parser.add_argument("--patience", type=int, default=8, help="Early stopping patience")
    return parser.parse_args()


def train_yolo(
    data_yaml: str,
    base_model: str = "yolov8n.pt",
    epochs: int = 15,
    batch_size: int = 8,
    img_size: int = 640,
    device: str = "",
    patience: int = 8,
) -> dict:
    """Train YOLOv8 model and evaluate with precision, recall, and mAP metrics."""
    # 1. Determine optimal device
    if not device:
        device = "0" if torch.cuda.is_available() else "cpu"

    print(f"[*] Starting YOLOv8 Crack Localization Training")
    print(f"    - Base Model:  {base_model}")
    print(f"    - Dataset:     {data_yaml}")
    print(f"    - Device:      {device} (CUDA: {torch.cuda.is_available()})")
    print(f"    - Batch Size:  {batch_size} (6 GB VRAM target)")
    print(f"    - Image Size:  {img_size}x{img_size}")
    print(f"    - Epochs:      {epochs} (patience={patience})")

    # 2. Initialize model
    model = YOLO(base_model)

    # 3. Train with conservative settings for Windows / 6 GB VRAM
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        patience=patience,
        amp=True,  # FP16 mixed precision
        workers=2,  # Safe for Windows
        plots=True,
        project=str(PROJECT_ROOT / "runs" / "detect"),
        name="cracksense_yolo",
        exist_ok=True,
        verbose=True,
    )

    save_dir = Path(results.save_dir) if hasattr(results, "save_dir") else PROJECT_ROOT / "runs" / "detect" / "cracksense_yolo"
    best_weights_path = save_dir / "weights" / "best.pt"

    # 4. Copy best checkpoint to models/
    models_dir = PROJECT_ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    target_best = models_dir / "best_yolo.pt"

    if best_weights_path.exists():
        shutil.copy2(best_weights_path, target_best)
        print(f"[+] Saved best checkpoint to: {target_best}")
    else:
        # Fallback to last.pt or current weights
        last_weights = save_dir / "weights" / "last.pt"
        if last_weights.exists():
            shutil.copy2(last_weights, target_best)
            print(f"[+] Saved checkpoint (last.pt) to: {target_best}")

    # 5. Evaluate on test set
    print("[*] Evaluating trained model on test split...")
    test_metrics = model.val(
        data=data_yaml,
        split="test",
        device=device,
        plots=True,
    )

    # Extract Precision, Recall, mAP50, mAP50-95
    precision = float(test_metrics.box.p[0]) if len(test_metrics.box.p) > 0 else float(test_metrics.box.mp)
    recall = float(test_metrics.box.r[0]) if len(test_metrics.box.r) > 0 else float(test_metrics.box.mr)
    map50 = float(test_metrics.box.map50)
    map50_95 = float(test_metrics.box.map)

    metrics_summary = {
        "model": base_model,
        "epochs": epochs,
        "batch_size": batch_size,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "mAP50": round(map50, 4),
        "mAP50_95": round(map50_95, 4),
        "weights_path": str(target_best),
    }

    print("\n" + "=" * 50)
    print("CrackSense AI - YOLO Stage 2 Evaluation Metrics")
    print("=" * 50)
    print(f"Precision:    {metrics_summary['precision'] * 100:.2f}%")
    print(f"Recall:       {metrics_summary['recall'] * 100:.2f}%")
    print(f"mAP@50:       {metrics_summary['mAP50'] * 100:.2f}%")
    print(f"mAP@50-95:    {metrics_summary['mAP50_95'] * 100:.2f}%")
    print("=" * 50)

    # 6. Save metrics & plots to reports/
    reports_dir = PROJECT_ROOT / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    metrics_file = reports_dir / "yolo_metrics.json"

    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)
    print(f"[+] Saved metrics JSON to: {metrics_file}")

    # Copy validation visualization plot if generated
    val_labels_plot = save_dir / "val_batch0_labels.jpg"
    val_pred_plot = save_dir / "val_batch0_pred.jpg"
    if val_pred_plot.exists():
        shutil.copy2(val_pred_plot, reports_dir / "yolo_val_batch.jpg")
        print(f"[+] Saved sample visual detections plot to: {reports_dir / 'yolo_val_batch.jpg'}")

    return metrics_summary


if __name__ == "__main__":
    args = parse_args()
    train_yolo(
        data_yaml=args.data,
        base_model=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        patience=args.patience,
    )
