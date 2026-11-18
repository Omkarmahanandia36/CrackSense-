"""Fine-tune YOLOv8 on the DamSegment dataset (concrete dams).

Optimized for 6 GB VRAM (NVIDIA RTX 3050):
- Mixed precision (FP16 AMP)
- Batch size 8/16
- Image size 640x640
- Early stopping & test set evaluation
- Automatic checkpoint backup and deployment to models/best_yolo.pt
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
    parser = argparse.ArgumentParser(description="Train YOLOv8 on DamSegment concrete dam dataset")
    parser.add_argument(
        "--data",
        type=str,
        default=str(PROJECT_ROOT / "dataset" / "detection_damsegment" / "data.yaml"),
        help="Path to data.yaml dataset configuration",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n.pt",
        help="Base YOLO checkpoint (yolov8n.pt)",
    )
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (8 fits 6 GB VRAM)")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="0", help="Inference device: '0' or 'cpu'")
    parser.add_argument("--patience", type=int, default=6, help="Early stopping patience")
    return parser.parse_args()


def train_damsegment(
    data_yaml: str,
    base_model: str = "yolov8n.pt",
    epochs: int = 15,
    batch_size: int = 8,
    img_size: int = 640,
    device: str = "0",
    patience: int = 6,
) -> dict:
    if not torch.cuda.is_available():
        device = "cpu"

    print(f"============================================================")
    print(f"[*] Starting YOLOv8 Training on DamSegment (Concrete Dam)")
    print(f"    - Base Model:  {base_model}")
    print(f"    - Dataset:     {data_yaml}")
    print(f"    - Device:      {device} (CUDA: {torch.cuda.is_available()})")
    print(f"    - Batch Size:  {batch_size}")
    print(f"    - Image Size:  {img_size}x{img_size}")
    print(f"    - Epochs:      {epochs} (patience={patience})")
    print(f"============================================================")

    model = YOLO(base_model)

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        device=device,
        patience=patience,
        amp=True,
        workers=2,
        plots=True,
        project=str(PROJECT_ROOT / "runs" / "detect"),
        name="damsegment_yolo",
        exist_ok=True,
        verbose=True,
    )

    save_dir = Path(results.save_dir) if hasattr(results, "save_dir") else PROJECT_ROOT / "runs" / "detect" / "damsegment_yolo"
    best_weights_path = save_dir / "weights" / "best.pt"

    # Backup existing model and copy new best checkpoint
    models_dir = PROJECT_ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    target_best = models_dir / "best_yolo.pt"

    if target_best.exists():
        backup_target = models_dir / "best_yolo_pre_damsegment.pt"
        shutil.copy2(target_best, backup_target)
        print(f"[i] Backed up previous checkpoint to: {backup_target}")

    if best_weights_path.exists():
        shutil.copy2(best_weights_path, target_best)
        print(f"[+] Successfully deployed new best model to: {target_best}")
    else:
        last_weights = save_dir / "weights" / "last.pt"
        if last_weights.exists():
            shutil.copy2(last_weights, target_best)
            print(f"[+] Deployed last epoch model to: {target_best}")

    # Evaluate on held-out test set
    print("\n[*] Evaluating new model on DamSegment test set...")
    val_model = YOLO(str(target_best))
    test_metrics = val_model.val(
        data=data_yaml,
        split="test",
        imgsz=img_size,
        batch=batch_size,
        device=device,
        plots=True,
        project=str(PROJECT_ROOT / "runs" / "detect"),
        name="damsegment_test_val",
        exist_ok=True,
    )

    metrics_dict = {
        "precision": float(test_metrics.results_dict.get("metrics/precision(B)", 0.0)),
        "recall": float(test_metrics.results_dict.get("metrics/recall(B)", 0.0)),
        "mAP50": float(test_metrics.results_dict.get("metrics/mAP50(B)", 0.0)),
        "mAP50-95": float(test_metrics.results_dict.get("metrics/mAP50-95(B)", 0.0)),
    }

    report_path = PROJECT_ROOT / "reports" / "damsegment_training_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=2)

    print("\n============================================================")
    print("[+] Training & Evaluation Complete:")
    print(f"    - Precision: {metrics_dict['precision']:.4f}")
    print(f"    - Recall:    {metrics_dict['recall']:.4f}")
    print(f"    - mAP@50:    {metrics_dict['mAP50']:.4f}")
    print(f"    - mAP@50-95: {metrics_dict['mAP50-95']:.4f}")
    print(f"    - Report:    {report_path}")
    print("============================================================\n")

    return metrics_dict


if __name__ == "__main__":
    args = parse_args()
    train_damsegment(
        data_yaml=args.data,
        base_model=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz,
        device=args.device,
        patience=args.patience,
    )
