"""Parity verification between PyTorch YOLO checkpoint and exported ONNX model."""

import os
import sys
import json
from pathlib import Path
from typing import List, Tuple, Dict, Any
import numpy as np
import cv2
from PIL import Image
import torch
from ultralytics import YOLO
import onnxruntime as ort

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.crack_detector import tile_image_generator

PT_MODEL_PATH = PROJECT_ROOT / "models" / "best_yolo.pt"
ONNX_MODEL_PATH = PROJECT_ROOT / "models" / "onnx" / "best_yolo.onnx"
SAMPLES_DIR = PROJECT_ROOT / "ai" / "export" / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def compute_iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection-over-Union (IoU) between two [x1, y1, x2, y2] bounding boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def run_onnx_inference(session: ort.InferenceSession, tile_crop: Image.Image, conf_thresh: float = 0.35, iou_thresh: float = 0.40) -> List[Dict[str, Any]]:
    """Execute ONNX inference with manual preprocessing, raw tensor decoding, and OpenCV NMS."""
    img_512 = tile_crop.resize((512, 512))
    inp = np.array(img_512, dtype=np.float32) / 255.0
    inp = np.transpose(inp, (2, 0, 1))  # HWC to CHW
    inp = np.expand_dims(inp, axis=0)   # NCHW

    outputs = session.run(["output0"], {"images": inp})
    raw_out = outputs[0][0].T  # (5376, 6)

    boxes = []
    scores = []
    class_ids = []

    for row in raw_out:
        classes_scores = row[4:]
        max_score = float(np.max(classes_scores))
        if max_score >= conf_thresh:
            cx, cy, w, h = row[:4]
            x1 = float(cx - w / 2)
            y1 = float(cy - h / 2)
            boxes.append([x1, y1, float(w), float(h)])
            scores.append(max_score)
            class_ids.append(int(np.argmax(classes_scores)))

    if not boxes:
        return []

    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold=conf_thresh, nms_threshold=iou_thresh)
    onnx_results = []
    if len(indices) > 0:
        for idx in indices.flatten():
            x, y, w, h = boxes[idx]
            onnx_results.append({
                "box": [round(x, 2), round(y, 2), round(x + w, 2), round(y + h, 2)],
                "conf": round(float(scores[idx]), 4),
                "cls": int(class_ids[idx]),
            })

    return onnx_results


def run_pytorch_inference(model: YOLO, tile_crop: Image.Image, conf_thresh: float = 0.35, iou_thresh: float = 0.40) -> List[Dict[str, Any]]:
    """Execute PyTorch inference via Ultralytics."""
    img_512 = tile_crop.resize((512, 512))
    results = model.predict(img_512, conf=conf_thresh, iou=iou_thresh, imgsz=512, verbose=False)[0]
    pt_results = []
    if results.boxes is not None:
        for b in results.boxes:
            xyxy = [round(float(v), 2) for v in b.xyxy[0].tolist()]
            conf = round(float(b.conf[0].item()), 4)
            cls_id = int(b.cls[0].item())
            pt_results.append({
                "box": xyxy,
                "conf": conf,
                "cls": cls_id,
            })
    return pt_results


def run_parity_suite():
    print(f"Loading PyTorch model from {PT_MODEL_PATH}...")
    model_pt = YOLO(str(PT_MODEL_PATH))
    print(f"Loading ONNX model from {ONNX_MODEL_PATH}...")
    session_onnx = ort.InferenceSession(str(ONNX_MODEL_PATH), providers=["CPUExecutionProvider"])

    crack_dir = PROJECT_ROOT / "dataset" / "damsegment" / "DamSegment" / "Damage Classification" / "Damage Classification" / "Crack"
    non_crack_dir = PROJECT_ROOT / "dataset" / "damsegment" / "DamSegment" / "Damage Classification" / "Damage Classification" / "Non-Crack"

    # Select 12 crack images + 8 clean/non-crack images = 20 total
    crack_filenames = ["C (10).jpg", "C (11).jpg", "C (101).jpg", "C (102).jpg", "C (106).jpg", "C (108).jpg", "C (113).jpg", "C (114).jpg", "C (116).jpg", "C (1).jpg", "C (110).jpg", "C (118).jpg"]
    non_crack_filenames = ["N (1).jpg", "N (10).jpg", "N (100).jpg", "N (101).jpg", "N (102).jpg", "N (103).jpg", "N (104).jpg", "N (105).jpg"]

    test_images = []
    for fn in crack_filenames:
        p = crack_dir / fn
        if p.exists():
            test_images.append((p, "Crack"))
    for fn in non_crack_filenames:
        p = non_crack_dir / fn
        if p.exists():
            test_images.append((p, "Clean/Negative"))

    print(f"\nCollected {len(test_images)} test images ({len(crack_filenames)} crack, {len(non_crack_filenames)} clean).")

    total_tiles = 0
    total_torch_boxes = 0
    total_onnx_boxes = 0
    matched_boxes_count = 0
    iou_accum = []
    conf_diff_accum = []
    boxes_only_torch = 0
    boxes_only_onnx = 0

    sample_fixtures = []

    per_image_stats = []

    for img_path, img_type in test_images:
        pil_img = Image.open(img_path).convert("RGB")
        w, h = pil_img.size
        tiles = tile_image_generator(w, h, tile_size=512, overlap=0.20)

        img_torch_cnt = 0
        img_onnx_cnt = 0
        img_matched_cnt = 0

        for tile_idx, (tx1, ty1, tx2, ty2) in enumerate(tiles):
            total_tiles += 1
            tile_crop = pil_img.crop((tx1, ty1, tx2, ty2))

            pt_boxes = run_pytorch_inference(model_pt, tile_crop, conf_thresh=0.35, iou_thresh=0.40)
            onnx_boxes = run_onnx_inference(session_onnx, tile_crop, conf_thresh=0.35, iou_thresh=0.40)

            total_torch_boxes += len(pt_boxes)
            total_onnx_boxes += len(onnx_boxes)
            img_torch_cnt += len(pt_boxes)
            img_onnx_cnt += len(onnx_boxes)

            # Save 3 sample fixtures for A5 requirement if detections found
            if len(sample_fixtures) < 3 and len(pt_boxes) > 0:
                sample_name = f"sample_fixture_{len(sample_fixtures) + 1}.png"
                sample_path = SAMPLES_DIR / sample_name
                tile_crop.resize((512, 512)).save(sample_path)
                fixture_meta = {
                    "image": sample_name,
                    "source_file": img_path.name,
                    "tile_coords": [tx1, ty1, tx2, ty2],
                    "expected_boxes_torch": pt_boxes,
                    "expected_boxes_onnx": onnx_boxes,
                }
                meta_path = SAMPLES_DIR / f"sample_fixture_{len(sample_fixtures) + 1}.json"
                with open(meta_path, "w") as f:
                    json.dump(fixture_meta, f, indent=2)
                sample_fixtures.append(fixture_meta)

            # Match bounding boxes greedily
            matched_onnx_indices = set()
            for pt_b in pt_boxes:
                best_iou = 0.0
                best_onnx_idx = -1
                for o_idx, onnx_b in enumerate(onnx_boxes):
                    if o_idx in matched_onnx_indices:
                        continue
                    iou = compute_iou(pt_b["box"], onnx_b["box"])
                    if iou > best_iou:
                        best_iou = iou
                        best_onnx_idx = o_idx

                if best_iou > 0.5 and best_onnx_idx >= 0:
                    matched_boxes_count += 1
                    img_matched_cnt += 1
                    matched_onnx_indices.add(best_onnx_idx)
                    iou_accum.append(best_iou)
                    conf_diff = abs(pt_b["conf"] - onnx_boxes[best_onnx_idx]["conf"])
                    conf_diff_accum.append(conf_diff)
                else:
                    boxes_only_torch += 1

            unmatched_onnx = len(onnx_boxes) - len(matched_onnx_indices)
            boxes_only_onnx += unmatched_onnx

        per_image_stats.append({
            "image": img_path.name,
            "type": img_type,
            "torch_boxes": img_torch_cnt,
            "onnx_boxes": img_onnx_cnt,
            "matched": img_matched_cnt,
        })

    # Summary calculations
    match_ratio = (matched_boxes_count / total_torch_boxes) if total_torch_boxes > 0 else 1.0
    mean_iou = float(np.mean(iou_accum)) if iou_accum else 1.0
    max_conf_diff = float(np.max(conf_diff_accum)) if conf_diff_accum else 0.0

    pass_match = match_ratio >= 0.95
    pass_iou = mean_iou >= 0.95
    pass_conf = max_conf_diff <= 0.02
    is_pass = pass_match and pass_iou and pass_conf

    status = "PASS" if is_pass else "FAIL"

    print("\n" + "=" * 60)
    print("           CRACKSENSE PYTORCH vs ONNX PARITY REPORT           ")
    print("=" * 60)
    print(f"Tiles tested:             {total_tiles}")
    print(f"Total PyTorch boxes:      {total_torch_boxes}")
    print(f"Total ONNX boxes:         {total_onnx_boxes}")
    print(f"Matched boxes (IoU > 0.5):{matched_boxes_count}")
    print(f"Match ratio:              {match_ratio * 100:.2f}% (Threshold: >= 95.0%) -> {'PASS' if pass_match else 'FAIL'}")
    print(f"Mean IoU of matches:      {mean_iou:.4f} (Threshold: >= 0.9500) -> {'PASS' if pass_iou else 'FAIL'}")
    print(f"Max confidence diff:      {max_conf_diff:.4f} (Threshold: <= 0.0200) -> {'PASS' if pass_conf else 'FAIL'}")
    print(f"Boxes only in PyTorch:    {boxes_only_torch}")
    print(f"Boxes only in ONNX:       {boxes_only_onnx}")
    print("=" * 60)
    print(f"OVERALL PARITY STATUS:    {status}")
    print("=" * 60)

    # Save parity report json
    report_data = {
        "status": status,
        "tiles_tested": total_tiles,
        "total_torch_boxes": total_torch_boxes,
        "total_onnx_boxes": total_onnx_boxes,
        "matched_boxes": matched_boxes_count,
        "match_ratio": round(match_ratio, 4),
        "mean_iou": round(mean_iou, 4),
        "max_confidence_diff": round(max_conf_diff, 4),
        "boxes_only_torch": boxes_only_torch,
        "boxes_only_onnx": boxes_only_onnx,
        "sample_fixtures_count": len(sample_fixtures),
    }

    report_path = PROJECT_ROOT / "ai" / "export" / "parity_report.json"
    with open(report_path, "w") as f:
        json.dump(report_data, f, indent=2)
    print(f"Parity report saved to: {report_path}")

    return report_data


if __name__ == "__main__":
    run_parity_suite()
