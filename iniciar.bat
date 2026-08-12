@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Reposteria Ecommerce - Servidor de dev
echo ==========================================

echo Cerrando procesos anteriores del servidor (si hay)...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' | Where-Object { $_.CommandLine -like '*Reposteria-Ecomerce*astro*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } " >nul 2>&1
timeout /t 1 /nobreak >nul

if not exist "node_modules" (
    echo Instalando dependencias, por favor espera...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando servidor de desarrollo...
call npm run dev

pause
