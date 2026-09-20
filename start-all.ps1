Write-Host "Starting BillSplit India Backend and Frontend..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$PSScriptRoot\backend`" && pnpm run dev"
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$PSScriptRoot\frontend`" && pnpm run dev"
Write-Host "Both servers started in separate terminal windows!" -ForegroundColor Green
