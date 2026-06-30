<div align="center">

# 🔍 PixelPeek

### *Image Forensics & Steganography Analysis Platform*

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

**PixelPeek** is a full-stack cybersecurity forensics tool for analyzing images at every layer — from surface-level EXIF metadata to hidden steganographic payloads. Upload images, extract metadata, plot GPS coordinates on an interactive map, detect hidden data, and map discovered threats to the MITRE ATT&CK framework — all from a single, premium dark-mode interface.

</div>

---

## ✨ Features

### 📸 EXIF Metadata Extraction
Upload images in **JPG, PNG, TIFF, or WEBP** format and instantly extract rich EXIF metadata — camera make & model, exposure settings, focal length, ISO, date taken, resolution, and more. All metadata is stored and searchable.

### 🗺️ Interactive GPS Mapping
GPS-tagged images are plotted on a **dark-themed interactive Google Map**. Click any image in the gallery to fly to its location marker. Visualize where your images were captured at a glance.

### 🕵️ Steganography Detection & Decryption
Go beyond the surface. PixelPeek runs **two-layer steganographic analysis** on every image:
- **EOF Trailing Data** — Detects data appended after the image's end-of-file marker
- **LSB (Least Significant Bit) Analysis** — Identifies hidden messages embedded in pixel data

Detected hidden content is automatically extracted and displayed for review.

### 🛡️ MITRE ATT&CK Framework Mapping
Threats and anomalies detected during analysis are automatically mapped to the **MITRE ATT&CK** knowledge base. Understand what techniques an adversary may have used — with tactic IDs, descriptions, and severity classifications — directly inside the app.

### 🔍 Search, Filter & Export
Powerful filtering by filename, camera make/model, date range, or GPS presence. Export your current filtered dataset as a **CSV spreadsheet** for offline analysis and reporting.

### 🎨 Premium Dark-Mode UI
A gorgeous **glassmorphic dark interface** built with high-fidelity Vanilla CSS. Smooth animations, responsive layouts, and a design that looks and feels like a professional forensics workstation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 🖥️ **Frontend** | React 18 · TypeScript · Vite · Vanilla CSS |
| ⚙️ **Backend** | FastAPI · Python · Pillow · SQLAlchemy |
| 🗄️ **Database** | SQLite |
| 🗺️ **Maps** | Google Maps JavaScript API |
| 🐳 **Deployment** | Docker Compose · Nginx |
| 🛡️ **Security** | MITRE ATT&CK · Steganography Analysis (EOF + LSB) |

---

## 🚀 Getting Started

You can run PixelPeek either with **Docker Compose** (recommended) or **locally** for development.

---

### 🐳 Option 1: Docker Compose (Recommended)

> **Prerequisites:** Docker & Docker Compose installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/PixelPeek.git
   cd PixelPeek
   ```

2. **Configure your environment variables (Crucial for Map rendering):**
   Copy the frontend environment variable template to `.env` and set your Google Maps API Key:
   ```bash
   cd frontend
   cp .env.example .env
   ```
   Open the newly created `frontend/.env` file and insert your API key:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   Navigate back to the project root:
   ```bash
   cd ..
   ```

3. **Start the containers:**
   ```bash
   docker-compose up --build
   ```
   *Note: This command copies the `frontend/.env` file inside the Docker build container to embed the API key directly into the compiled production bundle.*

4. **Open in your browser:**

   | Service | Port / URL | Description |
   |---|---|---|
   | 🖥️ **Frontend Workstation** | [http://localhost:8080](http://localhost:8080) | The primary PixelPeek dark-mode UI. |
   | 📄 **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger documentation for backend endpoints. |

---

### 💻 Option 2: Local Development

#### Prerequisites
- 🟢 **Node.js** v18+
- 🐍 **Python** v3.9+
- 🔑 **Google Maps API Key** ([get one here](https://console.cloud.google.com/apis/credentials))

---

#### ⚙️ Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv

   # Windows:
   .\venv\Scripts\activate

   # macOS / Linux:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   ✅ API running at → [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

#### 🖥️ Frontend Setup

1. Open a **new terminal** and navigate to the frontend:
   ```bash
   cd frontend
   ```

2. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your Google Maps API key:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the Vite dev server:
   ```bash
   npm run dev
   ```

   ✅ Frontend running at → [http://localhost:5173](http://localhost:5173)
   *Note: In local development mode, the frontend dev server runs on port `5173` and proxies backend `/api` requests to port `8000`. (If you are running through Docker, the frontend runs on port `8080`).*

---

## 📂 File Structure

```
PixelPeek/
├── 🐳 docker-compose.yml
├── 📖 README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py              # FastAPI application & endpoints
│       ├── database.py          # Database connection & engine
│       ├── models.py            # SQLAlchemy DB models
│       ├── schemas.py           # Pydantic validation schemas
│       ├── exif_utils.py        # EXIF & GPS extraction logic
│       ├── stego_utils.py       # 🕵️ Steganography detection (EOF + LSB)
│       └── attack_mapper.py     # 🛡️ MITRE ATT&CK threat mapping
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf               # Production Nginx reverse-proxy
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts           # Dev proxy server config
│   ├── index.html
│   ├── .env.example             # Environment variables template
│   ├── .env                     # Local env variables (git-ignored)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Main orchestrator component
│       ├── index.css            # Premium dark theme & glassmorphism
│       ├── types.ts             # TypeScript interfaces
│       ├── google-maps.d.ts     # Google Maps type declarations
│       └── components/
│           ├── UploadZone.tsx     # Drag-and-drop file uploader
│           ├── SearchFilters.tsx  # Query parameter controllers
│           ├── ImageGrid.tsx      # Image gallery display
│           ├── MetadataPanel.tsx  # EXIF metadata table
│           ├── MapView.tsx        # 🗺️ Interactive Google Map
│           ├── StegoPanel.tsx     # 🕵️ Steganography analysis panel
│           └── MitrePanel.tsx     # 🛡️ MITRE ATT&CK mapping panel
│
└── uploads/                      # Local uploaded images storage
```

---

## 📜 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload an image and extract EXIF metadata |
| `GET` | `/api/images` | List all images with metadata (supports filters) |
| `GET` | `/api/images/{image_id}` | Get metadata for a single image |
| `DELETE` | `/api/images/{image_id}` | Delete an image and its metadata |
| `GET` | `/api/images/{image_id}/stego/analyze` | Run steganography and MITRE ATT&CK analysis |
| `POST` | `/api/images/{image_id}/stego/decode` | Decrypt steganographic payload (LSB or EOF) |
| `GET` | `/api/camera-models` | List unique camera models in the database |
| `GET` | `/api/export` | Export filtered metadata as CSV |

> 📄 Full interactive docs available at `/docs` (Swagger UI) when the backend is running.

---

## 🔐 Environment Variables

| Variable | Location | Description |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | `frontend/.env` | Google Maps JavaScript API key for the interactive map |

> 💡 Copy `frontend/.env.example` → `frontend/.env` and fill in your key.

---

## 🔍 Troubleshooting & FAQ

### 1. The Google Map is blank or showing a "Page can't load Google Maps correctly" error.
*   **API Key missing at build-time**: If running through Docker, the `frontend/.env` file containing `VITE_GOOGLE_MAPS_API_KEY` must exist **before** you run `docker-compose up --build`. If you created it after running the command, rebuild the frontend container using:
    ```bash
    docker-compose up -d --build frontend
    ```
*   **Invalid Key**: Ensure the API key in your `frontend/.env` file is valid and has the **Maps JavaScript API** enabled in the Google Cloud Console.

### 2. Location recognition is showing `Latitude: N/A` for my uploaded images.
*   **Missing EXIF Tags**: The image might not contain GPS geotags (e.g. photos downloaded from social media/chat platforms have their EXIF metadata automatically stripped).
*   **No GPS lock**: If a photo is taken indoors or before the phone gets a GPS lock, the camera app writes `NaN` placeholders. PixelPeek's robust parser automatically identifies these and filters them out.
*   **To Test**: Drag and drop the generated `test_geotagged.jpg` file (found at the root of the workspace) to verify that the coordinate parser and map rendering are functioning correctly.

---

<div align="center">

**Built with 🖤 for cybersecurity forensics**

🔍 **PixelPeek** — *See what's hidden in every pixel.*

</div>
