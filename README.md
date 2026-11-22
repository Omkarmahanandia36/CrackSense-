# CrackSense AI – Concrete Crack Detection System

[![Version](https://img.shields.io/badge/version-1.3.0-teal.svg)](https://github.com/Omkarmahanandia36/CrackSense-/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Android-blue.svg)](https://github.com/Omkarmahanandia36/CrackSense-)
[![Cloud](https://img.shields.io/badge/AWS%20Cloud-24%2F7%20Serverless%20Lambda-FF9900.svg)](https://aws.amazon.com)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20Python%203.11-009688.svg)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20TailwindCSS-61DAFB.svg)](https://react.dev)
[![Deep Learning](https://img.shields.io/badge/AI-YOLOv8%20%7C%20ResNet--18%20%7C%20OpenCV-EE4C2C.svg)](https://ultralytics.com)
[![Cloud](https://img.shields.io/badge/cloud-Supabase%20%7C%20Cloudinary-3ECF8E.svg)](https://supabase.com)

An AI-powered concrete crack detection system using deep learning and computer vision to identify, localise, and visualise cracks in concrete surfaces. 

CrackSense AI simplifies concrete surface inspection through automated image analysis. Users can upload concrete images, analyse them using trained AI models hosted 24/7 on AWS Lambda, visualise detected cracks, and maintain synchronized inspection records across Windows Desktop and Android Mobile.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [AI Engine & Computer Vision Pipeline](#ai-engine--computer-vision-pipeline)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend & Desktop Setup](#2-frontend--desktop-setup)
  - [3. Android Mobile Setup](#3-android-mobile-setup)
  - [4. Environment Configuration](#4-environment-configuration)
- [Running the Applications](#running-the-applications)
  - [One-Click Windows Launchers](#one-click-windows-launchers)
  - [Manual Execution](#manual-execution)
- [Packaging & Releases](#packaging--releases)
- [In-App Update System](#in-app-update-system)
- [Evaluation & Benchmark Metrics](#evaluation--benchmark-metrics)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Concrete cracks develop naturally across buildings, bridges, roadways, tunnels, dams, floors, and retaining walls due to tensile stress, thermal expansion, shrinkage, settlement, or environmental degradation. Timely detection and regular structural health monitoring prevent catastrophic structural failure and minimize repair expenditures.

Traditional manual inspection requires physical scaffolding, manual measurement, and subjective visual judgment—making it hazardous, labor-intensive, and prone to human inconsistency.

**CrackSense AI** automates and modernizes this workflow with an end-to-end multi-platform application backed by 24/7 cloud intelligence:
1. **Ingest & Stream:** Capture concrete surfaces via direct mobile camera snaps or desktop drag-and-drop. Images are automatically pre-scaled client-side (1600px Lanczos) and streamed directly to Cloudinary via signed HMAC-SHA1 tokens without bottlenecking the API gateway.
2. **Serverless AI Detection:** Cloud-hosted Ultralytics YOLOv8 runs 24/7 inside an AWS Lambda container (`ap-southeast-2`), localizing hairline and structural cracks with sub-second response times.
3. **Telemetry & Mask Overlays:** Returns normalized pixel bounding box telemetry, confidence scores, and visual overlays rendered smoothly in the responsive client UI.
4. **Inspect & Interact:** View results in a responsive glassmorphic multi-mode viewer (`Original`, `Boxes`, `Mask`, `Both`) with real-time zoom, pan, and animated detection chips.
5. **Persist & Sync:** Maintain inspections in a dual-table schema on Supabase PostgreSQL (`inspections` and `detection_boxes`) with strict Row-Level Security (RLS) policies.
6. **Edge & Offline Freedom:** Seamlessly switch between the 24/7 AWS Cloud API and local edge mode (FastAPI + SQLite) for inspections in remote areas without internet access.

---

## Key Features

- **24/7 Serverless Cloud AI (AWS Lambda):** Managed containerized backend powered by AWS Lambda Web Adapter in Sydney (`ap-southeast-2`). Zero idle cost, instant multi-concurrency scaling, and 100% VPS-free maintenance.
- **Client-Direct CDN Offloading:** High-resolution photographs stream directly from mobile and desktop clients to Cloudinary using signed upload parameters, eliminating heavy binary uploads through the application server.
- **Deep YOLOv8 Crack Localization:** Deep learning crack detection trained on extensive structural datasets to pinpoint microscopic fractures and major structural faults with precision bounding boxes.
- **Dual-Table Telemetry Storage:** Supabase PostgreSQL architecture separating high-level inspection records (`inspections`) from granular spatial telemetry (`detection_boxes`) with enforced Row-Level Security (RLS).
- **Interactive Multi-Mode Inspection Viewer:** Smooth scroll zoom, drag-to-pan, 1-click fit-to-view, and segmented switching across `Original`, `Boxes`, `Mask`, and `Both`.
- **Cross-Platform Native Builds:**
  - **Windows Desktop:** Electron 29 NSIS installer (`CrackSense-AI-Setup.exe`) and portable executable with glassmorphic dashboard and offline/cloud backend toggle.
  - **Android Mobile:** Capacitor 8 native Android application (`CrackSense-AI-Mobile.apk`) with hardware camera integration (`@capacitor/camera`) and direct cloud synchronization.
- **Automated Container CI/CD:** Built with Amazon Elastic Container Registry (ECR) and AWS CodeBuild, compiling Docker images directly in the cloud.
- **Offline Edge Fallback:** Built-in SQLite database (`cracksense.db`) and local FastAPI server for continuous operation on remote construction sites without internet connectivity.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Clients["1. Cross-Platform Client Layer"]
        Mobile["Android Mobile Application\n(Capacitor 8 + Hardware Camera)"]
        Desktop["Windows Desktop Application\n(Electron 29 + React 18 + Vite)"]
    end

    subgraph Ingestion["2. Edge Preprocessing & CDN Storage"]
        PreProcess["Client-Side Image Processing\n(1600px Auto-Resize + JPEG Lanczos)"]
        Cloudinary[("Cloudinary Global CDN\n(Signed Direct HTTPS Uploads)")]
    end

    subgraph AWSCloud["3. 24/7 AWS Serverless AI Inference (ap-southeast-2)"]
        LambdaURL["AWS Lambda Function URL\n(Permanent Public HTTPS Gateway)"]
        Adapter["AWS Lambda Web Adapter\n(Zero-Change FastAPI Proxy, Port 7860)"]
        FastAPI["FastAPI AI Engine\n(REST API: /health, /predict, /upload-signature)"]
        YOLO["Ultralytics YOLOv8 Crack Detector\n(Deep Learning Object Localization)"]
        MaskGen["Visual Overlay Engine\n(Bounding Box Telemetry + Cyan Masks)"]
    end

    subgraph DevOps["4. Cloud CI/CD & Registry"]
        ECR["Amazon Elastic Container Registry (ECR)\n(cracksense-api:latest)"]
        CodeBuild["AWS CodeBuild Pipeline\n(Automated Docker Packaging)"]
    end

    subgraph Database["5. Cloud Persistence & Security"]
        SupabaseAuth["Supabase Authentication\n(GoTrue JWT Session Management)"]
        SupabaseDB[("Supabase PostgreSQL Database\n(Inspections & Detection Boxes with RLS)")]
    end

    subgraph OfflineEdge["6. Local Offline Fallback"]
        LocalEngine["Local Python FastAPI Server\n(Port 8000 + Local PyTorch)"]
        LocalDB[("Local SQLite Database\n(cracksense.db)")]
    end

    %% Client flows
    Mobile -->|"1. Snap/Select"| PreProcess
    Desktop -->|"1. Import/Drop"| PreProcess
    PreProcess -->|"2. Request Signature"| LambdaURL
    PreProcess -->|"3. Direct Stream"| Cloudinary

    %% Cloud AI flows
    Cloudinary -->|"4. Image URL"| LambdaURL
    LambdaURL --> Adapter
    Adapter --> FastAPI
    FastAPI --> YOLO
    YOLO --> MaskGen
    MaskGen -->|"5. Detection Telemetry (Boxes & Confidence)"| Clients

    %% Cloud Storage & Auth
    Clients -->|"6. Sync Inspection Data"| SupabaseDB
    Clients -->|"Authenticate"| SupabaseAuth

    %% CI/CD
    CodeBuild -->|"Build & Push"| ECR
    ECR -->|"Deploy Container Image"| AWSCloud

    %% Offline Edge Fallback
    Desktop -.->|"Offline Mode"| LocalEngine
    LocalEngine -.-> LocalDB
```

### Architectural Highlights

1. **Client Layer (Mobile & Desktop):**
   - Built on React 18, TypeScript, and TailwindCSS using a custom glassmorphism design system.
   - **Android:** Native Capacitor 8 wrapper compiling to Android SDK 34 (`CrackSense-AI-Mobile.apk`). Direct hardware camera invocation and photo gallery selection.
   - **Windows:** Electron 29 desktop wrapper packaged with NSIS installer (`CrackSense-AI-Setup.exe`).
2. **Direct Edge CDN Offloading:**
   - Inspection photos are scaled client-side to a maximum dimension of 1600px with 85% JPEG Lanczos compression.
   - Clients request signed HMAC-SHA1 upload signatures from `/upload-signature`, streaming directly to Cloudinary. This bypasses the API gateway for file transfers, keeping server payload sizes strictly under JSON limits.
3. **24/7 Managed Serverless AI (AWS Lambda):**
   - Packaged with **AWS Lambda Web Adapter** listening on `PORT=7860`.
   - Direct HTTPS invocations through AWS Lambda Function URLs (`https://ai57lwrkaxpvcfaevaehnnxkfu0xmbxp.lambda-url.ap-southeast-2.on.aws`).
   - Zero idle resource consumption; warm execution latency of under 5 milliseconds.
4. **Cloud Persistence (Supabase PostgreSQL):**
   - Two normalized tables: `inspections` (inspection timestamp, severity, Cloudinary URL) and `detection_boxes` (crack coordinates `x`, `y`, `width`, `height`, confidence score, label).
   - Row-Level Security (RLS) protects data isolation across user sessions and authenticated roles.
5. **Autonomous DevOps Pipeline:**
   - Amazon ECR stores versioned container images.
   - AWS CodeBuild automates container build and push cycles triggered directly by cloud commands.

---

## AI Engine & Computer Vision Pipeline

CrackSense AI processes inspection images through an optimized pipeline:

```
[Raw Concrete Photograph]
         │
         ▼
[EXIF Transposition & Normalization]
         │
         ├───► [Tiled YOLOv8 Inference (512×512, 20% Overlap)]
         │             │
         │             ▼
         │      [OpenCV Seam-Merging NMS] ──► [Global Crack Bounding Boxes]
         │
         └───► [CLAHE Contrast Normalization]
                       │
                       ▼
               [Blackhat Morphological Filter]
                       │
                       ▼
               [Adaptive Thresholding & Skeletonization]
                       │
                       ├──► [Transparent RGBA Mask (Amber/Red Accent)]
                       └──► [Metrics: Estimated Length, Max/Mean Width, Severity]
```

### 1. High-Resolution Overlapping Tiling
To detect fine hairline fractures without downsampling blur, high-resolution photographs are partitioned into $512 \times 512$ pixel patches with a $20\%$ spatial stride overlap.

### 2. Seam-Merging Non-Maximum Suppression (NMS)
Crack bounding boxes predicted across adjacent tiles are translated back into global image coordinates and clustered using an intersection-over-union (IoU) threshold of $0.45$, merging split cracks into coherent detection boxes.

### 3. Morphological Crack Mask Extraction
- **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Amplifies subtle dark fissures against varying concrete textures.
- **Blackhat Transform:** Isolates thin dark features narrower than the structuring element kernel.
- **Morphological Skeletonization:** Traces the medial topological axis of detected cracks to measure total pixel length and calculate local cross-sectional widths.

---

## Technology Stack

| Layer | Component | Technologies |
|---|---|---|
| **Desktop Client** | Desktop Container | Electron 29, `electron-builder`, `electron-updater` |
| **Mobile Client** | Android Runtime | Capacitor 8, Android SDK 34+, `@capacitor/camera`, `@capacitor/app` |
| **Frontend UI** | Interface & Styling | React 18, TypeScript, Vite 5, TailwindCSS, Lucide Icons |
| **Design Language** | Glassmorphism | Custom CSS Design Tokens (`#06141B`, `#11212D`, `#253745`, `#4A5C6A`) |
| **Backend API** | REST AI Engine | Python 3.11, FastAPI, Uvicorn, Pydantic v2 |
| **Computer Vision** | Image Processing | OpenCV 4.10, Pillow, NumPy |
| **Deep Learning** | Models | Ultralytics YOLOv8 (Detection), PyTorch ResNet-18 (Classification) |
| **Cloud AI Hosting** | 24/7 Managed Serverless | AWS Lambda Container (ap-southeast-2), AWS Lambda Web Adapter, ECR, CodeBuild |
| **Local Database** | Edge Persistence | SQLite (SQLAlchemy 2.0 Async, aiosqlite, Alembic) |
| **Cloud Infrastructure** | Cloud Services | Supabase (PostgreSQL, GoTrue Auth, Storage), Cloudinary SDK |
| **Report Generation** | Structural PDFs | ReportLab |

---

## Repository Structure

```text
CrackSense/
├── CrackSense-Desktop.bat          # One-click Windows launcher (FastAPI + Electron)
├── CrackSense-Mobile.bat           # One-click Mobile build & sync launcher
├── README.md                       # Comprehensive project documentation
├── RELEASING.md                    # Multi-platform release runbook
├── alembic.ini                     # Database migration configuration
├── docker-compose.yml              # Container orchestration
│
├── ai/                             # Machine Learning & Computer Vision
│   ├── classification/             # ResNet-18 training, evaluation, & inference
│   ├── detection/                  # YOLOv8 training, tiling, dataset merging, & NMS
│   ├── evaluation/                 # Metrics calculation (mAP, F1, precision, recall)
│   ├── export/                     # ONNX export, latency benchmarks, parity tests
│   └── preprocessing/              # CLAHE transforms, image split, perceptual hashing
│
├── backend/                        # FastAPI REST AI Application
│   ├── app/
│   │   ├── api/endpoints/          # /analyze, /inspections, /health, /auth, /models
│   │   ├── core/                   # config.py, database.py, security.py
│   │   ├── models/                 # SQLAlchemy ORM models (Inspection, Prediction, User)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # crack_detector.py, ai_engine.py, supabase_service.py
│   │   └── main.py                 # FastAPI application root & CORS setup
│   └── requirements.txt            # Python dependencies
│
├── desktop/                        # Cross-Platform Clients
│   ├── electron/
│   │   ├── main.js                 # Electron main process + Python backend auto-spawner
│   │   └── preload.js              # IPC contextBridge (auto-updater APIs)
│   ├── build/                      # Windows executable application icons (.ico, .png)
│   ├── package.json                # Electron & builder configuration
│   └── frontend/                   # Shared React 18 + Capacitor Application
│       ├── android/                # Native Android Studio Capacitor project
│       ├── src/
│       │   ├── components/         # GlassPanel, UpdateStatus, ServerConfigModal, Navbar
│       │   ├── pages/              # Dashboard, UploadAnalyze, History, ResultView
│       │   ├── services/           # api.ts (dynamic IP / native detection), supabase.ts, updater.ts
│       │   └── App.tsx             # Routing & update initialization
│       ├── capacitor.config.ts     # Capacitor app configuration
│       └── vite.config.ts          # Vite build config with version injection
│
├── models/                         # Model Checkpoint Registry
│   ├── onnx/model_meta.json        # ONNX export metadata
│   └── .gitkeep                    # Model binaries (.pt, .pth, .onnx) gitignored
│
├── reports/                        # Visual Training & Benchmark Outputs
│   ├── confusion_matrix.png
│   ├── loss_acc_curves.png
│   ├── sample_detection_output.jpg
│   └── yolo_metrics.json
│
├── storage/                        # Edge File System Storage
│   ├── uploads/.gitkeep            # Stored original concrete images
│   └── reports/.gitkeep            # Stored generated PDF inspection reports
│
├── supabase/                       # Cloud Migrations & Edge Functions
│   ├── migrations/
│   │   ├── 001_online_mode.sql     # PostgreSQL inspections, detections, RLS policies
│   │   └── 002_app_versions.sql    # In-app update distribution & semver checking table
│   └── schema.sql                  # Consolidated database schema
│
└── tests/                          # Automated Pytest Suite
    ├── test_ai_engine.py           # Unit tests for inference & image preprocessing
    ├── test_backend.py             # Integration tests for FastAPI endpoints
    ├── test_detection.py           # Tiling, seam-merging NMS, & bbox tests
    └── test_tiling_highlighting.py # OpenCV mask & skeletonization tests
```

---

## Getting Started

### Prerequisites

Ensure the following tools are installed:
- **Python:** 3.10 or 3.11 ([python.org](https://www.python.org/downloads/))
- **Node.js:** 18 LTS or 20 LTS ([nodejs.org](https://nodejs.org/))
- **Git:** ([git-scm.com](https://git-scm.com/))
- **Android Studio** *(for mobile development only)*: Hedgehog or newer with Android SDK 34+.

---

### 1. Backend Setup

Clone the repository:
```bash
git clone https://github.com/Omkarmahanandia36/CrackSense-.git
cd CrackSense-
```

Create and activate a Python virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

Verify backend installation:
```bash
python -m pytest tests/test_health.py
```

---

### 2. Frontend & Desktop Setup

Navigate to the frontend directory and install dependencies:
```bash
cd desktop/frontend
npm install
```

Navigate to the desktop Electron directory and install wrapper dependencies:
```bash
cd ../
npm install
```

---

### 3. Android Mobile Setup

Install Android build requirements in the frontend folder:
```bash
cd desktop/frontend
npm run build
npx cap sync android
```

To open the project in Android Studio:
```bash
npx cap open android
```

---

### 4. Environment Configuration

Create a `.env` file in the project root based on `.env.example`:
```bash
copy .env.example .env
```

Key environment configuration variables:
```env
# Application Settings
APP_NAME="CrackSense AI"
APP_ENV=development
SECRET_KEY=your_secure_secret_key_here

# Server Bindings
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Local Storage Paths
UPLOAD_DIRECTORY=storage/uploads
REPORT_DIRECTORY=storage/reports

# Model Checkpoint Paths
YOLO_MODEL_PATH=models/best_yolo.pt
RESNET_MODEL_PATH=models/best_resnet18.pth

# Supabase Cloud Synchronization (Optional for Online Mode)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_BUCKET=cracksense-images

# Cloudinary Cloud Asset Delivery (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Running the Applications

### One-Click Windows Launchers

- **Desktop Application:** Double-click [`CrackSense-Desktop.bat`](CrackSense-Desktop.bat). It verifies the virtual environment, launches the FastAPI backend in the background on port 8000, and opens the Electron desktop app.
- **Mobile Manager:** Double-click [`CrackSense-Mobile.bat`](CrackSense-Mobile.bat). Provides an interactive menu to sync assets, launch the Android emulator, or open Android Studio.

---

### Manual Execution

#### 1. Start the FastAPI AI Backend:
```bash
venv\Scripts\activate
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API documentation is available at `http://localhost:8000/docs`.*

#### 2. Start the Frontend Dev Server:
```bash
cd desktop/frontend
npm run dev
```
*Access the web app at `http://localhost:5173`.*

#### 3. Launch the Electron Desktop App:
```bash
cd desktop
npm start
```
*Note: In production builds (`CrackSense AI.exe`), the Electron main process automatically detects port 8000 and auto-spawns the Python backend in the background.*

#### 4. Configure Mobile Connection:
When running the Android APK on a physical phone:
1. Ensure the phone and PC are connected to the same Wi-Fi network.
2. Tap the **Server Status** badge in the mobile navigation bar to open the **Server Connection Settings** modal.
3. Enter your PC's local network IP address (e.g. `http://192.168.1.100:8000`) and tap **Test Connection & Save**.

---

## Packaging & Releases

Detailed release procedures are documented in [RELEASING.md](file:///D:/CrackSense/RELEASING.md).

### Package Windows Desktop Installer:
```bash
cd desktop
npm run release:win
```
Outputs installer and portable binaries in `desktop/dist-electron/`:
- `CrackSense AI Setup 1.1.0.exe` (NSIS interactive installer)
- `CrackSense AI 1.1.0.exe` (Portable executable)
- `latest.yml` (Auto-update manifest)

### Package Android Release APK:
```bash
cd desktop/frontend
npm run release:android:build
```
Outputs release APK at `desktop/frontend/android/app/build/outputs/apk/release/app-release.apk`.

---

## In-App Update System

CrackSense AI includes a synchronized in-app update mechanism across platforms:

```mermaid
sequenceDiagram
    autonumber
    actor User as Inspector
    participant App as CrackSense App
    participant Supa as Supabase (app_versions)
    participant GH as GitHub Releases

    App->>App: Launch & read local version (v1.1.0)
    alt Android Platform
        App->>Supa: SELECT latest_version, min_supported_version FROM app_versions
        Supa-->>App: Return version record & apk_url
        alt installed < min_supported_version
            App->>User: Display blocking "Update Required" dialog
        else installed < latest_version
            App->>User: Display "Update Available" notification modal
            User->>App: Click "Download APK"
            App->>User: Open apk_url in browser for direct download
        end
    else Windows Desktop Platform
        App->>GH: Check latest.yml via electron-updater
        GH-->>App: New version available
        App->>User: Show update badge & release notes
        User->>App: Click "Download Update"
        App->>GH: Download differential delta in background
        App->>User: Prompt "Restart to Update"
        User->>App: Click "Restart & Install"
        App->>App: Quit and execute NSIS patch
    end
```

### Version Update Database Schema
The database tracks released versions in Supabase table `public.app_versions`:
```sql
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('android', 'windows')),
    latest_version TEXT NOT NULL,
    min_supported_version TEXT NOT NULL,
    apk_url TEXT,
    release_notes TEXT,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## Evaluation & Benchmark Metrics

| Model / Pipeline | Dataset / Domain | Metrics & Performance |
|---|---|---|
| **YOLOv8 Nano (Tiled Detection)** | Mendeley DamSegment (1,500 dam damage patches) + Roboflow | **mAP@50: 0.4090**, **Precision: 0.5230**, **Recall: 0.4127** |
| **ResNet-18 (Classification)** | Concrete Crack Binary Classification (40,000 images) | **Accuracy: 99.8%**, **F1-Score: 0.998**, **Loss: 0.008** |
| **Morphological Blackhat Mask** | Adaptive CLAHE + Blackhat Filter (512×512 tiles) | **Processing Latency: ~14ms/tile**, transparent RGBA alpha mask |
| **Tiled Inference Latency** | Full $4000 \times 3000$ (12 MP) Image | **< 1.8 seconds** (NVIDIA RTX GPU) / **< 4.2 seconds** (Modern 8-Core CPU) |

---

## Testing & Quality Assurance

Run the automated test suite across all modules:

```bash
# Run all backend and computer vision unit tests
python -m pytest tests/

# Run frontend semver comparison unit tests
cd desktop/frontend
npm run test:unit
```

Test coverage includes:
- Tiled inference and coordinate translation.
- Seam-merging Non-Maximum Suppression (NMS) box deduplication.
- CLAHE enhancement, Blackhat filtering, and crack skeletonization.
- FastAPI REST endpoint authentication, file validation, and error handling.
- Semver string comparison, update badges, and offline resilience.

---

## Troubleshooting

| Problem | Cause | Resolution |
|---|---|---|
| **Failed to connect (127.0.0.1:8000) on Android** | Phone connects to its own loopback instead of host PC | Open **Server Settings** modal in mobile app and enter host PC's Wi-Fi LAN IP (e.g. `http://192.168.1.X:8000`). |
| **Desktop .exe shows backend offline** | Python backend failed to launch or port 8000 is occupied | Verify port 8000 is free (`netstat -ano \| findstr 8000`). Launch via `CrackSense-Desktop.bat` to see Python console output. |
| **CUDA out of memory during tiled inference** | Image size exceeds GPU VRAM | The pipeline automatically downscales images $>12$ MP and enforces single-concurrency inference semaphore. |
| **Camera not opening on Android** | Missing camera hardware permission | Grant camera permission in Android Settings > Apps > CrackSense > Permissions. |
| **Supabase sync warnings in console** | Supabase credentials not set or bucket missing | Create bucket `cracksense-images` in Supabase Storage or inspect in local offline mode (SQLite). |

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/crack-analysis`).
3. Commit your changes (`git commit -m "Add crack analysis enhancement"`).
4. Push to the branch (`git push origin feature/crack-analysis`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License.

---

**CrackSense AI – Concrete Crack Detection System**  
*AI-powered visual analysis for concrete surface inspection.*
