"""Tiled crack detection, Non-Maximum Suppression (NMS), and morphological crack mask generation."""

import os
import base64
from io import BytesIO
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import cv2
from PIL import Image

from ai.detection.predict import get_yolo_model, render_bounding_boxes
from backend.app.core.config import settings


def tile_image_generator(
    img_w: int,
    img_h: int,
    tile_size: int = 512,
    overlap: float = 0.20,
) -> List[Tuple[int, int, int, int]]:
    """Generate (x1, y1, x2, y2) tile bounds covering the entire image with overlap."""
    if img_w <= tile_size and img_h <= tile_size:
        return [(0, 0, img_w, img_h)]

    step = max(64, int(tile_size * (1.0 - overlap)))
    tiles: List[Tuple[int, int, int, int]] = []

    y_points = list(range(0, max(1, img_h - tile_size + 1), step))
    if not y_points or y_points[-1] + tile_size < img_h:
        y_points.append(max(0, img_h - tile_size))

    x_points = list(range(0, max(1, img_w - tile_size + 1), step))
    if not x_points or x_points[-1] + tile_size < img_w:
        x_points.append(max(0, img_w - tile_size))

    # Remove duplicates preserving order
    y_points = sorted(list(set(y_points)))
    x_points = sorted(list(set(x_points)))

    for y in y_points:
        for x in x_points:
            x2 = min(img_w, x + tile_size)
            y2 = min(img_h, y + tile_size)
            tiles.append((x, y, x2, y2))

    return tiles


def apply_nms(
    boxes: List[Dict[str, Any]],
    iou_threshold: float = 0.40,
) -> List[Dict[str, Any]]:
    """Apply Non-Maximum Suppression (NMS) to eliminate overlapping boxes."""
    if not boxes:
        return []

    rects = []
    scores = []
    for b in boxes:
        w = max(1.0, b["x2"] - b["x1"])
        h = max(1.0, b["y2"] - b["y1"])
        rects.append([int(b["x1"]), int(b["y1"]), int(w), int(h)])
        scores.append(float(b["confidence"]))

    indices = cv2.dnn.NMSBoxes(
        bboxes=rects,
        scores=scores,
        score_threshold=0.0,
        nms_threshold=iou_threshold,
    )

    if len(indices) == 0:
        return []

    kept_indices = indices.flatten() if hasattr(indices, "flatten") else [i[0] for i in indices]
    return [boxes[i] for i in kept_indices]


def merge_adjacent_crack_boxes(
    boxes: List[Dict[str, Any]],
    max_gap_px: float = 16.0,
) -> List[Dict[str, Any]]:
    """Merge elongated bounding boxes that touch or overlap across tile seams."""
    if len(boxes) <= 1:
        return boxes

    merged = list(boxes)
    has_merged = True

    while has_merged:
        has_merged = False
        new_merged = []
        skip_indices = set()

        for i in range(len(merged)):
            if i in skip_indices:
                continue
            box_a = dict(merged[i])
            for j in range(i + 1, len(merged)):
                if j in skip_indices:
                    continue
                box_b = merged[j]

                # Check proximity / adjacency
                x_overlap = (box_a["x1"] <= box_b["x2"] + max_gap_px) and (box_b["x1"] <= box_a["x2"] + max_gap_px)
                y_overlap = (box_a["y1"] <= box_b["y2"] + max_gap_px) and (box_b["y1"] <= box_a["y2"] + max_gap_px)

                if x_overlap and y_overlap:
                    # Merge box_b into box_a
                    box_a["x1"] = min(box_a["x1"], box_b["x1"])
                    box_a["y1"] = min(box_a["y1"], box_b["y1"])
                    box_a["x2"] = max(box_a["x2"], box_b["x2"])
                    box_a["y2"] = max(box_a["y2"], box_b["y2"])
                    box_a["confidence"] = max(box_a["confidence"], box_b["confidence"])
                    skip_indices.add(j)
                    has_merged = True

            new_merged.append(box_a)
        merged = new_merged

    return merged


def generate_morphological_crack_mask(
    pil_image: Image.Image,
    boxes: List[Dict[str, Any]],
) -> Tuple[np.ndarray, str]:
    """Generate high-precision crack mask inside bounding boxes using OpenCV morphology.
    
    Inside each box:
    grayscale -> CLAHE -> blackhat morphology -> adaptive threshold ->
    remove small blobs -> skeletonize/dilate.
    
    Returns:
        binary_mask: (H, W) uint8 array (255 for crack, 0 for background)
        mask_png_base64: Base64-encoded transparent PNG string (white crack pixels, transparent elsewhere)
    """
    img_np = np.array(pil_image)
    img_h, img_w = img_np.shape[:2]
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY) if len(img_np.shape) == 3 else img_np.copy()

    full_mask = np.zeros((img_h, img_w), dtype=np.uint8)

    for b in boxes:
        x1 = max(0, min(img_w - 1, int(b["x1"])))
        y1 = max(0, min(img_h - 1, int(b["y1"])))
        x2 = max(x1 + 1, min(img_w, int(b["x2"])))
        y2 = max(y1 + 1, min(img_h, int(b["y2"])))

        roi = gray[y1:y2, x1:x2]
        if roi.size == 0 or (y2 - y1) < 4 or (x2 - x1) < 4:
            continue

        # 1. CLAHE enhancement
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(roi)

        # 2. Blackhat morphology (highlights dark crack fissures on lighter concrete)
        k_dim = max(3, min(13, (min(roi.shape[:2]) // 4) | 1))
        kernel_bh = cv2.getStructuringElement(cv2.MORPH_RECT, (k_dim, k_dim))
        blackhat = cv2.morphologyEx(enhanced, cv2.MORPH_BLACKHAT, kernel_bh)

        # 3. Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            blackhat,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            15,
            -2,
        )

        # 4. Remove small noise blobs (connected components filter)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(thresh, connectivity=8)
        clean_roi = np.zeros_like(thresh)
        min_blob_area = 12

        for lbl in range(1, num_labels):
            area = stats[lbl, cv2.CC_STAT_AREA]
            if area >= min_blob_area:
                clean_roi[labels == lbl] = 255

        # 5. Dilate slightly for smooth continuous crack visibility
        kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        dilated_roi = cv2.dilate(clean_roi, kernel_dilate, iterations=1)

        # Merge ROI into full image mask
        full_mask[y1:y2, x1:x2] = cv2.bitwise_or(full_mask[y1:y2, x1:x2], dilated_roi)

    # 6. Build transparent RGBA PNG (Crack pixels = white [255, 255, 255, 255], rest = [0, 0, 0, 0])
    rgba = np.zeros((img_h, img_w, 4), dtype=np.uint8)
    rgba[full_mask > 0] = [255, 255, 255, 255]

    success, png_buffer = cv2.imencode(".png", rgba)
    if not success:
        # Fallback via PIL
        buf = BytesIO()
        Image.fromarray(rgba, "RGBA").save(buf, format="PNG")
        mask_png_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    else:
        mask_png_base64 = base64.b64encode(png_buffer).decode("utf-8")

    return full_mask, mask_png_base64


def compute_crack_metrics(full_mask: np.ndarray) -> Dict[str, Any]:
    """Calculate physical crack metrics: skeleton length, max width, mean width, and severity."""
    if full_mask is None or cv2.countNonZero(full_mask) == 0:
        return {
            "estimated_length_px": 0.0,
            "max_width_px": 0.0,
            "mean_width_px": 0.0,
            "severity": "None",
        }

    # 1. Morphological skeletonization to calculate centerline length
    skeleton = np.zeros(full_mask.shape, dtype=np.uint8)
    eroded = full_mask.copy()
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    while True:
        opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, element)
        temp = cv2.subtract(eroded, opened)
        skeleton = cv2.bitwise_or(skeleton, temp)
        eroded = cv2.erode(eroded, element)
        if cv2.countNonZero(eroded) == 0:
            break

    estimated_length = float(cv2.countNonZero(skeleton))

    # 2. Euclidean Distance Transform to compute crack width profile
    dist = cv2.distanceTransform(full_mask, cv2.DIST_L2, 5)
    max_w = round(float(np.max(dist) * 2.0), 2) if np.any(dist > 0) else 0.0
    mean_w = round(float(np.mean(dist[full_mask > 0]) * 2.0), 2) if np.any(full_mask > 0) else 0.0

    # 3. Structural Severity Grade based on crack width and length
    if estimated_length == 0:
        severity = "None"
    elif max_w <= 2.5 and estimated_length < 150:
        severity = "Low"
    elif max_w <= 6.0 or estimated_length < 600:
        severity = "Medium"
    elif max_w > 12.0 or estimated_length > 1500:
        severity = "Critical"
    else:
        severity = "High"

    return {
        "estimated_length_px": estimated_length,
        "max_width_px": max_w,
        "mean_width_px": mean_w,
        "severity": severity,
    }


def detect_cracks_tiled(
    pil_image: Image.Image,
    conf_threshold: float = 0.35,
    tile_size: int = 512,
    overlap: float = 0.20,
    checkpoint_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute tiled crack detection, NMS bounding-box aggregation, and mask generation.

    Returns:
        dict: {
            "image_width": int,
            "image_height": int,
            "verdict": "crack_detected" | "no_crack",
            "confidence": float,
            "detections": list of {"id": int, "confidence": float, "bbox": [x, y, w, h]},
            "boxes": list of {"x1": float, "y1": float, "x2": float, "y2": float, "confidence": float, "label": str},
            "mask_png_base64": str,
            "annotated_image": PIL.Image
        }
    """
    img_w, img_h = pil_image.size
    yolo_model = get_yolo_model(checkpoint_path or settings.YOLO_MODEL_PATH)
    raw_boxes: List[Dict[str, Any]] = []

    tiles = tile_image_generator(img_w, img_h, tile_size=tile_size, overlap=overlap)

    for (tx1, ty1, tx2, ty2) in tiles:
        tile_crop = pil_image.crop((tx1, ty1, tx2, ty2))
        try:
            results = yolo_model.predict(
                tile_crop,
                conf=max(0.15, conf_threshold - 0.10),  # slightly lower per tile before NMS
                iou=0.45,
                verbose=False,
            )
            for r in results:
                if r.boxes is not None:
                    for b in r.boxes:
                        coords = b.xyxy[0].tolist()
                        conf = float(b.conf[0].item())
                        cls_id = int(b.cls[0].item())
                        label = yolo_model.names.get(cls_id, "Crack") if hasattr(yolo_model, "names") else "Crack"

                        # Translate to global coordinates
                        gx1 = round(tx1 + coords[0], 1)
                        gy1 = round(ty1 + coords[1], 1)
                        gx2 = round(tx1 + coords[2], 1)
                        gy2 = round(ty1 + coords[3], 1)

                        raw_boxes.append({
                            "x1": max(0.0, min(float(img_w), gx1)),
                            "y1": max(0.0, min(float(img_h), gy1)),
                            "x2": max(0.0, min(float(img_w), gx2)),
                            "y2": max(0.0, min(float(img_h), gy2)),
                            "confidence": round(conf, 4),
                            "label": label,
                        })
        except Exception as e:
            # Continue scanning other tiles
            continue

    # Fallback to CV morphological detector per tile if YOLO found nothing
    if len(raw_boxes) == 0:
        for (tx1, ty1, tx2, ty2) in tiles:
            tile_crop = pil_image.crop((tx1, ty1, tx2, ty2))
            crop_np = np.array(tile_crop)
            gray = cv2.cvtColor(crop_np, cv2.COLOR_RGB2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
            )
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            filtered = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            contours, _ = cv2.findContours(filtered, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            tile_w = tx2 - tx1
            tile_h = ty2 - ty1

            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < 60:
                    continue
                x, y, w, h = cv2.boundingRect(cnt)
                if (w * h) / (tile_w * tile_h) > 0.85:
                    continue

                conf = round(min(0.65 + (area / 1500.0) * 0.25, 0.95), 4)
                if conf >= conf_threshold:
                    raw_boxes.append({
                        "x1": float(tx1 + x),
                        "y1": float(ty1 + y),
                        "x2": float(tx1 + x + w),
                        "y2": float(ty1 + y + h),
                        "confidence": conf,
                        "label": "Crack Region",
                    })

    # Filter by user confidence threshold
    filtered_boxes = [b for b in raw_boxes if b["confidence"] >= conf_threshold]

    # 1. Non-Maximum Suppression to filter duplicate tile detections
    merged_boxes = apply_nms(filtered_boxes, iou_threshold=0.35)

    # 2. Merge elongated boxes that touch or cross tile seams
    merged_boxes = merge_adjacent_crack_boxes(merged_boxes, max_gap_px=16.0)

    # Sort boxes by confidence descending, keep top 25 regions
    merged_boxes.sort(key=lambda b: b["confidence"], reverse=True)
    merged_boxes = merged_boxes[:25]

    # 3. Generate OpenCV morphological crack mask exclusively inside the detected boxes
    full_mask, mask_png_base64 = generate_morphological_crack_mask(pil_image, merged_boxes)

    # 4. Calculate physical crack dimensions and severity metrics
    metrics = compute_crack_metrics(full_mask)

    # Verdict derived from detections: if any box above threshold -> crack_detected
    verdict = "crack_detected" if len(merged_boxes) > 0 else "no_crack"

    # Overall confidence
    if merged_boxes:
        overall_confidence = round(float(np.mean([b["confidence"] for b in merged_boxes])), 4)
    else:
        overall_confidence = 0.95  # high confidence that it is clear

    # Format detections list with bbox: [x, y, w, h] in original pixel coordinates
    detections: List[Dict[str, Any]] = []
    for idx, b in enumerate(merged_boxes, 1):
        x = round(b["x1"], 1)
        y = round(b["y1"], 1)
        w = round(b["x2"] - b["x1"], 1)
        h = round(b["y2"] - b["y1"], 1)
        detections.append({
            "id": idx,
            "confidence": b["confidence"],
            "bbox": [x, y, w, h],
        })

    annotated_image = render_bounding_boxes(pil_image, merged_boxes)

    return {
        "image_width": img_w,
        "image_height": img_h,
        "verdict": verdict,
        "confidence": overall_confidence,
        "detections": detections,
        "boxes": merged_boxes,
        "mask_png_base64": mask_png_base64,
        "metrics": metrics,
        "annotated_image": annotated_image,
    }
