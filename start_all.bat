@echo off
echo ========================================================
echo Launching THREATCAST AI Full-Stack Platform
echo ========================================================
start "ThreatCast AI Backend (FastAPI)" cmd /k "run_backend.bat"
start "ThreatCast AI Frontend (Vite React)" cmd /k "run_frontend.bat"
echo.
echo Both servers are starting!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
pause
