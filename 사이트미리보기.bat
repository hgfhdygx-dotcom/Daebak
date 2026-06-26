@echo off
chcp 65001 >nul
cd /d "%~dp0\site"
echo ==========================================
echo   Preview the website on your PC
echo ==========================================
echo.
echo  Open in your browser:  http://localhost:3000
echo  To stop: just close this window.
echo.
call npm run dev
pause
