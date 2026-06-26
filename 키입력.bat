@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"
echo ==========================================
echo   Enter OpenAI API key
echo ==========================================
echo.
echo Paste your key (starts with sk-) then press Enter.
echo (Paste = right-click)
echo.
set "KEY="
set /p "KEY=Key: "
if "%KEY%"=="" (
  echo [CANCEL] Nothing entered.
  pause
  exit /b
)
set PY=python
where python >nul 2>nul || set PY=py
%PY% envtool.py OPENAI_API_KEY "%KEY%"
echo.
pause
