"""Image preprocessing, validation, and visualization transforms for concrete crack inspection."""

from io import BytesIO
from typing import Tuple, List, Optional, Dict, Any
import numpy as np
import cv2
from PIL import Image
import torch
import torchvision.transforms as T

# Standard dimensions from project README (SDNET / Concrete surface specifications)
DEFAULT_INPUT_SIZE: Tuple[int, int] = (227, 227)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "bmp", "webp"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

# ImageNet normalization standard
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# PyTorch classification transform
classification_transform = T.Compose([
    T.Resize(DEFAULT_INPUT_SIZE),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

# PyTorch segmentation input transform
segmentation_transform = T.Compose([
    T.Resize((256, 256)),
    T.ToTensor(),
    T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])


def validate_image(image_bytes: bytes, filename: str = "") -> Tuple[bool, Optional[str], Optional[Image.Image]]:
    """Validate image bytes for format, corruption, and dimensions."""
    if len(image_bytes) == 0:
        return False, "Uploaded image file is empty.", None

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        return False, f"File exceeds maximum allowed size ({MAX_FILE_SIZE_BYTES // (1024*1024)}MB).", None

    if filename:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext and ext not in ALLOWED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}", None

    try:
        pil_image = Image.open(BytesIO(image_bytes))
        pil_image.verify()  # verify integrity
        # Re-open because verify() closes the file
        pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return False, f"Corrupted or invalid image data: {str(e)}", None

    width, height = pil_image.size
    if width < 32 or height < 32:
        return False, f"Image resolution ({width}x{height}) is too small for inspection.", None

    return True, None, pil_image


def enhance_concrete_image(image_np: np.ndarray) -> np.ndarray:
    """Enhance concrete surface contrast using CLAHE and bilateral filtering to accentuate cracks."""
    if len(image_np.shape) == 3 and image_np.shape[2] == 3:
        # Convert BGR/RGB to LAB
        lab = cv2.cvtColor(image_np, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
    else:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(image_np)
    return enhanced


def preprocess_for_classification(pil_image: Image.Image) -> torch.Tensor:
    """Preprocess PIL Image into normalized PyTorch tensor (1, 3, 227, 227)."""
    tensor = classification_transform(pil_image)
    return tensor.unsqueeze(0)


def preprocess_for_segmentation(pil_image: Image.Image) -> Tuple[torch.Tensor, Tuple[int, int]]:
    """Preprocess PIL Image for U-Net segmentation, returning tensor and original size."""
    original_size = pil_image.size  # (width, height)
    tensor = segmentation_transform(pil_image)
    return tensor.unsqueeze(0), original_size


def create_analysis_overlay(
    original_image: Image.Image,
    is_crack: bool,
    confidence: float,
    boxes: Optional[List[Dict[str, Any]]] = None,
    mask: Optional[np.ndarray] = None,
    save_side_by_side: bool = True,
) -> Image.Image:
    """Create annotated visualization overlay and optional side-by-side comparison."""
    orig_np = np.array(original_image)
    overlay_np = orig_np.copy()

    # Apply segmentation mask highlight (translucent red)
    if mask is not None and np.any(mask > 0):
        # Resize mask to original image dimensions if needed
        if mask.shape[:2] != orig_np.shape[:2]:
            mask = cv2.resize(mask.astype(np.uint8), (orig_np.shape[1], orig_np.shape[0]), interpolation=cv2.INTER_NEAREST)

        red_mask = np.zeros_like(orig_np)
        red_mask[mask > 0] = [239, 68, 68]  # Tailwind red-500
        alpha = 0.4
        crack_pixels = mask > 0
        overlay_np[crack_pixels] = cv2.addWeighted(
            orig_np[crack_pixels], 1 - alpha, red_mask[crack_pixels], alpha, 0
        )

    # Draw bounding boxes if present
    if boxes:
        for box in boxes:
            x1, y1, x2, y2 = box.get("x1", 0), box.get("y1", 0), box.get("x2", 0), box.get("y2", 0)
            score = box.get("confidence", 0.0)
            label = box.get("label", "Crack")
            # Draw rectangle
            cv2.rectangle(overlay_np, (int(x1), int(y1)), (int(x2), int(y2)), (239, 68, 68), 2)
            caption = f"{label} {score:.0%}"
            cv2.putText(overlay_np, caption, (int(x1), max(int(y1) - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (239, 68, 68), 1, cv2.LINE_AA)

    # Add status badge at top-left
    badge_color = (239, 68, 68) if is_crack else (34, 197, 94)  # Red for crack, Green for intact
    status_text = f"{'CRACK DETECTED' if is_crack else 'CLEAR'} ({confidence:.1%})"
    cv2.rectangle(overlay_np, (8, 8), (220, 36), (20, 20, 20), -1)
    cv2.putText(overlay_np, status_text, (14, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.5, badge_color, 1, cv2.LINE_AA)

    if save_side_by_side:
        # Create a combined side-by-side comparison: [Original] | [Analyzed Overlay]
        h, w = orig_np.shape[:2]
        combined = np.zeros((h, w * 2, 3), dtype=np.uint8)
        combined[:, :w] = orig_np
        combined[:, w:] = overlay_np
        return Image.fromarray(combined)

    return Image.fromarray(overlay_np)
