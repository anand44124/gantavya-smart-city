import os
import io
import json
import time
import shutil
import random
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms

CLASSES = [
    "road_infrastructure",
    "sanitation",
    "water_drainage",
    "street_electrical",
    "public_safety",
    "invalid_or_fake",
]
CLASS_TO_IDX = {cls: idx for idx, cls in enumerate(CLASSES)}
IDX_TO_CLASS = {idx: cls for idx, cls in enumerate(CLASSES)}

OUTPUT_DIR = Path("backend/models_weights")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FOLDER_MAPPING = {
    "01_Road_Infrastructure": "road_infrastructure",
    "02_Sanitation": "sanitation",
    "03_Water_and_Drainage": "water_drainage",
    "04_Street_and_Electrical": "street_electrical",
    "05_Public_Safety": "public_safety",
    "06_Fake_and_Invalid_Uploads": "invalid_or_fake",
}

class CivicDataset(Dataset):
    def __init__(self, samples: list[tuple[str, int]], transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with open(path, "rb") as f:
            img = Image.open(f).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label

def collect_training_samples() -> list[tuple[str, int]]:
    samples = []
    dataset_dirs = [
        "/Users/aviyadav/CivicPulse_Demo_Dataset",
        "/Users/aviyadav/Desktop/CivicPulse_Demo_Dataset",
    ]
    
    primary_dir = None
    for d in dataset_dirs:
        if os.path.exists(d):
            primary_dir = d
            break
            
    if not primary_dir:
        raise FileNotFoundError("Could not find CivicPulse_Demo_Dataset on Mac")

    print(f"Loading base images from: {primary_dir}")
    for folder_name, target_class in FOLDER_MAPPING.items():
        folder_path = os.path.join(primary_dir, folder_name)
        if not os.path.exists(folder_path):
            continue
        label_idx = CLASS_TO_IDX[target_class]
        files = [f for f in os.listdir(folder_path) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
        for f in files:
            full_p = os.path.join(folder_path, f)
            samples.append((full_p, label_idx))
            
    print(f"Collected {len(samples)} base images across {len(CLASSES)} classes.")
    return samples

def train_and_export_model():
    print("=" * 60)
    print("🚀 CIVICPULSE CUSTOM VISION MODEL TRAINING & ONNX EXPORT")
    print("=" * 60)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Training on compute device: {device}")

    base_samples = collect_training_samples()

    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        transforms.RandomPerspective(distortion_scale=0.2, p=0.4),
        transforms.GaussianBlur(kernel_size=(3, 3), sigma=(0.1, 2.0)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Multiply dataset with augmentations
    augmented_samples = base_samples * 12
    random.seed(42)
    random.shuffle(augmented_samples)

    train_dataset = CivicDataset(augmented_samples, transform=train_transform)
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, drop_last=False)

    print(f"Initialized Dataset with {len(train_dataset)} augmented training instances.")

    print("Loading pretrained MobileNetV3 backbone...")
    weights = models.MobileNet_V3_Small_Weights.DEFAULT
    model = models.mobilenet_v3_small(weights=weights)

    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, len(CLASSES)),
    )

    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=25)

    epochs = 25
    print(f"\nStarting transfer learning ({epochs} epochs)...")
    start_time = time.time()

    model.train()
    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

        scheduler.step()
        epoch_loss = running_loss / total
        epoch_acc = (correct / total) * 100.0

        if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
            print(f"Epoch [{epoch:02d}/{epochs:02d}] - Loss: {epoch_loss:.4f} | Training Accuracy: {epoch_acc:.1f}%")

    elapsed = time.time() - start_time
    print(f"\n✅ Training completed in {elapsed:.2f} seconds! Final Accuracy: {epoch_acc:.1f}%")

    pt_path = OUTPUT_DIR / "civic_vision_model.pt"
    torch.save(model.state_dict(), pt_path)
    print(f"Saved PyTorch weights: {pt_path}")

    mapping_path = OUTPUT_DIR / "class_mapping.json"
    with open(mapping_path, "w") as f:
        json.dump({
            "classes": CLASSES,
            "class_to_idx": CLASS_TO_IDX,
            "idx_to_class": IDX_TO_CLASS,
            "architecture": "MobileNetV3-Small",
            "input_size": [224, 224],
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        }, f, indent=2)
    print(f"Saved Class Mapping: {mapping_path}")

    print("\nExporting model to ONNX format...")
    model.eval()
    model.to("cpu")
    dummy_input = torch.randn(1, 3, 224, 224, requires_grad=False)
    onnx_path = OUTPUT_DIR / "civic_vision_model.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input_image"],
        output_names=["logits"],
        dynamic_axes={"input_image": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )
    print(f"✅ Exported ONNX model: {onnx_path} (Size: {os.path.getsize(onnx_path) / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    train_and_export_model()
