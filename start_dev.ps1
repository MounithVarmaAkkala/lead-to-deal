# PowerShell Start Script for Local Development
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting Autonomous Lead-to-Deal Intelligence System" -ForegroundColor Green
Write-Host "Design Theme: Zesiger.net Swiss Intelligence" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --port 8000"

# 2. Start Frontend in separate window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- --port 5173"

Write-Host "Services started!" -ForegroundColor Green
Write-Host "Backend API:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "Frontend UI:  http://localhost:5173" -ForegroundColor White
