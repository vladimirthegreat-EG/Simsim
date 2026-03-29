@echo off
echo ========================================
echo   Business Simulation - DEMO MODE
echo ========================================
echo.
echo Starting demo server...
echo Demo will be available at: http://localhost:3000/demo
echo.
echo NOTE: This runs ONLY the UI demo with mock data.
echo No database or authentication required.
echo.
cd /d "%~dp0src"
npm run dev
