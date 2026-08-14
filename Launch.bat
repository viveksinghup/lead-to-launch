@echo off
REM Lead -> Launch dashboard runner (Windows)
REM Double-click this file to start the dashboard.

cd /d "%~dp0app"

echo.
echo ========================================
echo   Lead - Launch : starting dashboard
echo ========================================
echo.

if not exist "node_modules" (
  echo First-time setup. Installing dependencies, takes 1-2 min...
  call npm install
  echo.
)

start "" "http://localhost:3000"

echo Starting server...
echo Open http://localhost:3000 if browser did not open.
echo.
echo To STOP: press Ctrl + C in this window, or close it.
echo.

call npm run dev
