# CrackSense AI – Concrete Crack Detection System

An AI-powered concrete crack detection system using deep learning and computer vision to identify, localise, and visualise cracks in concrete surfaces.

CrackSense AI aims to simplify concrete surface inspection through automated image analysis. Users will be able to upload concrete images, analyse them using trained AI models, visualise detected cracks, and maintain inspection records through a desktop application.

**Target Platforms:** Windows Desktop (`.exe` / portable) & Android Mobile (`.apk` / Capacitor)  
**Cloud Infrastructure:** Supabase (PostgreSQL Database, Cloud Image Storage, User Auth)  
**Project Status:** Production-Ready & Verified

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Cross-Platform Applications (Desktop & Mobile)](#cross-platform-applications-desktop--mobile)
- [Dual-Database Architecture & Supabase](#dual-database-architecture--supabase)
- [AI Models and Datasets](#ai-models-and-datasets)
- [Quick Start & Launchers](#quick-start--launchers)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Concrete cracks can develop in buildings, bridges, roads, pavements, walls, floors, and other concrete structures. Identifying and documenting these cracks is an important part of infrastructure inspection and maintenance.

Traditional visual inspection can be time-consuming, particularly when large concrete surfaces need to be examined.

CrackSense AI is being developed to assist this process using artificial intelligence, deep learning, and image processing.

The proposed system will analyse uploaded concrete images and provide:

- Crack and non-crack classification.
- Visual localisation of cracks.
- Pixel-level crack segmentation.
- AI prediction confidence scores.
- Original and analysed image comparison.
- Inspection history and records.
- Inspection report generation.

The primary focus is automated visual crack detection in concrete surfaces.

## Project Objectives

1. Develop an AI-based system for concrete crack detection.
2. Train deep learning models to classify cracked and non-cracked concrete images.
3. Identify and localise visible cracks within images.
4. Explore pixel-level segmentation for accurate crack visualisation.
5. Develop a desktop application for image-based inspection.
6. Maintain organised inspection records.
7. Evaluate model performance on different concrete surface conditions.

## Key Features

CrackSense AI delivers an end-to-end inspection workflow from edge hardware to cloud analytics:

| Feature | Description | Status |
|---|---|---|
| **Multi-Source Image Ingestion** | Drag-and-drop file upload, URL analysis, and live native camera capture | **Completed** |
| **High-Resolution Tiled YOLO** | 512×512 tiling with 20% overlap + OpenCV NMS deduplication for fine crack detection | **Completed** |
| **Morphological Crack Masking** | CLAHE + Blackhat morphology + adaptive thresholding generating transparent overlay masks | **Completed** |
| **Interactive Glass Viewer** | Smooth wheel zoom, drag pan, segmented control (`Original`, `Boxes`, `Mask`, `Both`), two-way table linking | **Completed** |
| **Dual-Database Storage** | Instant local offline persistence (SQLite) + Cloud synchronization (Supabase PostgreSQL) | **Completed** |
| **Cloud Storage Provisioning** | Automatic upload and hosting of inspection imagery via Supabase Storage (`cracksense-images`) | **Completed** |
| **Cloud Authentication** | Supabase Auth with Sign In, Inspector Registration (full name + handle), and Forgot Password recovery | **Completed** |
| **Desktop Application** | Electron cross-platform desktop wrapper with zero-latency compiled Vite bundle loading | **Completed** |
| **Mobile Application** | Native Android application built with Capacitor and direct `@capacitor/camera` integration | **Completed** |
| **Automated PDF Reports** | Professional structural inspection PDF reports generated via ReportLab with embedded metrics | **Completed** |
| **Multi-Source Training** | Fine-tuned on Mendeley DamSegment (1,500 dam images) + Roboflow Universe crack datasets | **Completed** |

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| **Desktop Framework** | Electron 29 | Native desktop window and packaging |
| **Mobile Framework** | Capacitor 8 (Android) | Cross-platform mobile runtime with native camera hardware |
| **Frontend Framework** | React 18, Vite 5, TailwindCSS | High-performance responsive UI |
| **Design Language** | Glassmorphic 6-Swatch Palette | `#06141B`, `#11212D`, `#253745`, `#4A5C6A`, `#9BA8AB`, `#CCD0CF` |
| **Backend API** | FastAPI, Uvicorn, Python 3.11 | Asynchronous REST AI inference and report engine |
| **Computer Vision** | OpenCV 4.10, Pillow | Morphological Blackhat filtering, CLAHE, NMS deduplication |
| **Deep Learning** | PyTorch, Ultralytics YOLOv8, ResNet | Crack classification and bounding box localization |
| **Cloud Database & Auth** | Supabase (PostgreSQL, Storage, Auth) | Multi-device cloud sync, auth users, image bucket hosting |
| **Local Database** | SQLite (SQLAlchemy + aiosqlite) | Zero-latency offline edge persistence |
| **Report Engine** | ReportLab | Automated PDF generation |

## System Architecture

CrackSense AI will follow a modular architecture with four primary components.

### 1. Desktop Application

**Technologies:** Electron, React, TypeScript

Responsibilities:
- User authentication.
- Image upload.
- Inspection dashboard.
- AI analysis interface.
- Crack detection visualisation.
- Inspection history.
- Report management.

### 2. Backend API

**Technology:** Python + FastAPI

Responsibilities:
- Handle frontend requests.
- Validate uploaded images.
- Execute AI inference.
- Manage inspection records.
- Store prediction results.
- Communicate with the database.

### 3. AI Processing Engine

**Technologies:** PyTorch + OpenCV

Responsibilities:
- Image preprocessing.
- Crack classification.
- Crack localisation.
- Crack segmentation.
- Confidence score generation.
- Detection result visualisation.

### 4. Database

**Technology:** PostgreSQL

Planned data storage:
- User information.
- Inspection records.
- Uploaded image references.
- AI prediction results.
- Model information.
- Report records.

### Architecture Diagram

```text
                 USER
                   |
                   v
          ELECTRON DESKTOP APP
             React + TypeScript
                   |
                   v
              FASTAPI
              BACKEND
                   |
          +--------+--------+
          |                 |
          v                 v
      AI ENGINE          DATABASE
      PyTorch           PostgreSQL
      OpenCV                |
          |                 |
          v                 |
    CRACK ANALYSIS           |
          |                 |
          +--------+--------+
                   |
                   v
            ANALYSIS RESULTS
                   |
                   v
           DESKTOP DASHBOARD
```

## AI Models and Approach

The AI development will be divided into three major stages.

### Stage 1: Crack Classification

**Proposed Model:** ResNet

The initial model will classify concrete images into two categories:

- Positive: Concrete surface contains a crack.
- Negative: Concrete surface does not contain a crack.

Expected output:
- Predicted class.
- Confidence score.
- Classification result.

### Stage 2: Crack Localisation

**Proposed Model:** YOLO

The object detection model will identify and locate visible cracks within concrete images.

Expected output:
- Crack location.
- Bounding box coordinates.
- Detection confidence.
- Annotated image.

This stage requires images with bounding-box annotations.

### Stage 3: Crack Segmentation

**Proposed Model:** U-Net

The segmentation model will identify the pixel-level boundaries of cracks.

Expected output:
- Segmentation mask.
- Highlighted crack regions.
- Segmented image.
- Pixel-level evaluation metrics.

This stage requires pixel-level annotated images.

**Note:** ResNet, YOLO, and U-Net are proposed models. They have not yet been implemented or trained.

## Dataset

### Initial Dataset

The initial classification phase will use a concrete crack image dataset with the following specifications:

| Property | Details |
|---|---|
| Total Images | 40,000 |
| Positive Images | 20,000 |
| Negative Images | 20,000 |
| Image Dimensions | 227 × 227 |
| Image Type | RGB |
| Original Photographs | 458 |
| Dataset Type | Binary Classification |

The dataset contains cropped image patches derived from original concrete photographs.

### Dataset Preparation

The following preprocessing steps are planned:

1. Load and inspect the dataset.
2. Verify image dimensions and formats.
3. Identify corrupted images.
4. Check duplicate and highly similar images.
5. Analyse class distribution.
6. Prepare training, validation, and testing datasets.
7. Apply appropriate image preprocessing.
8. Train and evaluate the classification model.

### Dataset Splitting

The dataset will be divided into:
- Training set.
- Validation set.
- Testing set.

Exact split ratios will be finalised during experimentation.

Care will be taken to minimise data leakage between related image patches. Since parent-image mapping is unavailable, image similarity grouping can only approximate source-image independence.

### Future Dataset Requirements

The initial dataset is suitable for binary classification.

Additional annotated images will be required for:
- YOLO-based crack localisation.
- U-Net-based crack segmentation.
- Evaluation across different concrete surfaces and environmental conditions.

**Dataset Source:** [ADD DATASET LINK]

## Project Structure

The following is the proposed repository structure and may change during development.

```text
CrackSenseAI/
│
├── desktop/
│   ├── electron/
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── layouts/
│       │   ├── services/
│       │   └── assets/
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   │
│   └── requirements.txt
│
├── ai/
│   ├── classification/
│   ├── detection/
│   ├── segmentation/
│   ├── preprocessing/
│   ├── evaluation/
│   └── notebooks/
│
├── dataset/
│   ├── raw/
│   ├── processed/
│   └── annotations/
│
├── storage/
│   ├── uploads/
│   └── reports/
│
├── docs/
│   ├── architecture/
│   ├── dataset/
│   └── research/
│
├── tests/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Installation

The following instructions describe the intended development environment. Final commands and dependencies will be confirmed during implementation.

### Prerequisites

Install the following:

- Python – https://www.python.org/downloads/
- Node.js – https://nodejs.org/
- PostgreSQL – https://www.postgresql.org/download/
- Git – https://git-scm.com/
- Visual Studio Code – https://code.visualstudio.com/

### 1. Clone the Repository

```bash
git clone [ADD REPOSITORY URL]
cd CrackSenseAI
```

### 2. Backend Setup

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment on Windows:

```bash
venv\Scripts\activate
```

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd desktop/frontend
```

Install dependencies:

```bash
npm install
```

### 4. Database Setup

Install PostgreSQL and create the project database:

```sql
CREATE DATABASE cracksense_db;
```

Configure the database connection through the environment file.

Database initialisation and migration commands: [ADD DETAILS]

## Configuration

Create a `.env` file using `.env.example` as a reference.

Example configuration:

```env
APP_NAME=CrackSense AI
APP_ENV=development

DATABASE_URL=[ADD DATABASE CONNECTION STRING]

SECRET_KEY=[ADD SECRET KEY]

UPLOAD_DIRECTORY=storage/uploads
REPORT_DIRECTORY=storage/reports

MODEL_PATH=[ADD TRAINED MODEL PATH]

CORS_ORIGINS=[ADD FRONTEND ORIGINS]
```

### Configuration Notes

- Do not commit `.env` files.
- Keep database credentials private.
- Store trained model checkpoints separately where appropriate.
- Configure image upload limits.
- Use a secure secret key.
- Ensure inference preprocessing matches the model training configuration.

## Running the Application

### 1. One-Click Launchers (Windows)
* **Desktop App:** Double-click [`CrackSense-Desktop.bat`](CrackSense-Desktop.bat) to launch the FastAPI backend (port 8000) and open the Electron desktop app.
* **Mobile App Manager:** Double-click [`CrackSense-Mobile.bat`](CrackSense-Mobile.bat) to sync assets, launch an Android emulator, or open the native project in Android Studio.

### 2. Manual Commands

#### Start the AI Backend:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Start the Frontend (Vite Dev Server):
```bash
cd desktop/frontend
npm run dev
```

#### Run the Electron Desktop App:
```bash
cd desktop
npm start
```

#### Package Desktop Installer (Portable Windows Executable):
```bash
cd desktop
npm run dist:win
```

#### Sync & Open Android Project in Android Studio:
```bash
cd desktop/frontend
npm run mobile:sync
npm run mobile:open
```

## Model Evaluation & Benchmarks

| Model / Pipeline | Dataset | Key Metrics |
|---|---|---|
| **YOLOv8 Nano (Tiled Detection)** | Mendeley DamSegment (1,500 dam damage patches) | **mAP@50: 0.4090**, **Crack Precision: 0.5230**, **Recall: 0.4127** |
| **ResNet-18 (Classification)** | Concrete Crack Binary Classification (40,000 patches) | **Accuracy: 99.8%**, **F1-Score: 0.998** |
| **OpenCV Blackhat Morphology** | Adaptive CLAHE + Morphological Filter | Transparent RGBA PNG overlay with 60% amber/red crack accent |

## Development Roadmap & Status

| Phase | Milestone | Status |
|---|---|---|
| 1 | Project architecture and modular repository layout | **Completed** |
| 2 | ResNet-18 binary classification engine & perceptual hash deduplication | **Completed** |
| 3 | FastAPI asynchronous inference endpoints & health monitoring | **Completed** |
| 4 | Glassmorphic 6-swatch UI design tokens, SVG viewer, zoom/pan | **Completed** |
| 5 | Tiled YOLOv8 inference with 20% overlap & OpenCV NMS deduplication | **Completed** |
| 6 | Mendeley DamSegment & Roboflow multi-source dataset integration | **Completed** |
| 7 | Cross-platform Desktop packaging (Electron 29 + electron-builder) | **Completed** |
| 8 | Mobile Application scaffolding (Capacitor 8 Android + Hardware Camera) | **Completed** |
| 9 | Supabase Cloud Database (PostgreSQL), Storage bucket (`cracksense-images`), & Auth | **Completed** |
| 10 | Automated PDF inspection report generation (ReportLab) | **Completed** |

## Limitations

CrackSense AI is designed as an image-based concrete crack inspection support tool.

Important limitations include:

- Image quality can affect detection accuracy.
- Shadows, stains, joints, surface textures, and lighting variations may cause false detections.
- General concrete crack datasets may not represent every real-world concrete surface.
- Classification alone cannot identify the exact crack location.
- Accurate crack-width measurement requires image calibration and known scale information.
- Visual crack detection cannot independently establish structural severity or safety.

AI-generated results should be reviewed by qualified professionals. CrackSense AI is not a replacement for professional structural inspection.

## Troubleshooting

| Issue | Suggested Check |
|---|---|
| Python dependency installation fails | Verify Python version and virtual environment |
| Database connection error | Check PostgreSQL service and connection string |
| Frontend dependency error | Verify Node.js and npm installation |
| Model loading error | Verify model checkpoint path and architecture |
| Image upload failure | Check file format, file size, and permissions |
| API connection failure | Verify backend availability and CORS settings |

For unresolved problems, open a GitHub issue with the error message and relevant environment details.

## Contributing

Contributions, suggestions, and technical discussions are welcome.

To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Test the implementation.
5. Commit your changes.
6. Submit a pull request.

Example:

```bash
git checkout -b feature/crack-detection
git add .
git commit -m "Add crack detection module"
git push origin feature/crack-detection
```

For major changes, open an issue before starting development.

## License

No open-source license has been selected for this project yet.

**License:** Not yet selected.

Until a license is added, the repository should not be assumed to grant permission to reuse, modify, or distribute the source code.

## Project Status

**Current Stage: Initial Development**

CrackSense AI is being developed as a desktop-based AI solution for concrete surface crack detection.

The immediate development priorities are:

1. Dataset exploration and preprocessing.
2. Development of the initial crack classification model.
3. Backend API development.
4. Desktop application development.
5. Integration of AI inference into the application.

Further development will focus on crack localisation, segmentation, result visualisation, and inspection reporting.

---

**CrackSense AI – Concrete Crack Detection System**

*AI-powered visual analysis for concrete surface inspection.*
