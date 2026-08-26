@echo off
title Employee Monitoring - Backend Server
cd backend
echo Starting FastAPI Realtime Backend Server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
