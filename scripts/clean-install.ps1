# Очистка node_modules и повторная установка (решает ENOTEMPTY/EPERM на Windows)
Set-Location $PSScriptRoot\..

Write-Host "Removing node_modules..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    if (Test-Path node_modules) {
        Write-Host "Trying with cmd rmdir..." -ForegroundColor Yellow
        cmd /c "rmdir /s /q node_modules"
    }
}

if (Test-Path package-lock.json) {
    Remove-Item package-lock.json -Force
}

Write-Host "Running npm install..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Done. Run: npx expo start" -ForegroundColor Green
} else {
    Write-Host "Install failed. Try running PowerShell as Administrator and run this script again." -ForegroundColor Red
}
