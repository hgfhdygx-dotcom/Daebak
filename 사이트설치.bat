@echo off
chcp 65001 >nul
cd /d "%~dp0\site"
echo ==========================================
echo   Install website parts (run once)
echo ==========================================
echo.
echo This needs Node.js (https://nodejs.org). Installing... 1-3 min.
echo.
call npm install
echo.
if errorlevel 1 (
  echo [FAILED] Is Node.js installed? Get it at https://nodejs.org
) else (
  echo [DONE] Website parts installed.
)
echo.
pause
