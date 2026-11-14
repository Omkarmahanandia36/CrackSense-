"""Unit tests for Phase 2: ResNet-18 training pipeline and single-image predict module."""

import os
from pathlib import Path
import torch
from PIL import Image

from ai.classification.train import (
    build_resnet18,
    CSVConcreteDataset,
    get_transforms,
    run_training_pipeline,
)
from ai.classification.predict import predict_image


def test_dataset_loading():
    train_tf, eval_tf = get_transforms()
    csv_file = "dataset/processed/train.csv"
    assert Path(csv_file).exists(), "train.csv must exist from Phase 1"

    dataset = CSVConcreteDataset(csv_file, transform=eval_tf)
    assert len(dataset) > 0

    tensor, label = dataset[0]
    assert tensor.shape == (3, 227, 227)
    assert label in [0, 1]


def test_resnet18_architecture():
    model = build_resnet18(pretrained=False)
    dummy_input = torch.randn(2, 3, 227, 227)
    logits = model(dummy_input)
    assert logits.shape == (2, 2)


def test_training_and_prediction(tmp_path: Path):
    models_dir = tmp_path / "models"
    reports_dir = tmp_path / "reports"

    # Train for 2 epochs on the existing sample dataset
    metrics = run_training_pipeline(
        csv_dir="dataset/processed",
        output_dir=str(models_dir),
        reports_dir=str(reports_dir),
        epochs=2,
        batch_size=16,
        learning_rate=1e-3,
        patience=2,
        pretrained=False,  # Use random weights for fast offline testing
    )

    # Check metrics structure
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics

    # Check checkpoint file created
    checkpoint_file = models_dir / "best_resnet18.pth"
    assert checkpoint_file.exists()

    # Check plot files created
    assert (reports_dir / "loss_acc_curves.png").exists()
    assert (reports_dir / "confusion_matrix.png").exists()
    assert (reports_dir / "test_metrics.json").exists()

    # Test single-image prediction using the newly trained checkpoint
    sample_img = Image.new("RGB", (227, 227), color=(130, 130, 130))
    pred = predict_image(sample_img, checkpoint_path=str(checkpoint_file))

    assert "is_crack" in pred
    assert "predicted_class" in pred
    assert "confidence" in pred
    assert "probabilities" in pred
    assert 0.0 <= pred["confidence"] <= 1.0

    total_prob = pred["probabilities"]["positive_crack"] + pred["probabilities"]["negative_clear"]
    assert abs(total_prob - 1.0) < 1e-4
