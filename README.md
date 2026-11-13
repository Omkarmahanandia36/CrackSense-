
# CrackSense AI – Dam Crack Detection System

An AI-powered concrete crack detection system designed to identify, localise, and visualise cracks on dam concrete surfaces using deep learning and computer vision.

CrackSense AI aims to provide a desktop-based inspection tool where users can upload concrete surface images, analyse them using trained AI models, review detection results, and maintain inspection records.

The project is currently in the initial development stage. Its architecture, AI models, and application features will be developed progressively.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [AI Development Approach](#ai-development-approach)
- [Dataset](#dataset)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Development Roadmap](#development-roadmap)
- [Expected Workflow](#expected-workflow)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)
- [Project Status](#project-status)

---

## Project Overview

Concrete cracks are an important visual indicator that may require further inspection during dam maintenance and assessment. Identifying these cracks manually across large concrete surfaces can be time-consuming.

CrackSense AI is being developed to assist this inspection process through computer vision and deep learning.

The system will analyse uploaded concrete surface images and provide:

- Crack and non-crack classification.
- Visual localisation of detected cracks.
- Pixel-level crack segmentation.
- Prediction confidence scores.
- Inspection history and image records.
- Downloadable inspection reports.

The primary focus is **visual crack detection in concrete dam surfaces**. The system is not intended to replace structural engineers or official dam safety inspection procedures.

## Objectives

1. Develop an AI-based concrete crack detection system.
2. Train deep learning models to distinguish cracked and non-cracked surfaces.
3. Identify and localise visible cracks in uploaded images.
4. Explore pixel-level segmentation for precise crack visualisation.
5. Build a desktop application for image-based inspection.
6. Maintain organised inspection records and generate reports.
7. Evaluate model performance on dam-specific concrete images.

---

## Key Features

The following features are planned for development.

| Feature | Description | Status |
|---|---|---|
| Image Upload | Upload concrete surface images | Planned |
| Crack Classification | Classify images as cracked or non-cracked | Planned |
| Crack Localisation | Identify crack locations using bounding boxes | Planned |
| Crack Segmentation | Highlight crack pixels | Planned |
| Confidence Score | Display model prediction confidence | Planned |
| Image Processing | Prepare and process images using OpenCV | Planned |
| Inspection History | Maintain previous inspection records | Planned |
| Result Visualisation | Compare original and analysed images | Planned |
| PDF Reports | Generate inspection reports | Planned |
| Model Management | Manage trained AI model versions | Planned |

---

## Technology Stack

The project will use the following technologies.

| Component | Technology | Purpose |
|---|---|---|
| Desktop Framework | Electron | Desktop application |
| Frontend | React | User interface |
| Programming Language | TypeScript | Frontend development |
| Backend | Python, FastAPI | API and application logic |
| Deep Learning | PyTorch | Model development and inference |
| Classification | ResNet | Crack / non-crack classification |
| Object Detection | YOLO | Crack localisation |
| Segmentation | U-Net | Pixel-level crack segmentation |
| Image Processing | OpenCV | Image preprocessing and analysis |
| Database | PostgreSQL | Inspection and user records |
| Model Training | Google Colab | GPU-based model training |
| Development Environment | Visual Studio Code | Development and debugging |

---

## System Architecture

CrackSense AI will follow a modular architecture consisting of four major components.

### 1. Desktop Application

Built with Electron, React, and TypeScript.

Responsibilities:
- User authentication.
- Image upload.
- Inspection dashboard.
- AI analysis results.
- Crack visualisation.
- Inspection history.
- Report management.

### 2. Backend API

Built using Python and FastAPI.

Responsibilities:
- Handle frontend requests.
- Validate uploaded images.
- Manage inspection records.
- Execute AI inference.
- Store prediction results.
- Communicate with the database.

### 3. AI Processing Engine

Built using PyTorch and OpenCV.

Responsibilities:
- Image preprocessing.
- Crack classification.
- Crack localisation.
- Crack segmentation.
- Confidence score generation.
- Detection result visualisation.

### 4. Database

PostgreSQL will store application data, including:

- User information.
- Inspection details.
- Image references.
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
       FASTAPI BACKEND
            |
      +-----+------+
      |            |
      v            v
  AI ENGINE     POSTGRESQL
  PyTorch       Database
  OpenCV           |
      |            |
      v            |
  CRACK ANALYSIS   |
      |            |
      +-----+------+
            |
            v
     ANALYSIS RESULTS
            |
            v
    DESKTOP DASHBOARD
```

---

## AI Development Approach

The AI component will be developed in three stages.

### Stage 1: Crack Classification

**Proposed Model:** ResNet

The initial model will classify concrete surface images into two categories:

- Positive: Cracked concrete.
- Negative: Non-cracked concrete.

The model will provide a predicted class and confidence score.

### Stage 2: Crack Localisation

**Proposed Model:** YOLO

The object detection model will identify visible cracks and locate them using bounding boxes.

Expected outputs:

- Crack location.
- Bounding box coordinates.
- Detection confidence.
- Annotated image.

This stage requires images with bounding-box annotations.

### Stage 3: Crack Segmentation

**Proposed Model:** U-Net

The segmentation model will identify the pixel-level boundaries of cracks.

Expected outputs:

- Crack segmentation mask.
- Highlighted crack regions.
- Segmented image.
- Pixel-level evaluation metrics.

This stage requires pixel-level annotated images.

**Note:** ResNet, YOLO, and U-Net are proposed models. They have not yet been implemented or trained in this project.

---

## Dataset

### Initial Dataset

The initial classification phase will use a concrete crack image dataset containing:

| Property | Details |
|---|---|
| Total Images | 40,000 |
| Positive Images | 20,000 |
| Negative Images | 20,000 |
| Image Dimensions | 227 × 227 |
| Image Format | RGB |
| Original Photographs | 458 |
| Dataset Type | Binary Classification |

The dataset consists of cropped image patches derived from original concrete photographs.

### Dataset Preparation

The following steps are planned:

1. Load and inspect the dataset.
2. Verify image dimensions and formats.
3. Identify corrupted images.
4. Check for duplicate and highly similar images.
5. Analyse class distribution.
6. Prepare training, validation, and testing datasets.
7. Apply appropriate image preprocessing.
8. Train and evaluate the classification model.

### Dataset Splitting

The project will use a training, validation, and testing strategy.

Exact split ratios will be finalised during experimentation.

Care will be taken to reduce data leakage between related image patches. Since parent-image mapping is unavailable, image similarity grouping can only serve as an approximation of source-image independence.

### Future Dataset Requirement

The initial dataset is intended for general concrete crack classification.

Additional dam-specific images will be required to evaluate real-world performance on dam surfaces.

YOLO and U-Net will also require their respective bounding-box and pixel-level annotations.

**Dataset Source:** [ADD DETAILS]

---

## Project Structure

The following is the proposed repository structure. It may evolve as development progresses.

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

---

## Installation

The following instructions describe the intended development environment. Final setup commands and dependencies will be confirmed as implementation progresses.

### Prerequisites

Install the following tools:

- Python — [Download](https://www.python.org/downloads/)
- Node.js and npm — [Download](https://nodejs.org/)
- PostgreSQL — [Download](https://www.postgresql.org/download/)
- Git — [Download](https://git-scm.com/)
- Visual Studio Code — [Download](https://code.visualstudio.com/)

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

Activate it.

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

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

Install and configure PostgreSQL.

Create a database for CrackSense AI:

```sql
CREATE DATABASE cracksense_db;
```

Configure the database connection in the environment file.

Database migration and initialisation commands: [ADD DETAILS]

---

## Configuration

Create an environment file using `.env.example` as a reference.

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

- Keep database credentials private.
- Never commit `.env` files.
- Store trained model checkpoints separately from source code where appropriate.
- Configure upload limits and supported image formats.
- Use a strong secret key for authentication.
- Confirm model preprocessing settings match the training pipeline.

---

## Running the Application

The final development commands will depend on the completed backend and frontend configuration.

### Start the Backend

From the project root:

```bash
uvicorn app.main:app --reload
```

The backend entry point and working directory must match the final implementation.

### Start the Frontend

Navigate to:

```bash
cd desktop/frontend
```

Run:

```bash
npm run dev
```

### Start the Desktop Application

The Electron development command will be added after the desktop integration is configured.

**Electron launch command:** [ADD DETAILS]

---

## Expected Workflow

The intended application workflow is:

1. Open CrackSense AI.
2. Select or create an inspection record.
3. Upload a concrete surface image.
4. Start AI-based crack analysis.
5. View the classification result.
6. Review the detected crack locations.
7. Inspect segmentation results when available.
8. Save the analysis.
9. Generate an inspection report.

The system will retain the original uploaded image alongside the AI-generated results.

---

## Model Evaluation

Model performance will be evaluated using appropriate metrics.

| Model | Evaluation Metrics |
|---|---|
| ResNet | Accuracy, Precision, Recall, F1-score, Confusion Matrix |
| YOLO | Precision, Recall, mAP@50, mAP@50-95 |
| U-Net | IoU, Dice Coefficient, Precision, Recall |

Performance will be assessed using separate training, validation, and testing datasets.

Evaluation on dam-specific images will be important before considering practical inspection use.

---

## Development Roadmap

The project will be developed incrementally.

| Phase | Development Activity | Status |
|---|---|---|
| Phase 1 | Project planning and architecture | In Progress |
| Phase 2 | Dataset exploration and preparation | Planned |
| Phase 3 | ResNet classification model | Planned |
| Phase 4 | FastAPI backend development | Planned |
| Phase 5 | Electron and React desktop interface | Planned |
| Phase 6 | YOLO crack localisation | Planned |
| Phase 7 | U-Net crack segmentation | Planned |
| Phase 8 | Database integration | Planned |
| Phase 9 | Inspection history and reporting | Planned |
| Phase 10 | Testing and performance evaluation | Planned |

---

## Limitations

CrackSense AI is intended as an image-based inspection support tool.

The following limitations must be considered:

- Image quality can affect detection accuracy.
- Shadows, stains, surface joints, and concrete texture may cause false detections.
- The initial dataset may not represent all dam surface conditions.
- General concrete crack datasets do not guarantee reliable performance on dam structures.
- Crack width measurements require appropriate image calibration and scale information.
- Visual image analysis cannot independently establish the structural severity of a crack.

AI-generated results must be reviewed by qualified engineering professionals. CrackSense AI is not a certified dam safety assessment system.

---

## Troubleshooting

Common development issues and their resolutions will be documented here as they are identified.

| Issue | Suggested Check |
|---|---|
| Python dependency installation fails | Verify Python version and virtual environment |
| Database connection error | Check PostgreSQL service and connection settings |
| Frontend dependency error | Remove incompatible dependencies and reinstall |
| Model loading error | Verify checkpoint path and model architecture |
| Image upload failure | Check file format, file size, and upload permissions |
| API connection failure | Confirm backend availability and CORS configuration |

For unresolved issues, open a GitHub issue with the error message and relevant environment details.

---

## Contributing

Contributions, suggestions, and technical discussions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your implementation.
5. Commit your changes with a meaningful message.
6. Open a pull request.

Example:

```bash
git checkout -b feature/crack-detection
git add .
git commit -m "Add crack detection module"
git push origin feature/crack-detection
```

For major changes, open an issue first to discuss the proposed implementation.

---

## License

This project does not currently have an open-source license.

**License:** Not yet selected.

Until a license is added, the repository should not be assumed to grant permission to reuse, modify, or distribute its code.

---

## Project Status

**Current Stage:** Initial Development

CrackSense AI is being developed as a desktop-based AI solution for concrete dam surface crack detection.

The immediate priority is to establish a reliable dataset pipeline, develop the initial classification model, and integrate AI inference into the desktop application.

### Future Direction

- Improved crack detection on dam-specific concrete images.
- Better localisation and segmentation performance.
- Reliable inspection record management.
- Model evaluation across different concrete surface conditions.
- Practical testing with real-world inspection images.

---

**CrackSense AI – Dam Crack Detection System**

*AI-based visual analysis for concrete surface inspection.*
