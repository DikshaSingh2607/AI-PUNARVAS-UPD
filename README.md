# AI-PUNARVAS 🌏

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)
[![PostGIS](https://img.shields.io/badge/PostGIS-15--3.3-336791.svg)](https://postgis.net)

> **AI-Punarvas** — *Punarvas* (पुनर्वास) means *rehabilitation* in Sanskrit. This platform harnesses AI, geospatial intelligence, and modern web technology to assist in disaster recovery, urban resettlement, and community rehabilitation planning across India.

AI-Punarvas is a full-stack, AI-assisted rehabilitation management system that integrates satellite imagery analysis, GIS mapping, and machine-learning models to help government agencies, NGOs, and urban planners identify affected zones, prioritise aid, and track recovery progress in real time. The system provides an intuitive web dashboard backed by a high-performance Python API and a spatially-aware PostgreSQL/PostGIS database.

---

## 📸 Screenshot

> *(Screenshot coming soon — run the app locally and navigate to [http://localhost](http://localhost))*

---

## ✅ Prerequisites

| Tool | Minimum Version |
|------|----------------|
| [Docker](https://docs.docker.com/get-docker/) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2.20+ |

No other local dependencies are needed — everything else runs inside containers.

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/ai-punarvas.git && cd ai-punarvas

# 2. Copy and configure environment variables
cp backend/.env.example backend/.env

# 3. Build and launch all services
docker compose up --build
```

The application will be available at **[http://localhost](http://localhost)**.

- **Frontend** → http://localhost
- **API** → http://localhost/api/
- **Swagger UI** → http://localhost/docs
- **ReDoc** → http://localhost/redoc

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 / Vite, TypeScript, Tailwind CSS, Leaflet.js |
| **Backend** | FastAPI, Python 3.11, SQLAlchemy 2, Alembic |
| **Database** | PostgreSQL 15 + PostGIS 3.3 |
| **AI / ML** | scikit-learn, PyTorch, GDAL, Rasterio |
| **Geospatial** | GeoAlchemy2, Shapely, Fiona |
| **Infra** | Docker, Docker Compose, Nginx |

---

## ✨ Features

- 🗺️ **Interactive GIS Map** — visualise affected zones, shelters, and resource depots on a live map
- 🤖 **AI Risk Scoring** — machine-learning model assigns rehabilitation priority scores to areas
- 📡 **Satellite Imagery Integration** — ingest and analyse GeoTIFF rasters for damage assessment
- 👥 **Beneficiary Management** — register, track, and manage displaced individuals and families
- 📊 **Real-time Dashboard** — live KPIs, charts, and progress indicators for recovery operations
- 🔐 **Role-based Access Control** — Admin, Field Officer, and Viewer roles with JWT auth
- 📤 **Bulk Data Import** — upload CSV / GeoJSON files for mass registration
- 📄 **Report Generation** — export PDF / Excel reports for stakeholders

---

## 🔑 Default Login Credentials

> ⚠️ Change these immediately in any non-local environment.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@punarvas.local` | `Admin@1234` |
| Field Officer | `officer@punarvas.local` | `Officer@1234` |

---

## 🏗 Architecture

```
                         ┌─────────────────────────────────┐
                         │           User / Browser         │
                         └────────────────┬────────────────┘
                                          │ HTTP :80
                         ┌────────────────▼────────────────┐
                         │          Nginx (Reverse Proxy)   │
                         │  /api/*  → backend:8000          │
                         │  /docs   → backend:8000          │
                         │  /*      → frontend:3000         │
                         └───────┬────────────┬────────────┘
                                 │            │
               ┌─────────────────▼──┐   ┌────▼──────────────────┐
               │   FastAPI Backend  │   │   React/Vite Frontend  │
               │   Python 3.11      │   │   Node 20 (Alpine)     │
               │   port 8000        │   │   port 3000            │
               └─────────┬──────────┘   └────────────────────────┘
                         │
               ┌─────────▼──────────┐
               │  PostgreSQL 15     │
               │  + PostGIS 3.3     │
               │  port 5432         │
               └────────────────────┘
```

---

## 📁 Project Structure

```
ai-punarvas/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, security, database
│   │   ├── gis/          # Geospatial utilities
│   │   ├── ml/           # Machine learning models & inference
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI app entry point
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
