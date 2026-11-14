"""CrackSense AI - Single Image and Full-Resolution Tiled Inference Predictor.

Loads a trained ResNet-18 checkpoint and performs classification.
For full-resolution photos, it tiles the photograph into 227x227 patches with overlap
and aggregates patch predictions so hairline cracks are not lost by resizing.
"""

import sys
import argparse
from pathlib import Path
from typing import Dict, Any, Union, List
from PIL import Image

import torch
import torchvision.transforms as T

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.classification.train import build_resnet18, IMAGE_SIZE, IMAGENET_MEAN, IMAGENET_STD

# Exact same evaluation transform as used in train.py
predict_transform = T.Compose([
    T.Resize(IMAGE_SIZE),
    T.ToTensor(),
    T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

_CACHED_RESNET_MODEL = None
_CACHED_CHECKPOINT_PATH = None


def load_model(checkpoint_path: str, device: torch.device) -> torch.nn.Module:
    """Load model architecture and weights from checkpoint file with caching."""
    global _CACHED_RESNET_MODEL, _CACHED_CHECKPOINT_PATH

    if _CACHED_RESNET_MODEL is not None and _CACHED_CHECKPOINT_PATH == checkpoint_path:
        return _CACHED_RESNET_MODEL

    model = build_resnet18(pretrained=False)

    if Path(checkpoint_path).exists():
        checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        elif isinstance(checkpoint, dict):
            model.load_state_dict(checkpoint)
    else:
        print(f"[!] Warning: Checkpoint '{checkpoint_path}' not found. Using initialized weights.")

    model.to(device)
    model.eval()
    _CACHED_RESNET_MODEL = model
    _CACHED_CHECKPOINT_PATH = checkpoint_path
    return model


@torch.inference_mode()
def tile_and_predict_image(
    image: Image.Image,
    checkpoint_path: str = "models/best_resnet18.pth",
    patch_size: int = 227,
    stride: int = 180,
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Tile a full-resolution concrete image into 227x227 patches and aggregate predictions."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(checkpoint_path, device)

    img_w, img_h = image.size

    # Direct patch evaluation if already patch-sized
    if img_w <= patch_size and img_h <= patch_size:
        tensor = predict_transform(image).unsqueeze(0).to(device)
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0)
        neg_prob = float(probs[0].item())
        pos_prob = float(probs[1].item())
        is_crack = pos_prob >= threshold

        return {
            "is_crack": is_crack,
            "predicted_class": "Positive (Crack)" if is_crack else "Negative (Clear)",
            "confidence": round(pos_prob if is_crack else neg_prob, 4),
            "probabilities": {
                "positive_crack": round(pos_prob, 4),
                "negative_clear": round(neg_prob, 4),
            },
            "patches_analyzed": 1,
            "cracked_patches": 1 if is_crack else 0,
            "device": str(device),
        }

    # Generate tiling coordinates with edge coverage
    x_steps = list(range(0, max(1, img_w - patch_size + 1), stride))
    if len(x_steps) == 0 or x_steps[-1] + patch_size < img_w:
        x_steps.append(max(0, img_w - patch_size))

    y_steps = list(range(0, max(1, img_h - patch_size + 1), stride))
    if len(y_steps) == 0 or y_steps[-1] + patch_size < img_h:
        y_steps.append(max(0, img_h - patch_size))

    # Remove duplicates while preserving order
    x_steps = sorted(list(set(x_steps)))
    y_steps = sorted(list(set(y_steps)))

    patches: List[torch.Tensor] = []
    for y in y_steps:
        for x in x_steps:
            crop = image.crop((x, y, x + patch_size, y + patch_size))
            patches.append(predict_transform(crop))

    # Evaluate patches in batches
    batch_size = 32
    all_pos_probs: List[float] = []
    all_neg_probs: List[float] = []

    for i in range(0, len(patches), batch_size):
        batch_tensor = torch.stack(patches[i:i + batch_size]).to(device)
        logits = model(batch_tensor)
        probs = torch.softmax(logits, dim=1)
        all_neg_probs.extend(probs[:, 0].tolist())
        all_pos_probs.extend(probs[:, 1].tolist())

    pos_tensor = torch.tensor(all_pos_probs)
    max_pos = float(torch.max(pos_tensor).item())
    cracked_patch_count = int((pos_tensor >= threshold).sum().item())

    is_crack = max_pos >= threshold
    confidence = max_pos if is_crack else float(1.0 - max_pos)
    predicted_class = "Positive (Crack)" if is_crack else "Negative (Clear)"

    return {
        "is_crack": is_crack,
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "probabilities": {
            "positive_crack": round(max_pos, 4),
            "negative_clear": round(1.0 - max_pos, 4),
        },
        "patches_analyzed": len(patches),
        "cracked_patches": cracked_patch_count,
        "device": str(device),
    }


@torch.inference_mode()
def predict_image(
    image_input: Union[str, Path, Image.Image],
    checkpoint_path: str = "models/best_resnet18.pth",
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Classify a concrete photograph with automatic tiling for full-resolution images."""
    if isinstance(image_input, (str, Path)):
        image = Image.open(image_input).convert("RGB")
    else:
        image = image_input.convert("RGB")

    return tile_and_predict_image(image, checkpoint_path=checkpoint_path, threshold=threshold)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CrackSense AI - Tiled ResNet Predictor")
    parser.add_argument("--image", type=str, required=True, help="Path to concrete photograph")
    parser.add_argument("--checkpoint", type=str, default="models/best_resnet18.pth", help="Path to weights")
    parser.add_argument("--threshold", type=float, default=0.5, help="Detection threshold")
    args = parser.parse_args()

    result = predict_image(args.image, checkpoint_path=args.checkpoint, threshold=args.threshold)

    print("\n" + "=" * 50)
    print("CrackSense AI - Prediction Result")
    print("=" * 50)
    print(f"Target Image:      {args.image}")
    print(f"Status:            {result['predicted_class']}")
    print(f"Confidence:        {result['confidence']*100:.2f}%")
    print(f"Crack Probability: {result['probabilities']['positive_crack']*100:.2f}%")
    print(f"Clear Probability: {result['probabilities']['negative_clear']*100:.2f}%")
    print(f"Patches Analyzed:  {result.get('patches_analyzed', 1)}")
    print(f"Cracked Patches:   {result.get('cracked_patches', 0)}")
    print(f"Inference Device:  {result['device']}")
    print("=" * 50 + "\n")
