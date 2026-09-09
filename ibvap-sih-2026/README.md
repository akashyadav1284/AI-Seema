# IBVAP — Intelligent Border Video Analytics Platform

## 1. Project Overview
IBVAP is an AI-powered software platform designed to upgrade existing CCTV cameras into an intelligent border surveillance and early-warning system. This repository contains the source code for the Smart India Hackathon 2026 entry.

## 2. Problem
Traditional border surveillance relies heavily on human monitoring of multiple video feeds, which is prone to fatigue and human error. There's a need for an automated system to detect intrusions, unusual movement, and other security events in real-time.

## 3. Solution
An intelligent platform that ingests video feeds and uses AI to perform real-time analytics such as person/vehicle detection, multi-object tracking, and virtual fence monitoring.

## 4. Phase 1 Scope
This repository currently contains **Phase 1** of the project. The goal of Phase 1 is to create a clean, scalable, secure, and runnable foundation. 

> **Note:** AI detection, YOLO, ByteTrack, ANPR, virtual fence logic, and other advanced analytics are intentionally deferred to later phases. The current APIs are placeholders designed to support future integration cleanly.

## 5. Architecture
- **Frontend**: React + Vite + Tailwind CSS
- **Phase 1 (Foundation):** FastAPI + React Command Centre, MongoDB schema, structured logging.
- **Phase 2 (Video Intelligence Engine):** YOLOv8n object detection, OpenCV frame processing, image quality metrics, CLI testing tools.

## 6. Technology Stack
- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Python, FastAPI, Uvicorn, Pydantic, Motor/PyMongo
- **Database**: MongoDB
- **Infrastructure**: Docker, Docker Compose

## 7. Project Structure
- `backend/`: FastAPI application, configuration, and API routes.
- `frontend/`: React application and UI components.
- `data/`: Storage for future evidence and video clips.
- `docs/`: Project documentation.
- `tests/`: Automated tests.

## 8. Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB (local or remote)
- Docker & Docker Compose (optional for local deployment)

## 9. Local Installation
Clone the repository and follow the instructions to set up the backend and frontend.

## 10. Environment Variables
Copy the `.env.example` files to `.env` in both `backend` and `frontend` directories and update the values.
- `backend/.env`
- `frontend/.env`

## 11. Running Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 12. Running Frontend
```bash
cd frontend
npm install
npm run dev
```

## 13. Running MongoDB
Ensure MongoDB is running locally on port 27017 or update the `MONGO_URI` in `backend/.env`.

## 14. Running with Docker
```bash
docker compose up --build -d
```

## 15. API Endpoints
- `GET /api/health`: Check backend and database health.
- `GET /api/cameras`: Placeholder for retrieving camera streams.
- `POST /api/cameras`: Placeholder for registering cameras.
- `GET /api/events`: Placeholder for retrieving security events.
- `GET /api/zones`: Placeholder for retrieving virtual zones.
- `POST /api/zones`: Placeholder for registering virtual zones.

## 16. Testing
```bash
cd backend
pytest
```

## 17. Security Notes
- Never hardcode secrets.
- `.env` files are ignored by git.
- MongoDB credentials are not exposed in logs or API responses.
- API inputs are validated using Pydantic.

## 18. Future Development Phases
- **Phase 2**: YOLO Object Detection & Tracking Integration
- **Phase 3**: Rule Engine & Virtual Fences
- **Phase 4**: ANPR & Advanced Analytics
- **Phase 5**: Real-time Streaming & Dashboard Updates
