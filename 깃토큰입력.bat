@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"
echo ==========================================
echo   Enter GitHub token (for auto-publish)
echo ==========================================
echo.
echo Paste your fine-grained token (starts with github_pat_ or ghp_) then Enter.
echo Needs "Contents: Read and write" on your site repo only.
echo (Paste = right-click)
echo.
set "KEY="
set /p "KEY=Token: "
if "%KEY%"=="" (
  echo [CANCEL] Nothing entered.
  pause
  exit /b
)
set PY=python
where python >nul 2>nul || set PY=py
%PY% envtool.py GITHUB_TOKEN "%KEY%"
echo.
pause
