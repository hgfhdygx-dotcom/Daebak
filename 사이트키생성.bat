@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"
echo ==========================================
echo   Generate IndexNow key (run once)
echo ==========================================
echo.
set PY=python
where python >nul 2>nul || set PY=py
%PY% -c "import indexnow; k=indexnow.ensure_key(); print('[DONE] IndexNow key ready:', k); print('Saved to .env (INDEXNOW_KEY) and site/public/'+k+'.txt')"
echo.
pause
