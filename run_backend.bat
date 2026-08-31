@echo off
echo ========================================================
echo Starting THREATCAST AI - FastAPI Backend (Port 8000)
echo ========================================================
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
