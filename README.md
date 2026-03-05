# HRMS Lite

A lightweight full-stack Human Resource Management System for a single admin to manage employees and track daily attendance.

## Live Links (Fill After Deployment)
- Live Application URL: `TBD`
- Hosted Backend API URL: `TBD`
- GitHub Repository: `TBD`

## Project Overview
HRMS Lite provides:
- Employee Management
  - Add employee (unique employee ID)
  - View all employees
  - Delete employee
- Attendance Management
  - Mark attendance by date and status (Present/Absent)
  - View attendance records

## Bonus Features Implemented
- Filter attendance by employee and date
- Total present days per employee
- Dashboard summary cards

## Tech Stack
- Frontend: React (Vite), plain CSS
- Backend: FastAPI, SQLAlchemy
- Database: SQLite (default; can switch via `DATABASE_URL`)
- Deployment targets:
  - Frontend: Vercel / Netlify
  - Backend: Render / Railway

## Repository Structure
```text
.
+-- backend
¦   +-- app
¦   ¦   +-- database.py
¦   ¦   +-- main.py
¦   ¦   +-- models.py
¦   ¦   +-- schemas.py
¦   +-- Dockerfile
¦   +-- requirements.txt
+-- frontend
    +-- src
    ¦   +-- components
    ¦   +-- api.js
    ¦   +-- App.jsx
    ¦   +-- main.jsx
    ¦   +-- styles.css
    +-- package.json
```

## Backend API Endpoints
- `GET /health`
- `POST /api/employees`
- `GET /api/employees`
- `DELETE /api/employees/{employee_id}`
- `POST /api/attendance`
- `GET /api/attendance?employee_id=<id>&date=<YYYY-MM-DD>`
- `GET /api/employees/{employee_id}/attendance`
- `GET /api/dashboard/summary`

## Validations and Error Handling
- Required field validation (422)
- Email format validation (422)
- Duplicate employee ID/email handling (409)
- Duplicate attendance entry for same employee/date (409)
- Not found resources (404)
- Meaningful error messages in API responses

## Run Locally
### 1) Backend
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional environment variables:
- `DATABASE_URL` (default: `sqlite:///./hrms.db`)
- `ALLOWED_ORIGINS` (comma-separated frontend URLs)

### 2) Frontend
```bash
cd frontend
npm install
# Windows PowerShell
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Deployment Guide
### Backend on Render
1. Create a new Web Service from this repository.
2. Set **Root Directory** to `backend`.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env var `ALLOWED_ORIGINS` with your frontend domain.

### Frontend on Netlify
1. Import repository in Netlify.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env var `VITE_API_URL` with your deployed backend URL.

## Assumptions and Limitations
- Single admin user only; authentication is intentionally omitted.
- SQLite is used for simplicity in local development.
- Pagination/search for large datasets is out of scope.

## Production Readiness Notes
- CORS is configurable via `ALLOWED_ORIGINS`.
- Backend includes a Dockerfile for container deployments.
- Frontend includes clear loading, empty, and error states.
