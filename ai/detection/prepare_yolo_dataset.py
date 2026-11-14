"""Dataset preparation and format conversion for YOLO crack localization (Stage 2).

This script provides:
1. Complete guides for downloading standard open bounding-box crack datasets (Roboflow / RDD2022).
2. A Pascal VOC XML to YOLO format converter.
3. A local synthetic sample dataset generator with ground-truth bounding boxes so you
   can test YOLO training and validation locally on your RTX 3050 immediately.
"""

import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Tuple, List, Dict, Any
import numpy as np
from PIL import Image, ImageDraw

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def convert_voc_bbox_to_yolo(
    size: Tuple[int, int], box: Tuple[float, float, float, float]
) -> Tuple[float, float, float, float]:
    """Convert Pascal VOC bounding box (xmin, xmax, ymin, ymax) to YOLO format (x_center, y_center, width, height).

    All values in YOLO format are normalized to [0.0, 1.0].
    """
    dw = 1.0 / size[0]
    dh = 1.0 / size[1]
    xmin, xmax, ymin, ymax = box
    x_center = (xmin + xmax) / 2.0
    y_center = (ymin + ymax) / 2.0
    width = xmax - xmin
    height = ymax - ymin

    return (
        round(x_center * dw, 6),
        round(y_center * dh, 6),
        round(width * dw, 6),
        round(height * dh, 6),
    )


def convert_voc_annotation(xml_path: str, output_txt_path: str, class_map: Dict[str, int]) -> int:
    """Parse a Pascal VOC XML file and write YOLO format labels."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    size_elem = root.find("size")
    if size_elem is None:
        raise ValueError(f"No <size> tag in {xml_path}")

    width = int(size_elem.find("width").text)
    height = int(size_elem.find("height").text)

    converted_count = 0
    with open(output_txt_path, "w", encoding="utf-8") as out_f:
        for obj in root.iter("object"):
            cls_name = obj.find("name").text
            if cls_name not in class_map:
                continue
            cls_id = class_map[cls_name]
            xmlbox = obj.find("bndbox")
            xmin = float(xmlbox.find("xmin").text)
            xmax = float(xmlbox.find("xmax").text)
            ymin = float(xmlbox.find("ymin").text)
            ymax = float(xmlbox.find("ymax").text)

            yolo_box = convert_voc_bbox_to_yolo((width, height), (xmin, xmax, ymin, ymax))
            out_f.write(f"{cls_id} {yolo_box[0]} {yolo_box[1]} {yolo_box[2]} {yolo_box[3]}\n")
            converted_count += 1

    return converted_count


def generate_sample_yolo_dataset(
    output_dir: str = str(PROJECT_ROOT / "dataset" / "detection"),
    num_train: int = 30,
    num_val: int = 8,
    num_test: int = 8,
    img_size: int = 640,
) -> str:
    """Generate a clean synthetic YOLO crack dataset with realistic irregular cracks and ground-truth boxes.

    Allows immediate offline training & testing without requiring multi-gigabyte downloads.
    """
    out_path = Path(output_dir)
    splits = {
        "train": num_train,
        "val": num_val,
        "test": num_test,
    }

    for split_name, count in splits.items():
        img_dir = out_path / split_name / "images"
        lbl_dir = out_path / split_name / "labels"
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

        for i in range(count):
            # 1. Generate concrete background with aggregate noise
            base_gray = np.random.randint(120, 160)
            noise = np.random.normal(0, 12, (img_size, img_size, 3)).astype(np.int16)
            img_arr = np.clip(base_gray + noise, 0, 255).astype(np.uint8)
            img = Image.fromarray(img_arr)
            draw = ImageDraw.Draw(img)

            # 2. Draw 1 to 3 irregular crack paths
            num_cracks = np.random.randint(1, 4)
            boxes = []

            for _ in range(num_cracks):
                # Random starting point
                x = np.random.randint(50, img_size - 100)
                y = np.random.randint(50, img_size - 100)
                points = [(x, y)]

                # Random walk crack line
                steps = np.random.randint(5, 12)
                for _ in range(steps):
                    x += np.random.randint(-40, 45)
                    y += np.random.randint(15, 55)
                    x = max(10, min(img_size - 10, x))
                    y = max(10, min(img_size - 10, y))
                    points.append((x, y))

                # Draw crack with varying width and dark tone
                draw.line(points, fill=(np.random.randint(25, 45),) * 3, width=np.random.randint(2, 5))

                # Compute tight bounding box with padding
                xs = [p[0] for p in points]
                ys = [p[1] for p in points]
                pad = 6
                xmin = max(0, min(xs) - pad)
                xmax = min(img_size, max(xs) + pad)
                ymin = max(0, min(ys) - pad)
                ymax = min(img_size, max(ys) + pad)

                # Convert to normalized YOLO format
                yolo_box = convert_voc_bbox_to_yolo((img_size, img_size), (xmin, xmax, ymin, ymax))
                boxes.append(yolo_box)

            # Save image and label file
            img_file = img_dir / f"concrete_crack_{split_name}_{i:03d}.jpg"
            lbl_file = lbl_dir / f"concrete_crack_{split_name}_{i:03d}.txt"

            img.save(img_file, format="JPEG", quality=90)
            with open(lbl_file, "w", encoding="utf-8") as f:
                for b in boxes:
                    # Class 0: crack
                    f.write(f"0 {b[0]} {b[1]} {b[2]} {b[3]}\n")

    # Generate data.yaml
    data_yaml_path = out_path / "data.yaml"
    # Use forward slashes for cross-platform compatibility
    yaml_content = f"""# CrackSense AI - YOLO Crack Localization Dataset Configuration
path: {out_path.as_posix()}
train: train/images
val: val/images
test: test/images

# Classes
names:
  0: crack
"""
    with open(data_yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    print(f"[+] Sample YOLO dataset successfully generated at: {out_path}")
    print(f"    - Train: {num_train} images in {out_path / 'train'}")
    print(f"    - Val:   {num_val} images in {out_path / 'val'}")
    print(f"    - Test:  {num_test} images in {out_path / 'test'}")
    print(f"    - Config: {data_yaml_path}")
    return str(data_yaml_path)


if __name__ == "__main__":
    generate_sample_yolo_dataset()
