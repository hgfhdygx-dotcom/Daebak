@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"
echo ==========================================
echo   foreign-qa : INSTALL  (run once)
echo ==========================================
echo.
echo Installing required parts. This can take 1-3 minutes...
echo.
set PY=python
where python >nul 2>nul || set PY=py
%PY% -m pip install -r requirements.txt
echo.
if errorlevel 1 (
  echo [FAILED] Python may not be installed.
  echo   Get it at https://www.python.org  and tick "Add Python to PATH".
) else (
  echo [DONE] Install complete. You can close this window.
)
echo.
pause
