"""CrackSense AI - Single Image Inference Predictor.

Loads a trained ResNet-18 checkpoint and performs classification on a concrete photograph
using the EXACT same preprocessing and normalization pipeline used during training.
"""

import sys
import argparse
from pathlib import Path
from typing import Dict, Any, Union
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


def load_model(checkpoint_path: str, device: torch.device) -> torch.nn.Module:
    """Load model architecture and weights from checkpoint file."""
    if not Path(checkpoint_path).exists():
        raise FileNotFoundError(f"Checkpoint not found at '{checkpoint_path}'. Train the model first!")

    model = build_resnet18(pretrained=False)
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
    elif isinstance(checkpoint, dict):
        model.load_state_dict(checkpoint)

    model.to(device)
    model.eval()
    return model


@torch.inference_mode()
def predict_image(
    image_input: Union[str, Path, Image.Image],
    checkpoint_path: str = "models/best_resnet18.pth",
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Classify a single concrete surface patch.
    
    Args:
        image_input: Filepath or PIL Image.
        checkpoint_path: Path to .pth checkpoint file.
        threshold: Decision threshold for crack detection (default 0.5).
        
    Returns:
        Dictionary containing class, is_crack, confidence, and class probabilities.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(checkpoint_path, device)

    if isinstance(image_input, (str, Path)):
        image = Image.open(image_input).convert("RGB")
    else:
        image = image_input.convert("RGB")

    tensor = predict_transform(image).unsqueeze(0).to(device)
    logits = model(tensor)
    probabilities = torch.softmax(logits, dim=1).squeeze(0)

    neg_prob = float(probabilities[0].item())
    pos_prob = float(probabilities[1].item())

    is_crack = pos_prob >= threshold
    confidence = pos_prob if is_crack else neg_prob
    predicted_class = "Positive (Crack)" if is_crack else "Negative (Clear)"

    return {
        "is_crack": is_crack,
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "probabilities": {
            "positive_crack": round(pos_prob, 4),
            "negative_clear": round(neg_prob, 4),
        },
        "device": str(device),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CrackSense AI - Single Image Predictor")
    parser.add_argument("--image", type=str, required=True, help="Path to concrete photograph")
    parser.add_argument("--checkpoint", type=str, default="models/best_resnet18.pth", help="Path to trained .pth weights")
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
    print(f"Inference Device:  {result['device']}")
    print("=" * 50 + "\n")
