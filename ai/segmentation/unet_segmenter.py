"""U-Net architecture and inference module for pixel-level concrete crack segmentation (Stage 3)."""

import os
import logging
from typing import Tuple, Dict, Any, Optional
import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image

from ai.preprocessing.transforms import preprocess_for_segmentation

logger = logging.getLogger(__name__)


class DoubleConv(nn.Module):
    """(Convolution => [BN] => ReLU) * 2 block."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


class UNet(nn.Module):
    """Standard U-Net encoder-decoder with skip connections for crack boundary segmentation."""

    def __init__(self, in_channels: int = 3, out_channels: int = 1):
        super().__init__()
        # Encoder
        self.inc = DoubleConv(in_channels, 32)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(32, 64))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.down3 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(128, 256))
        self.down4 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(256, 256))

        # Decoder with skip connections
        self.up1 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.conv1 = DoubleConv(384, 128)

        self.up2 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.conv2 = DoubleConv(192, 64)

        self.up3 = nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2)
        self.conv3 = DoubleConv(96, 32)

        self.up4 = nn.ConvTranspose2d(32, 16, kernel_size=2, stride=2)
        self.conv4 = DoubleConv(48, 16)

        self.outc = nn.Conv2d(16, out_channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5)
        x = self.conv1(torch.cat([x, x4], dim=1))

        x = self.up2(x)
        x = self.conv2(torch.cat([x, x3], dim=1))

        x = self.up3(x)
        x = self.conv3(torch.cat([x, x2], dim=1))

        x = self.up4(x)
        x = self.conv4(torch.cat([x, x1], dim=1))

        return self.outc(x)


class UNetCrackSegmentation:
    """Wrapper for U-Net crack segmentation with computer vision fallback."""

    def __init__(self, weights_path: Optional[str] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = UNet(in_channels=3, out_channels=1).to(self.device)
        self.model.eval()
        self.is_custom_model_loaded = False

        if weights_path and os.path.exists(weights_path):
            try:
                state_dict = torch.load(weights_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.is_custom_model_loaded = True
                logger.info(f"Loaded U-Net crack segmentation weights from {weights_path}")
            except Exception as e:
                logger.warning(f"Could not load U-Net weights from {weights_path}: {e}")

    @torch.inference_mode()
    def segment(self, pil_image: Image.Image, is_crack_hint: bool = True) -> Dict[str, Any]:
        """Perform segmentation on PIL image. Returns binary mask and crack metrics."""
        orig_w, orig_h = pil_image.size
        total_pixels = orig_w * orig_h

        if self.is_custom_model_loaded:
            tensor, _ = preprocess_for_segmentation(pil_image)
            tensor = tensor.to(self.device)
            logits = self.model(tensor)
            prob_mask = torch.sigmoid(logits).squeeze().cpu().numpy()
            binary_mask = (prob_mask > 0.5).astype(np.uint8)
            binary_mask = cv2.resize(binary_mask, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
        elif is_crack_hint:
            binary_mask = self._segment_cv_fallback(pil_image)
        else:
            binary_mask = np.zeros((orig_h, orig_w), dtype=np.uint8)

        crack_pixel_count = int(np.sum(binary_mask > 0))
        crack_percentage = round((crack_pixel_count / total_pixels) * 100, 2)

        # Estimate structural surface severity based on crack density
        if crack_percentage == 0:
            severity = "None"
        elif crack_percentage < 1.0:
            severity = "Low"
        elif crack_percentage < 5.0:
            severity = "Medium"
        else:
            severity = "High"

        return {
            "mask": binary_mask,
            "crack_pixel_count": crack_pixel_count,
            "crack_percentage": crack_percentage,
            "severity": severity,
            "device": str(self.device),
        }

    def _segment_cv_fallback(self, pil_image: Image.Image) -> np.ndarray:
        """Morphological and edge-based crack segmentation fallback."""
        img_np = np.array(pil_image)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY) if len(img_np.shape) == 3 else img_np

        # Edge and ridge enhancement
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 19, 4
        )
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        return (opened > 0).astype(np.uint8)
