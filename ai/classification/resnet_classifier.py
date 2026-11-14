"""ResNet-based concrete crack classification model (Stage 1)."""

import os
import logging
from typing import Dict, Any, Optional, Tuple
import torch
import torch.nn as nn
from torchvision import models
from PIL import Image

from ai.preprocessing.transforms import preprocess_for_classification

logger = logging.getLogger(__name__)


class ResNetCrackClassifier(nn.Module):
    """ResNet architecture adapted for binary crack classification.
    
    Classes:
        0: Negative (No crack detected)
        1: Positive (Crack detected)
    """

    def __init__(self, architecture: str = "resnet18", pretrained: bool = False, weights_path: Optional[str] = None):
        super().__init__()
        self.architecture = architecture
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        if architecture == "resnet50":
            base_model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT if pretrained else None)
        else:
            base_model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT if pretrained else None)

        num_features = base_model.fc.in_features
        base_model.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, 2),
        )
        self.model = base_model
        self.classes = ["Negative", "Positive"]

        if weights_path and os.path.exists(weights_path):
            self.load_weights(weights_path)
        else:
            if weights_path:
                logger.warning(f"Weights file not found at '{weights_path}'. Running with initialized weights.")

        self.model.to(self.device)
        self.model.eval()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def load_weights(self, weights_path: str) -> None:
        """Load trained state dictionary from disk."""
        try:
            checkpoint = torch.load(weights_path, map_location=self.device)
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["state_dict"])
            elif isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["model_state_dict"])
            elif isinstance(checkpoint, dict):
                self.model.load_state_dict(checkpoint)
            logger.info(f"Loaded ResNet crack classifier weights from {weights_path}")
        except Exception as e:
            logger.error(f"Failed to load weights from {weights_path}: {e}")
            raise

    @torch.inference_mode()
    def predict(self, image: Image.Image) -> Dict[str, Any]:
        """Perform classification inference on a single PIL image."""
        tensor = preprocess_for_classification(image).to(self.device)
        logits = self.forward(tensor)
        probabilities = torch.softmax(logits, dim=1).squeeze(0)

        neg_prob = float(probabilities[0].item())
        pos_prob = float(probabilities[1].item())

        is_crack = pos_prob >= 0.5
        confidence = pos_prob if is_crack else neg_prob
        predicted_class = "Positive" if is_crack else "Negative"

        return {
            "is_crack": is_crack,
            "confidence": round(confidence, 4),
            "predicted_class": predicted_class,
            "probabilities": {
                "positive": round(pos_prob, 4),
                "negative": round(neg_prob, 4),
            },
            "device": str(self.device),
        }
