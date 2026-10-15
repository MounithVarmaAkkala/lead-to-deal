@echo off
echo ==========================================================
echo Starting Autonomous Lead-to-Deal Intelligence System
echo Design Theme: Zesiger.net Swiss Intelligence
echo ==========================================================

start "Lead-to-Deal Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "Lead-to-Deal Frontend (Vite)" cmd /k "cd frontend && npm run dev -- --port 5173"

echo Services started!
echo Backend API Docs: http://localhost:8000/docs
echo Frontend Web App: http://localhost:5173
