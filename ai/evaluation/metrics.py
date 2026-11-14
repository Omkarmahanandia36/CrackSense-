"""Evaluation metrics for crack classification, detection, and segmentation as defined in project specifications."""

from typing import Dict, Any, Union
import numpy as np
import torch


def compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute Accuracy, Precision, Recall, F1-score, and Confusion Matrix values."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))

    total = tp + tn + fp + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "true_positives": tp,
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
    }


def compute_segmentation_metrics(
    mask_true: Union[np.ndarray, torch.Tensor],
    mask_pred: Union[np.ndarray, torch.Tensor],
    smooth: float = 1e-6,
) -> Dict[str, float]:
    """Compute IoU (Jaccard Index), Dice Coefficient, Precision, and Recall for binary crack segmentation masks."""
    if isinstance(mask_true, torch.Tensor):
        mask_true = mask_true.detach().cpu().numpy()
    if isinstance(mask_pred, torch.Tensor):
        mask_pred = mask_pred.detach().cpu().numpy()

    t = (mask_true > 0).astype(np.float32)
    p = (mask_pred > 0).astype(np.float32)

    intersection = np.sum(t * p)
    union = np.sum(t) + np.sum(p) - intersection
    total_area = np.sum(t) + np.sum(p)

    iou = (intersection + smooth) / (union + smooth)
    dice = (2.0 * intersection + smooth) / (total_area + smooth)

    tp = intersection
    fp = np.sum((t == 0) * (p == 1))
    fn = np.sum((t == 1) * (p == 0))

    precision = (tp + smooth) / (tp + fp + smooth)
    recall = (tp + smooth) / (tp + fn + smooth)

    return {
        "iou": round(float(iou), 4),
        "dice": round(float(dice), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
    }
