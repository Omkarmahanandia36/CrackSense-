"""Export CrackSense YOLO checkpoint to ONNX format (static and dynamic)."""

import os
import shutil
from pathlib import Path
import onnx
import onnxruntime as ort
from ultralytics import YOLO

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODEL_PT_PATH = PROJECT_ROOT / "models" / "best_yolo.pt"
OUTPUT_DIR = PROJECT_ROOT / "models" / "onnx"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

STATIC_ONNX_PATH = OUTPUT_DIR / "best_yolo.onnx"
DYNAMIC_ONNX_PATH = OUTPUT_DIR / "best_yolo_dynamic.onnx"


def inspect_onnx_model(onnx_file_path: Path):
    """Load and print details about an exported ONNX model."""
    model_proto = onnx.load(str(onnx_file_path))
    opset = model_proto.opset_import[0].version if model_proto.opset_import else "Unknown"

    session = ort.InferenceSession(str(onnx_file_path), providers=["CPUExecutionProvider"])
    inputs = session.get_inputs()
    outputs = session.get_outputs()

    file_size_bytes = onnx_file_path.stat().st_size
    info = {
        "file": str(onnx_file_path),
        "size_bytes": file_size_bytes,
        "size_mb": round(file_size_bytes / (1024 * 1024), 2),
        "opset": opset,
        "inputs": [{"name": i.name, "shape": i.shape, "type": i.type} for i in inputs],
        "outputs": [{"name": o.name, "shape": o.shape, "type": o.type} for o in outputs],
    }
    return info


def export_models():
    print(f"Loading source model from {MODEL_PT_PATH}...")
    model = YOLO(str(MODEL_PT_PATH))

    # 1. Export Static Model (512x512, opset 12)
    print("\n--- Exporting Static ONNX Model (imgsz=512, dynamic=False) ---")
    exported_static = model.export(
        format="onnx",
        imgsz=512,
        opset=12,
        simplify=True,
        dynamic=False,
        nms=False,
        half=False,
    )
    exported_static_path = Path(exported_static)
    shutil.copy2(exported_static_path, STATIC_ONNX_PATH)
    print(f"Static ONNX model saved to: {STATIC_ONNX_PATH}")
    static_info = inspect_onnx_model(STATIC_ONNX_PATH)
    print("Static Model Info:", static_info)

    # 2. Export Dynamic Model (imgsz=512, dynamic=True)
    print("\n--- Exporting Dynamic ONNX Model (imgsz=512, dynamic=True) ---")
    # Reload model to ensure clean state
    model_dyn = YOLO(str(MODEL_PT_PATH))
    exported_dyn = model_dyn.export(
        format="onnx",
        imgsz=512,
        opset=12,
        simplify=True,
        dynamic=True,
        nms=False,
        half=False,
    )
    exported_dyn_path = Path(exported_dyn)
    shutil.copy2(exported_dyn_path, DYNAMIC_ONNX_PATH)
    print(f"Dynamic ONNX model saved to: {DYNAMIC_ONNX_PATH}")

    # Verify loading dynamic in onnxruntime
    try:
        dyn_info = inspect_onnx_model(DYNAMIC_ONNX_PATH)
        print("Dynamic Model Info:", dyn_info)
        print("Dynamic model verified: successfully loaded in onnxruntime!")
    except Exception as e:
        print(f"Dynamic model loading failed in onnxruntime: {e}")
        if DYNAMIC_ONNX_PATH.exists():
            DYNAMIC_ONNX_PATH.unlink()
        dyn_info = None

    return static_info, dyn_info


if __name__ == "__main__":
    export_models()
