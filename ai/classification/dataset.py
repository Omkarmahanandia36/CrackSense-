"""PyTorch Dataset loader and split utilities for the concrete crack dataset."""

import os
from pathlib import Path
from typing import List, Tuple, Optional, Callable
from PIL import Image
import torch
from torch.utils.data import Dataset, random_split

from ai.preprocessing.transforms import classification_transform


class ConcreteCrackDataset(Dataset):
    """PyTorch Dataset for binary concrete crack classification.
    
    Expected folder structure:
        root_dir/
            Positive/ (cracked concrete surface patches)
            Negative/ (clear concrete surface patches)
    """

    def __init__(
        self,
        root_dir: str,
        transform: Optional[Callable] = None,
        samples: Optional[List[Tuple[str, int]]] = None,
    ):
        self.root_dir = Path(root_dir)
        self.transform = transform or classification_transform

        if samples is not None:
            self.samples = samples
        else:
            self.samples = self._load_samples()

    def _load_samples(self) -> List[Tuple[str, int]]:
        samples: List[Tuple[str, int]] = []
        positive_dir = self.root_dir / "Positive"
        negative_dir = self.root_dir / "Negative"

        if positive_dir.exists():
            for p in positive_dir.glob("*.[jJ][pP][gG]"):
                samples.append((str(p), 1))
            for p in positive_dir.glob("*.[pP][nN][gG]"):
                samples.append((str(p), 1))

        if negative_dir.exists():
            for p in negative_dir.glob("*.[jJ][pP][gG]"):
                samples.append((str(p), 0))
            for p in negative_dir.glob("*.[pP][nN][gG]"):
                samples.append((str(p), 0))

        return samples

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        image_path, label = self.samples[idx]
        image = Image.open(image_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


def create_train_val_test_splits(
    dataset: ConcreteCrackDataset,
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[Dataset, Dataset, Dataset]:
    """Split dataset into train, validation, and test subsets."""
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    total_len = len(dataset)
    train_len = int(train_ratio * total_len)
    val_len = int(val_ratio * total_len)
    test_len = total_len - train_len - val_len

    generator = torch.Generator().manual_seed(seed)
    return random_split(dataset, [train_len, val_len, test_len], generator=generator)
