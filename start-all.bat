@echo off
echo Starting BillSplit India Backend and Frontend...
start "BillSplit Backend (:3001)" cmd /k "cd /d "%~dp0backend" && pnpm run dev"
start "BillSplit Frontend (:5173)" cmd /k "cd /d "%~dp0frontend" && pnpm run dev"
echo Both servers started in separate terminal windows!
